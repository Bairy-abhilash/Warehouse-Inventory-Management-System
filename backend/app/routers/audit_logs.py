"""Audit log router."""

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.schemas.audit_log import AuditLogResponse
from app.services import audit_service

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
    dependencies=[Depends(get_current_user), Depends(require_roles("admin", "manager"))],
)


@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List system audit logs in reverse chronological order."""
    return audit_service.list_audit_logs(
        db, entity_type=entity_type, user_id=user_id, limit=limit
    )
