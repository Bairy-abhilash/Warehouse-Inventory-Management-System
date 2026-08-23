"""Warehouse schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    location: Optional[str] = Field(None, max_length=255)


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    location: Optional[str] = Field(None, max_length=255)


class WarehouseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: Optional[str] = None
    created_at: Optional[datetime] = None
