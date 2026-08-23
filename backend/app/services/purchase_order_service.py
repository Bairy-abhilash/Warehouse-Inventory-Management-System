"""Purchase order business logic."""

from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import PurchaseOrder, PurchaseOrderItem, Supplier, Product
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate


def _calculate_total(items) -> Decimal:
    return sum(
        (item.unit_price * item.quantity for item in items),
        Decimal("0.00"),
    )


def list_purchase_orders(
    db: Session, status_filter: Optional[str] = None
) -> List[PurchaseOrder]:
    query = select(PurchaseOrder).options(selectinload(PurchaseOrder.items))
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
    return db.scalars(query.order_by(PurchaseOrder.id.desc())).all()


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrder:
    obj = db.scalars(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id)
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"Purchase order {po_id} not found")
    return obj


def create_purchase_order(db: Session, data: PurchaseOrderCreate) -> PurchaseOrder:
    if not db.get(Supplier, data.supplier_id):
        raise HTTPException(status_code=404, detail=f"Supplier {data.supplier_id} not found")

    # Validate products exist
    for item in data.items:
        if not db.get(Product, item.product_id):
            raise HTTPException(
                status_code=404, detail=f"Product {item.product_id} not found"
            )

    total = data.total_amount if data.total_amount is not None else _calculate_total(data.items)

    po = PurchaseOrder(
        supplier_id=data.supplier_id,
        created_by=data.created_by,
        status=data.status,
        total_amount=total,
    )
    db.add(po)
    db.flush()  # get po.id for items

    for item in data.items:
        db.add(
            PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
        )

    db.commit()
    db.refresh(po)
    return get_purchase_order(db, po.id)


def update_purchase_order(
    db: Session, po_id: int, data: PurchaseOrderUpdate
) -> PurchaseOrder:
    po = get_purchase_order(db, po_id)
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(po, key, value)
    db.commit()
    return get_purchase_order(db, po_id)


def delete_purchase_order(db: Session, po_id: int) -> None:
    po = get_purchase_order(db, po_id)
    if po.status not in ("draft", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft or cancelled purchase orders can be deleted",
        )
    db.delete(po)
    db.commit()
