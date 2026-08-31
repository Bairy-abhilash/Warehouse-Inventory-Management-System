"""
Purchase order business logic.

Status workflow:

    draft ──> submitted ──> approved ──> received
                  │             │
                  └──> cancelled <──┘

Rules enforced:
  - Only draft POs can be edited/deleted
  - submitted can be approved or cancelled
  - approved can be received (partially or fully)
  - When all items are fully received, status becomes "received"
  - Receiving stock ADDS quantities to the inventory table
"""

from decimal import Decimal
from typing import List, Optional

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppException
from app.core.logging import logger
from app.models import (
    Inventory,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
    User,
    Warehouse,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    ReceiveItem,
    ReceiveRequest,
)

# Allowed status transitions: current_status -> set of next statuses
VALID_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"submitted", "cancelled"},
    "submitted": {"approved", "cancelled", "draft"},
    "approved": {"received", "cancelled"},
    "received": set(),       # terminal
    "cancelled": set(),      # terminal
}


def _calculate_total(items) -> Decimal:
    return sum((i.unit_price * i.quantity for i in items), Decimal("0.00"))


def list_purchase_orders(
    db: Session, status_filter: Optional[str] = None
) -> List[PurchaseOrder]:
    query = select(PurchaseOrder).options(selectinload(PurchaseOrder.items))
    if status_filter:
        if status_filter not in VALID_TRANSITIONS:
            raise AppException(message=f"Unknown status '{status_filter}'", status_code=400, code="bad_request")
        query = query.where(PurchaseOrder.status == status_filter)
    return db.scalars(query.order_by(PurchaseOrder.id.desc())).all()


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrder:
    po = db.scalars(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id)
    ).first()
    if not po:
        raise AppException(message=f"Purchase order {po_id} not found", status_code=404, code="not_found")
    return po


def create_purchase_order(
    db: Session, data: PurchaseOrderCreate, created_by: int
) -> PurchaseOrder:
    # Validate references
    if not db.get(Supplier, data.supplier_id):
        raise AppException(message=f"Supplier {data.supplier_id} not found", status_code=404, code="not_found")
    if not db.get(User, created_by):
        raise AppException(message=f"User {created_by} not found", status_code=404, code="not_found")

    # Validate all products exist
    for item in data.items:
        if not db.get(Product, item.product_id):
            raise AppException(
                message=f"Product {item.product_id} not found", status_code=404, code="not_found"
            )

    total = _calculate_total(data.items)

    po = PurchaseOrder(
        supplier_id=data.supplier_id,
        created_by=created_by,
        status="draft",
        total_amount=total,
    )
    db.add(po)
    db.flush()  # get po.id before adding items

    for item in data.items:
        db.add(
            PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                received_quantity=0,
            )
        )

    db.commit()
    logger.info("Created PO #%s for supplier %s, total %s", po.id, po.supplier_id, total)
    return get_purchase_order(db, po.id)


# Kept for backwards compatibility / alternate callers that pass a dict.
def create_purchase_order_dict(db: Session, data: dict) -> PurchaseOrder:
    from app.schemas.purchase_order import PurchaseOrderCreate as POCreate

    schema = POCreate(**{k: v for k, v in data.items() if k != "created_by"})
    return create_purchase_order(db, schema, created_by=data["created_by"])


def update_status(db: Session, po_id: int, new_status: str) -> PurchaseOrder:
    po = get_purchase_order(db, po_id)

    if new_status not in VALID_TRANSITIONS:
        raise AppException(message=f"Unknown status '{new_status}'", status_code=400, code="bad_request")

    allowed = VALID_TRANSITIONS.get(po.status, set())
    if new_status not in allowed:
        raise AppException(
            message=f"Cannot transition PO from '{po.status}' to '{new_status}'. Allowed next states: {sorted(allowed) or ['(none)']}",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )

    po.status = new_status
    db.commit()
    logger.info("PO #%s status -> %s", po.id, new_status)
    return get_purchase_order(db, po_id)


def _get_or_create_inventory(
    db: Session, product_id: int, warehouse_id: int
) -> Inventory:
    """Find the inventory row for a product/warehouse, or create one."""
    inv = db.scalars(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.warehouse_id == warehouse_id,
        )
    ).first()
    if inv is None:
        # Need a reorder level; use the product's reorder_level if set, else 10
        product = db.get(Product, product_id)
        reorder = getattr(product, "reorder_level", 10) or 10
        inv = Inventory(
            product_id=product_id,
            warehouse_id=warehouse_id,
            quantity=0,
            reorder_level=reorder,
        )
        db.add(inv)
        db.flush()
    return inv


def receive_purchase_order(
    db: Session,
    po_id: int,
    payload: ReceiveRequest,
    warehouse_id: int,
) -> PurchaseOrder:
    po = get_purchase_order(db, po_id)

    if po.status != "approved":
        raise AppException(
            message=f"Only approved POs can be received. Current status: '{po.status}'",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )

    if not db.get(Warehouse, warehouse_id):
        raise AppException(message=f"Warehouse {warehouse_id} not found", status_code=404, code="not_found")

    # Build a map of item_id -> POItem for quick lookup
    items_map = {item.id: item for item in po.items}

    for received in payload.items:
        item = items_map.get(received.item_id)
        if item is None:
            raise AppException(
                message=f"Item {received.item_id} does not belong to PO {po_id}",
                status_code=400,
                code="bad_request",
            )

        new_received = item.received_quantity + received.quantity
        if new_received > item.quantity:
            raise AppException(
                message=(
                    f"Cannot receive {received.quantity} of item {item.id}: "
                    f"ordered {item.quantity}, already received {item.received_quantity}, "
                    f"would exceed by {new_received - item.quantity}"
                ),
                status_code=status.HTTP_400_BAD_REQUEST,
                code="bad_request",
            )

        # Update inventory
        inv = _get_or_create_inventory(db, item.product_id, warehouse_id)
        inv.quantity += received.quantity
        item.received_quantity = new_received
        logger.info(
            "PO #%s: received %s of product %s into warehouse %s (now %s)",
            po.id, received.quantity, item.product_id, warehouse_id, inv.quantity,
        )

    # If every line is fully received, mark PO as received
    if all(item.is_fully_received for item in po.items):
        po.status = "received"
        logger.info("PO #%s fully received", po.id)

    db.commit()
    return get_purchase_order(db, po_id)


def delete_purchase_order(db: Session, po_id: int) -> None:
    po = get_purchase_order(db, po_id)
    if po.status != "draft":
        raise AppException(
            message="Only draft purchase orders can be deleted",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )
    db.delete(po)
    db.commit()
    logger.info("Deleted draft PO #%s", po_id)
