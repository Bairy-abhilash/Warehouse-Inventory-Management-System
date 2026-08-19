"""
Models package
==============
Import every model here so that:
  1. SQLAlchemy's Base.metadata knows about all tables, and
  2. Other code can simply do:  from models import Category

(We will add Product to this file once we create it.)
"""

from models.category import Category

__all__ = ["Category"]
