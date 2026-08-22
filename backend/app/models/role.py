"""Role model."""

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)

    users = relationship("User", back_populates="role")

    def __repr__(self):
        return f"<Role id={self.id} name={self.name!r}>"
