"""
Purchase Order Models
=====================
Two closely related tables, kept in one file:

  PurchaseOrder       → the order header (supplier, who created it, status, total)
  PurchaseOrderItem   → individual line items (one per product on the order)

Real schema — purchase_orders:
    id           INTEGER        NOT NULL, primary key
    supplier_id  INTEGER        NOT NULL, FK → suppliers.id
    created_by   INTEGER        NOT NULL, FK → users.id
    order_date   TIMESTAMP      nullable
    status       VARCHAR(30)    NOT NULL   (draft/submitted/approved/received/cancelled)
    total_amount NUMERIC(12,2)  nullable

Real schema — purchase_order_items:
    id               INTEGER        NOT NULL, primary key
    purchase_order_id INTEGER       NOT NULL, FK → purchase_orders.id
    product_id       INTEGER        NOT NULL, FK → products.id
    quantity         INTEGER        NOT NULL
    unit_price       NUMERIC(12,2)  NOT NULL
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_date = Column(DateTime, nullable=True, default=datetime.utcnow)
    status = Column(String(30), nullable=False, default="draft")
    total_amount = Column(Numeric(12, 2), nullable=True)

    # Relationships
    supplier = relationship("Supplier", back_populates="purchase_orders")
    # The user who created this PO. `created_by` is the FK column;
    # `created_by_user` is the Python-side relationship name (they differ
    # because "created_by" is already taken by the column).
    created_by_user = relationship("User", back_populates="purchase_orders")
    # One PO has many line items. cascade="all, delete-orphan" means
    # deleting a PO also deletes its items (they can't exist without it).
    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<PurchaseOrder id={self.id} status={self.status!r}>"


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=False
    )
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="purchase_order_items")

    def __repr__(self):
        return (
            f"<POItem po={self.purchase_order_id} "
            f"product={self.product_id} qty={self.quantity}>"
        )
