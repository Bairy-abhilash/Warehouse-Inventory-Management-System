"""
Models package
==============
Import every model here so:
  1. SQLAlchemy's Base.metadata registers all tables.
  2. string-based relationships (e.g. relationship("Product")) resolve,
     because importing this module loads every class.
  3. Callers can simply do:  from models import Product, Category, ...
"""

from models.role import Role
from models.user import User
from models.category import Category
from models.warehouse import Warehouse
from models.supplier import Supplier
from models.product import Product
from models.inventory import Inventory
from models.purchase_order import PurchaseOrder, PurchaseOrderItem

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
