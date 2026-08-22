"""SQLAlchemy models.

Import every model here so SQLAlchemy's registry and Alembic can see all
tables and relationships.
"""

from app.models.role import Role
from app.models.user import User
from app.models.category import Category
from app.models.warehouse import Warehouse
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem

__all__ = [
    "Role",
    "User",
    "Category",
    "Warehouse",
    "Supplier",
    "Product",
    "Inventory",
    "PurchaseOrder",
    "PurchaseOrderItem",
]
