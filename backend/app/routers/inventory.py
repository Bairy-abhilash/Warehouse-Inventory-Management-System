"""Inventory routes.

Permission model:
  - any authenticated user can read stock levels
  - only admin/manager can adjust stock
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.schemas.inventory import InventoryListResponse, StockAdjustment
from app.schemas.pagination import PaginatedResponse
from app.services import inventory_service

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[InventoryListResponse])
def list_inventory(
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    low_stock_only: bool = False,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
):
    items, total, pages = inventory_service.list_inventory(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
        low_stock_only=low_stock_only,
        page=page,
        size=size,
    )
    return PaginatedResponse.create(items=items, total=total, page=page, size=size)


@router.post(
    "/adjust",
    dependencies=[Depends(require_roles("admin", "manager"))],
)
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
