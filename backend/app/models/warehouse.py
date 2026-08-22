"""Warehouse model."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.db.session import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)

    inventory = relationship("Inventory", back_populates="warehouse")

    def __repr__(self):
        return f"<Warehouse id={self.id} name={self.name!r}>"
