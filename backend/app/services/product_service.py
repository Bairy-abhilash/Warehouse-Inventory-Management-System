"""Product business logic."""

import logging
from decimal import Decimal
from typing import List, Optional, Tuple

from fastapi import status
from sqlalchemy import func, select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppException
from app.models import Product, Category, Supplier, Inventory, PurchaseOrderItem
from app.schemas.product import ProductCreate, ProductUpdate
from app.services import audit_service
from app.services.pagination_service import paginate_query

logger = logging.getLogger(__name__)


def list_products(
    db: Session,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    size: int = 10,
) -> Tuple[List[Product], int, int]:
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.supplier),
    )
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if supplier_id is not None:
        query = query.where(Product.supplier_id == supplier_id)
    if search:
        like = f"%{search}%"
        query = query.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if active_only:
        query = query.where(Product.is_active.is_(True))
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)

    sort_columns = {
        "name": Product.name,
        "price": Product.price,
        "sku": Product.sku,
        "created_at": Product.created_at,
        "reorder_level": Product.reorder_level,
    }
    col = sort_columns.get(sort_by.lower(), Product.name)
    if order.lower() == "desc":
        query = query.order_by(col.desc())
    else:
        query = query.order_by(col.asc())

    return paginate_query(db, query, page=page, size=size)


def get_product(db: Session, product_id: int) -> Product:
    obj = db.get(Product, product_id)
    if not obj:
        raise AppException(
            message=f"Product {product_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
        )
    return obj


def _validate_references(db: Session, category_id: Optional[int], supplier_id: Optional[int]) -> None:
    if category_id is not None and not db.get(Category, category_id):
        raise AppException(
            message=f"Category {category_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
        )
    if supplier_id is not None and not db.get(Supplier, supplier_id):
        raise AppException(
            message=f"Supplier {supplier_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
        )


def create_product(db: Session, data: ProductCreate, user_id: Optional[int] = None) -> Product:
    _validate_references(db, data.category_id, data.supplier_id)

    existing = db.scalars(select(Product).where(Product.sku == data.sku)).first()
    if existing:
        raise AppException(
            message="A product with this SKU already exists",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )

    obj = Product(**data.model_dump())
    db.add(obj)
    try:
        db.flush()  # assigns obj.id without committing, so the audit row can reference it
        audit_service.log_action(
            db,
            user_id=user_id,
            action="CREATE",
            entity_type="product",
            entity_id=obj.id,
            details=f"Created product {data.name} (SKU: {data.sku})",
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # Log the real cause so it's visible in the server console.
        logger.exception("Database constraint violation while creating product")
        raise AppException(
            message=f"Could not create product due to a database constraint: {exc.orig}",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="bad_request",
        )
    db.refresh(obj)
    return obj


def update_product(
    db: Session, product_id: int, data: ProductUpdate, user_id: Optional[int] = None
) -> Product:
    obj = get_product(db, product_id)
    payload = data.model_dump(exclude_unset=True)

    _validate_references(db, payload.get("category_id"), payload.get("supplier_id"))

    if "sku" in payload:
        clash = db.scalars(
            select(Product).where(Product.sku == payload["sku"], Product.id != product_id)
        ).first()
        if clash:
            raise AppException(
                message="A product with this SKU already exists",
                status_code=status.HTTP_409_CONFLICT,
                code="conflict",
            )

    changed = [key for key, value in payload.items() if getattr(obj, key) != value]
    for key, value in payload.items():
        setattr(obj, key, value)

    if changed:
        audit_service.log_action(
            db,
            user_id=user_id,
            action="UPDATE",
            entity_type="product",
            entity_id=obj.id,
            details=f"Updated product {obj.name} (SKU: {obj.sku}): {', '.join(changed)}",
        )
    db.commit()
    db.refresh(obj)
    return obj


def delete_product(db: Session, product_id: int, user_id: Optional[int] = None) -> None:
    obj = get_product(db, product_id)

    # ── Business rule: a product with history cannot be hard-deleted ──
    # inventory.product_id and purchase_order_items.product_id are NOT NULL
    # foreign keys, so deleting the product would either orphan real stock /
    # order lines or fail at the database. Check first and explain clearly.
    stock_rows = db.scalar(
        select(func.count()).select_from(Inventory).where(Inventory.product_id == product_id)
    ) or 0
    po_lines = db.scalar(
        select(func.count()).select_from(PurchaseOrderItem).where(PurchaseOrderItem.product_id == product_id)
    ) or 0

    if stock_rows or po_lines:
        reasons = []
        if stock_rows:
            reasons.append(f"stock records in {stock_rows} warehouse{'s' if stock_rows != 1 else ''}")
        if po_lines:
            reasons.append(f"{po_lines} purchase order line{'s' if po_lines != 1 else ''}")
        raise AppException(
            message=(
                f"Cannot delete '{obj.name}' ({obj.sku}) because it has {' and '.join(reasons)}. "
                "Set the product to inactive instead, or remove its stock and purchase order history first."
            ),
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
            details={"inventory_rows": stock_rows, "purchase_order_lines": po_lines},
        )

    try:
        audit_service.log_action(
            db,
            user_id=user_id,
            action="DELETE",
            entity_type="product",
            entity_id=product_id,
            details=f"Deleted product {obj.name} (SKU: {obj.sku})",
        )
        db.delete(obj)
        db.commit()
    except IntegrityError:
        # Safety net for any reference we did not anticipate; never leak raw SQL to clients.
        db.rollback()
        logger.exception("Database constraint violation while deleting product %s", product_id)
        raise AppException(
            message=f"Cannot delete '{obj.name}' because other records still reference it.",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )
