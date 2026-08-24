"""Category routes."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services import category_service

# Every endpoint in this router requires a valid JWT, because we pass
# dependencies=[Depends(get_current_user)] to the APIRouter itself.
router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return category_service.list_categories(db)


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    return category_service.get_category(db, category_id)


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    return category_service.create_category(db, payload)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)
):
    return category_service.update_category(db, category_id, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category_service.delete_category(db, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
