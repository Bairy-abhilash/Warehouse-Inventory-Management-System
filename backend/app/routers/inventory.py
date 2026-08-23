"""Inventory routes."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.inventory import InventoryListResponse, StockAdjustment
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/", response_model=list[InventoryListResponse])
def list_inventory(
    warehouse_id: Optional[int] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
):
    return inventory_service.list_inventory(
        db, warehouse_id=warehouse_id, low_stock_only=low_stock_only
    )


@router.post("/adjust")
def adjust_stock(
    product_id: int,
    warehouse_id: int,
    payload: StockAdjustment,
    db: Session = Depends(get_db),
):
    item = inventory_service.adjust_stock(db, product_id, warehouse_id, payload)
    return {
        "id": item.id,
        "product_id": item.product_id,
        "warehouse_id": item.warehouse_id,
        "quantity": item.quantity,
    }
