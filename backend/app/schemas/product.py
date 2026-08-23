"""Product schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryResponse
from app.schemas.supplier import SupplierResponse


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    sku: str = Field(..., min_length=2, max_length=100)
    price: Decimal = Field(..., gt=0)
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    reorder_level: int = Field(default=10, ge=0)
    unit_of_measure: str = Field(default="pcs", max_length=20)
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, min_length=2, max_length=100)
    price: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    reorder_level: Optional[int] = Field(None, ge=0)
    unit_of_measure: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    sku: str
    price: Decimal
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    reorder_level: int
    unit_of_measure: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    category: Optional[CategoryResponse] = None
    supplier: Optional[SupplierResponse] = None
