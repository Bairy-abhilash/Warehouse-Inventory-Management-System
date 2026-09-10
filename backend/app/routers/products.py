"""Product routes.

Permission model:
  - any authenticated user can read
  - admin/manager can create/update
  - only admin can delete
"""

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.schemas.pagination import PaginatedResponse
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services import product_service

router = APIRouter(
    prefix="/products",
    tags=["Products"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[ProductResponse])
def list_products(
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    sort_by: str = Query("name", description="Field to sort by: name, price, sku, created_at, reorder_level"),
    order: str = Query("asc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
):
    items, total, pages = product_service.list_products(
        db,
        category_id=category_id,
        supplier_id=supplier_id,
        search=search,
        active_only=active_only,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        order=order,
        page=page,
        size=size,
    )
    return PaginatedResponse.create(items=items, total=total, page=page, size=size)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return product_service.get_product(db, product_id)


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create_product(db, payload)


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def update_product(
    product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)
):
    return product_service.update_product(db, product_id, payload)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product_service.delete_product(db, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
