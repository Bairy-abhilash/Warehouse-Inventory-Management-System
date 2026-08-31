"""Product business logic."""

import logging
from typing import List, Optional

from fastapi import status
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppException
from app.models import Product, Category, Supplier
from app.schemas.product import ProductCreate, ProductUpdate

logger = logging.getLogger(__name__)


def list_products(
    db: Session,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    limit: int = 100,
) -> List[Product]:
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
    return db.scalars(query.order_by(Product.name).limit(limit)).all()


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


def create_product(db: Session, data: ProductCreate) -> Product:
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


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
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

    for key, value in payload.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_product(db: Session, product_id: int) -> None:
    obj = get_product(db, product_id)
    try:
        db.delete(obj)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Database constraint violation while deleting product")
        raise AppException(
            message=f"Cannot delete product used by inventory or purchase orders: {exc.orig}",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )
