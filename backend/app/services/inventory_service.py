"""Inventory business logic."""

import math
from typing import List, Optional, Tuple

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppException
from app.models import Inventory, Product, Warehouse
from app.schemas.inventory import InventoryListResponse, StockAdjustment


def list_inventory(
    db: Session,
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    low_stock_only: bool = False,
    page: int = 1,
    size: int = 10,
) -> Tuple[List[InventoryListResponse], int, int]:
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
    if product_id is not None:
        query = query.where(Inventory.product_id == product_id)
    if low_stock_only:
        query = query.where(Inventory.quantity <= Inventory.reorder_level)

    page = max(1, page)
    size = min(100, max(1, size))

    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0
    pages = math.ceil(total / size) if total > 0 else 0

    offset = (page - 1) * size
    rows = db.execute(query.order_by(Product.name).offset(offset).limit(size)).all()

    items = [
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
    return items, total, pages


def adjust_stock(
    db: Session,
    product_id: int,
    warehouse_id: int,
    adjustment: StockAdjustment,
) -> Inventory:
    if not db.get(Product, product_id):
        raise AppException(message=f"Product {product_id} not found", status_code=404, code="not_found")
    if not db.get(Warehouse, warehouse_id):
        raise AppException(message=f"Warehouse {warehouse_id} not found", status_code=404, code="not_found")

    inv = db.scalars(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.warehouse_id == warehouse_id,
        )
    ).first()

    if inv is None:
        if adjustment.quantity_change < 0:
            raise AppException(
                message="Cannot remove stock from an empty inventory record",
                status_code=status.HTTP_400_BAD_REQUEST,
                code="bad_request",
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
        raise AppException(
            message=f"Insufficient stock. Current: {inv.quantity}",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="bad_request",
        )
    inv.quantity = new_quantity
    db.commit()
    db.refresh(inv)
    return inv
