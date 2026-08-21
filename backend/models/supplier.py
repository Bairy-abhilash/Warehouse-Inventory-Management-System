"""
Supplier Model
==============
Maps to the `suppliers` table.

Real schema:
    id         INTEGER      NOT NULL, primary key
    name       VARCHAR(150) NOT NULL
    email      VARCHAR(150) nullable
    phone      VARCHAR(30)  nullable
    address    TEXT         nullable
    created_at TIMESTAMP    nullable
    updated_at TIMESTAMP    nullable

One Supplier has many Purchase Orders.
(NOTE: your products table has NO supplier_id, so there is no direct
Product↔Supplier relationship in this schema.)
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship

from database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=True,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # One supplier → many purchase orders.
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

    def __repr__(self):
        return f"<Supplier id={self.id} name={self.name!r}>"
