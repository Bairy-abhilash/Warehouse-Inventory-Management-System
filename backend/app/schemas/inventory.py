"""Inventory schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    warehouse_id: int
    quantity: int
    reorder_level: int
    updated_at: Optional[datetime] = None


class StockAdjustment(BaseModel):
    quantity_change: int = Field(
        ...,
        description="Positive to add stock, negative to remove",
    )
    reason: Optional[str] = Field(None, max_length=255)


class InventoryListResponse(BaseModel):
    """Flat inventory item with product and warehouse names."""

    id: int
    product_id: int
    warehouse_id: int
    quantity: int
    reorder_level: int
    product_name: str
    product_sku: str
    warehouse_name: str
    is_low_stock: bool = False
