"""Warehouse business logic."""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate


def list_warehouses(db: Session) -> List[Warehouse]:
    return db.scalars(select(Warehouse).order_by(Warehouse.name)).all()


def get_warehouse(db: Session, warehouse_id: int) -> Warehouse:
    obj = db.get(Warehouse, warehouse_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse {warehouse_id} not found",
        )
    return obj


def create_warehouse(db: Session, data: WarehouseCreate) -> Warehouse:
    obj = Warehouse(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_warehouse(db: Session, warehouse_id: int, data: WarehouseUpdate) -> Warehouse:
    obj = get_warehouse(db, warehouse_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_warehouse(db: Session, warehouse_id: int) -> None:
    obj = get_warehouse(db, warehouse_id)
    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete warehouse with inventory records",
        )
