"""Audit log router."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.schemas.audit_log import AuditLogResponse
from app.schemas.pagination import PaginatedResponse
from app.services import audit_service

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
    dependencies=[Depends(get_current_user), Depends(require_roles("admin", "manager"))],
)


@router.get("/", response_model=PaginatedResponse[AuditLogResponse])
def list_audit_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
):
    """List system audit logs in reverse chronological order with pagination."""
    items, total, pages = audit_service.list_audit_logs(
        db, entity_type=entity_type, user_id=user_id, page=page, size=size
    )
    return PaginatedResponse.create(items=items, total=total, page=page, size=size)
