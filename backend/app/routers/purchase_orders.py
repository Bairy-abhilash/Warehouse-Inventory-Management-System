"""Purchase order routes.

Permission model:
  - any authenticated user can view POs
  - admin/manager can create, update status, delete
  - admin/manager/staff can receive items (will be added when we build
    the receiving workflow)
"""

from typing import Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderUpdate,
)
from app.services import purchase_order_service

router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[PurchaseOrderResponse])
def list_purchase_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return purchase_order_service.list_purchase_orders(db, status_filter=status_filter)


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    return purchase_order_service.get_purchase_order(db, po_id)


@router.post(
    "/",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def create_purchase_order(payload: PurchaseOrderCreate, db: Session = Depends(get_db)):
    return purchase_order_service.create_purchase_order(db, payload)


@router.patch(
    "/{po_id}",
    response_model=PurchaseOrderResponse,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def update_purchase_order(
    po_id: int, payload: PurchaseOrderUpdate, db: Session = Depends(get_db)
):
    return purchase_order_service.update_purchase_order(db, po_id, payload)


@router.delete(
    "/{po_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    purchase_order_service.delete_purchase_order(db, po_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
