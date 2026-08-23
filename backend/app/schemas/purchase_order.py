"""Purchase order schemas."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


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


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    created_by: int = Field(..., description="ID of the user creating this order")
    status: str = Field(default="draft", max_length=30)
    total_amount: Optional[Decimal] = Field(default=None, ge=0)
    items: List[POItemCreate] = Field(..., min_length=1)


class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=30)
    total_amount: Optional[Decimal] = Field(None, ge=0)


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_id: int
    created_by: int
    order_date: Optional[datetime] = None
    status: str
    total_amount: Optional[Decimal] = None
    items: List[POItemResponse] = []
