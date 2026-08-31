"""Audit log model for tracking user actions and system events."""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False, index=True)        # e.g. CREATE, UPDATE, DELETE, RECEIVE_STOCK
    entity_type = Column(String(50), nullable=False, index=True)   # e.g. product, purchase_order, inventory
    entity_id = Column(Integer, nullable=True)                     # ID of affected record
    details = Column(Text, nullable=True)                          # Additional text or JSON description
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action!r} entity={self.entity_type!r}:{self.entity_id}>"
