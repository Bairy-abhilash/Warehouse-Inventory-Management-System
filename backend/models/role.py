"""
Role Model
==========
Maps to the `roles` table.

Real schema (from inspect_db.py):
    id          INTEGER     NOT NULL, primary key
    name        VARCHAR(50) NOT NULL        (admin / manager / staff)
    description TEXT       nullable

One Role has many Users (one-to-many). The foreign key lives on
the users table (role_id).
"""

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)

    # One role → many users. back_populates matches the `role`
    # relationship on the User model.
    users = relationship("User", back_populates="role")

    def __repr__(self):
        return f"<Role id={self.id} name={self.name!r}>"
