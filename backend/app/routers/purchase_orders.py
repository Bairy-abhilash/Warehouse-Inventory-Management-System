"""Purchase order routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import User
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    ReceiveRequest,
    StatusUpdate,
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
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # The creator is always the authenticated user — never trust a client-sent id.
    # Pydantic v2 models are immutable, so we build the service input as a dict.
    data = payload.model_dump()
    data["created_by"] = current_user.id
    return purchase_order_service.create_purchase_order_dict(db, data)


@router.patch(
    "/{po_id}/status",
    response_model=PurchaseOrderResponse,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def update_po_status(
    po_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
):
    return purchase_order_service.update_status(db, po_id, payload.status)


@router.post(
    "/{po_id}/receive",
    response_model=PurchaseOrderResponse,
    dependencies=[Depends(require_roles("admin", "manager", "staff"))],
)
def receive_po(
    po_id: int,
    payload: ReceiveRequest,
    warehouse_id: int = Query(..., description="Warehouse receiving the stock"),
    db: Session = Depends(get_db),
):
    return purchase_order_service.receive_purchase_order(
        db, po_id, payload, warehouse_id
    )


@router.delete(
    "/{po_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    purchase_order_service.delete_purchase_order(db, po_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
