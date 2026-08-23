"""Supplier business logic."""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate


def list_suppliers(db: Session) -> List[Supplier]:
    return db.scalars(select(Supplier).order_by(Supplier.name)).all()


def get_supplier(db: Session, supplier_id: int) -> Supplier:
    obj = db.get(Supplier, supplier_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier {supplier_id} not found",
        )
    return obj


def create_supplier(db: Session, data: SupplierCreate) -> Supplier:
    obj = Supplier(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> Supplier:
    obj = get_supplier(db, supplier_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_supplier(db: Session, supplier_id: int) -> None:
    obj = get_supplier(db, supplier_id)
    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete supplier used by products or purchase orders",
        )
