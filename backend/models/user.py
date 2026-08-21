"""
User Model
==========
Maps to the `users` table.

Real schema:
    id            INTEGER      NOT NULL, primary key
    username      VARCHAR(100) NOT NULL
    email         VARCHAR(150) NOT NULL
    password_hash TEXT         NOT NULL   (bcrypt hash, never plain text)
    role_id       INTEGER      NOT NULL, FK → roles.id
    created_at    TIMESTAMP    nullable
    updated_at    TIMESTAMP    nullable

Relationships:
    role          → many-to-one (each user has one role)
    purchase_orders → one-to-many (a user can create many POs)
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    # Stored as Text because bcrypt hashes are long (~60 chars) and we
    # don't want a length limit to ever reject a valid hash.
    password_hash = Column(Text, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=True,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Many-to-one: each user belongs to one role.
    role = relationship("Role", back_populates="users")
    # One-to-many: a user can create many purchase orders.
    # back_populates matches `created_by_user` on PurchaseOrder.
    purchase_orders = relationship("PurchaseOrder", back_populates="created_by_user")

    def __repr__(self):
        return f"<User id={self.id} username={self.username!r}>"
