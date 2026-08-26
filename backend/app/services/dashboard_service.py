"""Dashboard & reports business logic."""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Category,
    Inventory,
    Product,
    PurchaseOrder,
    Supplier,
    Warehouse,
)
from app.schemas.dashboard import (
    DashboardResponse,
    InventoryByWarehouse,
    LowStockItem,
    ReportResponse,
)


def get_dashboard(db: Session) -> DashboardResponse:
    total_products = db.scalar(select(func.count(Product.id))) or 0
    total_categories = db.scalar(select(func.count(Category.id))) or 0
    total_suppliers = db.scalar(select(func.count(Supplier.id))) or 0
    total_warehouses = db.scalar(select(func.count(Warehouse.id))) or 0

    # Total units and inventory value
    total_units = db.scalar(select(func.coalesce(func.sum(Inventory.quantity), 0))) or 0
    inventory_value = db.scalar(
        select(func.coalesce(func.sum(Inventory.quantity * Product.price), 0))
        .select_from(Inventory)
        .join(Product, Product.id == Inventory.product_id)
    ) or Decimal("0.00")

    # Low stock: quantity <= reorder_level
    low_stock = db.scalar(
        select(func.count())
        .select_from(Inventory)
        .where(Inventory.quantity <= Inventory.reorder_level)
    ) or 0

    # Pending POs: draft, submitted, approved (not yet received/cancelled)
    pending_pos = db.scalar(
        select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.status.in_(["draft", "submitted", "approved"])
        )
    ) or 0

    return DashboardResponse(
        total_products=total_products,
        total_categories=total_categories,
        total_suppliers=total_suppliers,
        total_warehouses=total_warehouses,
        total_inventory_units=total_units,
        inventory_value=inventory_value,
        low_stock_count=low_stock,
        pending_pos=pending_pos,
    )


def get_reports(db: Session) -> ReportResponse:
    # Low stock items joined with product and warehouse names
    rows = db.execute(
        select(
            Product.id,
            Product.sku,
            Product.name,
            Warehouse.name,
            Inventory.quantity,
            Inventory.reorder_level,
        )
        .select_from(Inventory)
        .join(Product, Product.id == Inventory.product_id)
        .join(Warehouse, Warehouse.id == Inventory.warehouse_id)
        .where(Inventory.quantity <= Inventory.reorder_level)
        .order_by(Product.name)
    ).all()

    low_stock = [
        LowStockItem(
            product_id=r[0],
            sku=r[1],
            product_name=r[2],
            warehouse=r[3],
            quantity=r[4],
            reorder_level=r[5],
        )
        for r in rows
    ]

    # Aggregate units and value per warehouse
    agg_rows = db.execute(
        select(
            Warehouse.id,
            Warehouse.name,
            func.coalesce(func.sum(Inventory.quantity), 0).label("units"),
            func.coalesce(
                func.sum(Inventory.quantity * Product.price), 0
            ).label("value"),
        )
        .select_from(Warehouse)
        .outerjoin(Inventory, Inventory.warehouse_id == Warehouse.id)
        .outerjoin(Product, Product.id == Inventory.product_id)
        .group_by(Warehouse.id, Warehouse.name)
        .order_by(Warehouse.name)
    ).all()

    by_warehouse = [
        InventoryByWarehouse(
            warehouse_id=r[0],
            warehouse=r[1],
            units=int(r[2] or 0),
            value=r[3] if r[3] is not None else Decimal("0.00"),
        )
        for r in agg_rows
    ]

    return ReportResponse(low_stock=low_stock, inventory_by_warehouse=by_warehouse)
