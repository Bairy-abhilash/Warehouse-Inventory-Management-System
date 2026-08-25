"""Warehouse routes."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse, WarehouseUpdate
from app.services import warehouse_service

router = APIRouter(
    prefix="/warehouses",
    tags=["Warehouses"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[WarehouseResponse])
def list_warehouses(db: Session = Depends(get_db)):
    return warehouse_service.list_warehouses(db)


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    return warehouse_service.get_warehouse(db, warehouse_id)


@router.post(
    "/",
    response_model=WarehouseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def create_warehouse(payload: WarehouseCreate, db: Session = Depends(get_db)):
    return warehouse_service.create_warehouse(db, payload)


@router.put(
    "/{warehouse_id}",
    response_model=WarehouseResponse,
    dependencies=[Depends(require_roles("admin", "manager"))],
)
def update_warehouse(
    warehouse_id: int, payload: WarehouseUpdate, db: Session = Depends(get_db)
):
    return warehouse_service.update_warehouse(db, warehouse_id, payload)


@router.delete(
    "/{warehouse_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    warehouse_service.delete_warehouse(db, warehouse_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
