"""Purchase order schemas."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Items ────────────────────────────────────────────────────────
class POItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)


class POItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    received_quantity: int = 0


# ── Purchase Order ───────────────────────────────────────────────
class PurchaseOrderCreate(BaseModel):
    # created_by is NOT accepted from the client — the router sets it from
    # the authenticated user's token, so clients can't impersonate.
    supplier_id: int
    items: List[POItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_id: int
    created_by: int
    order_date: Optional[datetime] = None
    status: str
    total_amount: Optional[Decimal] = None
    items: List[POItemResponse] = []


# ── Workflow ─────────────────────────────────────────────────────
class StatusUpdate(BaseModel):
    """Body for PATCH /purchase-orders/{id}/status."""
    status: str = Field(..., description="New status: submitted, approved, cancelled")


# ── Receiving ────────────────────────────────────────────────────
class ReceiveItem(BaseModel):
    item_id: int
    quantity: int = Field(..., gt=0)


class ReceiveRequest(BaseModel):
    """Body for POST /purchase-orders/{id}/receive."""
    items: List[ReceiveItem] = Field(..., min_length=1)
