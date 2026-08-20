"""
Product Model
=============

Maps to the EXISTING `products` table in PostgreSQL.

The real table structure (from inspect_db.py) is:

    id          INTEGER        PRIMARY KEY, NOT NULL
    name        VARCHAR(150)   NOT NULL
    description TEXT           nullable
    sku         VARCHAR(100)   NOT NULL
    price       NUMERIC(12,2)  NOT NULL        ← money type, NOT float
    category_id INTEGER        nullable, FK → categories.id
    created_at  TIMESTAMP      nullable
    updated_at  TIMESTAMP      nullable

Key differences from our earlier learning model:
  - price is NUMERIC, not Float. Numeric stores exact decimal values,
    which is essential for money (Float has rounding errors).
  - category_id is NULLABLE — a product can exist without a category.
  - There is NO supplier_id, is_active, or reorder_level in this table.
    We only model columns that actually exist.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=False, index=True)

    # Numeric(12, 2) = up to 12 digits total, 2 after the decimal point.
    # In Python this comes back as a Decimal. We use Numeric (not Float)
    # because Float cannot represent all decimal amounts exactly
    # (e.g. 0.1 + 0.2 != 0.3 in floating point).
    price = Column(Numeric(12, 2), nullable=False)

    # ForeignKey to categories.id. nullable=True because a product may not
    # be assigned to a category yet. The database enforces that IF a value
    # is present, it must match an existing category id.
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)
    # onupdate=datetime.utcnow tells SQLAlchemy to refresh this timestamp
    # whenever the row is UPDATEd (we don't set it manually).
    updated_at = Column(DateTime, nullable=True, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship: the "one" side. Lets us write product.category to get
    # the related Category object without writing a JOIN. back_populates
    # matches the name on the Category model.
    category = relationship("Category", back_populates="products")

    # One product can appear on many inventory rows (one per warehouse)
    # and on many purchase-order line items over time.
    inventory = relationship("Inventory", back_populates="product")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product id={self.id} sku={self.sku!r} name={self.name!r}>"
