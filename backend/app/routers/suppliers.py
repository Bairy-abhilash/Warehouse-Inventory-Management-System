"""Supplier routes."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services import supplier_service

router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return supplier_service.list_suppliers(db)


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    return supplier_service.get_supplier(db, supplier_id)


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    return supplier_service.create_supplier(db, payload)


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db)
):
    return supplier_service.update_supplier(db, supplier_id, payload)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier_service.delete_supplier(db, supplier_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
