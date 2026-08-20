"""
Inventory Model
===============
Maps to the `inventory` table — the junction table between products
and warehouses that also stores quantity and reorder_level.

Real schema:
    id            INTEGER   NOT NULL, primary key
    product_id    INTEGER   NOT NULL, FK → products.id
    warehouse_id  INTEGER   NOT NULL, FK → warehouses.id
    quantity      INTEGER   NOT NULL
    reorder_level INTEGER   NOT NULL
    updated_at    TIMESTAMP nullable

Many-to-many resolution:
    Product 1 ──< Inventory >── 1 Warehouse
A product appears once per warehouse (with its quantity there).
"""

from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reorder_level = Column(Integer, nullable=False)
    updated_at = Column(
        DateTime,
        nullable=True,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships: each inventory row points to one product and one warehouse.
    product = relationship("Product", back_populates="inventory")
    warehouse = relationship("Warehouse", back_populates="inventory")

    def __repr__(self):
        return (
            f"<Inventory product={self.product_id} "
            f"warehouse={self.warehouse_id} qty={self.quantity}>"
        )
