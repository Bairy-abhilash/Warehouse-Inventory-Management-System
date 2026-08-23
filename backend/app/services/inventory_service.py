"""Inventory business logic."""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Inventory, Product, Warehouse
from app.schemas.inventory import InventoryListResponse, StockAdjustment


def list_inventory(
    db: Session, warehouse_id: int | None = None, low_stock_only: bool = False
) -> List[InventoryListResponse]:
    query = (
        select(
            Inventory.id,
            Inventory.product_id,
            Inventory.warehouse_id,
            Inventory.quantity,
            Inventory.reorder_level,
            Product.name.label("product_name"),
            Product.sku.label("product_sku"),
            Warehouse.name.label("warehouse_name"),
        )
        .join(Product, Product.id == Inventory.product_id)
        .join(Warehouse, Warehouse.id == Inventory.warehouse_id)
    )
    if warehouse_id is not None:
        query = query.where(Inventory.warehouse_id == warehouse_id)
    if low_stock_only:
        query = query.where(Inventory.quantity <= Inventory.reorder_level)

    rows = db.execute(query.order_by(Product.name)).all()
    return [
        InventoryListResponse(
            id=r.id,
            product_id=r.product_id,
            warehouse_id=r.warehouse_id,
            quantity=r.quantity,
            reorder_level=r.reorder_level,
            product_name=r.product_name,
            product_sku=r.product_sku,
            warehouse_name=r.warehouse_name,
            is_low_stock=r.quantity <= r.reorder_level,
        )
        for r in rows
    ]


def adjust_stock(
    db: Session,
    product_id: int,
    warehouse_id: int,
    adjustment: StockAdjustment,
) -> Inventory:
    if not db.get(Product, product_id):
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    if not db.get(Warehouse, warehouse_id):
        raise HTTPException(status_code=404, detail=f"Warehouse {warehouse_id} not found")

    inv = db.scalars(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.warehouse_id == warehouse_id,
        )
    ).first()

    if inv is None:
        if adjustment.quantity_change < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove stock from an empty inventory record",
            )
        inv = Inventory(
            product_id=product_id,
            warehouse_id=warehouse_id,
            quantity=0,
            reorder_level=10,
        )
        db.add(inv)

    new_quantity = inv.quantity + adjustment.quantity_change
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Current: {inv.quantity}",
        )
    inv.quantity = new_quantity
    db.commit()
    db.refresh(inv)
    return inv
