"""
Category Model
==============

Maps to the EXISTING `categories` table in PostgreSQL.

The real table structure (from inspect_db.py) is:

    id           INTEGER      PRIMARY KEY, NOT NULL
    name         VARCHAR(100) NOT NULL
    description  TEXT         nullable
    created_at   TIMESTAMP    nullable

There is NO updated_at column — so we must not declare one, or
SQLAlchemy will generate SELECT statements referencing a column that
doesn't exist (this caused the UndefinedColumn error).

We set a Python-side default on created_at so that NEW rows inserted
through our app get a timestamp (the database column itself is nullable
and has no server default, so without our default it would be NULL).
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship

from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # default=datetime.utcnow means: when we create a Category object in
    # Python without setting created_at, SQLAlchemy fills it with the
    # current time BEFORE sending the INSERT.
    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)

    # Relationship: one category has many products.
    # back_populates="category" matches the relationship on Product.
    products = relationship("Product", back_populates="category")

    def __repr__(self):
        return f"<Category id={self.id} name={self.name!r}>"
