"""Purchase order models."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_date = Column(DateTime, nullable=True, default=datetime.utcnow)
    status = Column(String(30), nullable=False, default="draft")
    total_amount = Column(Numeric(12, 2), nullable=True)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    created_by_user = relationship("User", back_populates="purchase_orders")
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
    # How many units have been received so far. Enables partial deliveries.
    received_quantity = Column(Integer, nullable=False, default=0, server_default="0")

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="purchase_order_items")

    @property
    def is_fully_received(self) -> bool:
        return self.received_quantity >= self.quantity

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    def __repr__(self):
        return (
            f"<POItem po={self.purchase_order_id} "
            f"product={self.product_id} qty={self.quantity} "
            f"received={self.received_quantity}>"
        )
