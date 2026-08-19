"""
Models package
==============
Import every model here so that:
  1. SQLAlchemy's Base.metadata knows about all tables, and
  2. Relationships referenced by string name (e.g. relationship("Product"))
     can be resolved, because importing this module loads the Product class.
  3. Other code can do:  from models import Category, Product
"""

from models.category import Category
from models.product import Product

__all__ = ["Category", "Product"]
