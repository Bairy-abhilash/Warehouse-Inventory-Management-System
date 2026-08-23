"""Category business logic."""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session) -> List[Category]:
    return db.scalars(
        select(Category).options(selectinload(Category.products)).order_by(Category.name)
    ).all()


def get_category(db: Session, category_id: int) -> Category:
    obj = db.get(Category, category_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category {category_id} not found",
        )
    return obj


def create_category(db: Session, data: CategoryCreate) -> Category:
    existing = db.scalars(
        select(Category).where(Category.name == data.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category name already exists",
        )
    obj = Category(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    obj = get_category(db, category_id)
    payload = data.model_dump(exclude_unset=True)
    if "name" in payload:
        clash = db.scalars(
            select(Category).where(Category.name == payload["name"], Category.id != category_id)
        ).first()
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists",
            )
    for key, value in payload.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_category(db: Session, category_id: int) -> None:
    obj = get_category(db, category_id)
    if obj.products:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete category with products assigned",
        )
    db.delete(obj)
    db.commit()
