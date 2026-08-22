"""Product model."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Added by migration 0002_product_catalog
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    reorder_level = Column(Integer, nullable=False, default=10, server_default="10")
    unit_of_measure = Column(
        String(20), nullable=False, default="pcs", server_default="pcs"
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=True,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    inventory = relationship("Inventory", back_populates="product")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product id={self.id} sku={self.sku!r} name={self.name!r}>"
