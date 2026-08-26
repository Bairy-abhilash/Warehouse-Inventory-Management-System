"""Dashboard & report response schemas."""

from decimal import Decimal
from typing import List

from pydantic import BaseModel


class StatCard(BaseModel):
    label: str
    value: int | float | Decimal | str


class DashboardResponse(BaseModel):
    total_products: int
    total_categories: int
    total_suppliers: int
    total_warehouses: int
    total_inventory_units: int
    inventory_value: Decimal
    low_stock_count: int
    pending_pos: int


class LowStockItem(BaseModel):
    product_id: int
    sku: str
    product_name: str
    warehouse: str
    quantity: int
    reorder_level: int


class InventoryByWarehouse(BaseModel):
    warehouse_id: int
    warehouse: str
    units: int
    value: Decimal


class ReportResponse(BaseModel):
    low_stock: List[LowStockItem]
    inventory_by_warehouse: List[InventoryByWarehouse]
