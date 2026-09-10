"""Audit logging business logic."""

from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.logging import logger
from app.models import AuditLog, User
from app.schemas.audit_log import AuditLogResponse
from app.services.pagination_service import paginate_query


def log_action(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    details: Optional[str] = None,
) -> AuditLog:
    """Record an immutable audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        action=action.upper(),
        entity_type=entity_type.lower(),
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    # We do NOT commit here so the log entry is committed atomically
    # alongside the primary business action transaction!
    logger.info("AuditLog: user %s performed %s on %s:%s", user_id, action, entity_type, entity_id)
    return entry


def list_audit_logs(
    db: Session,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    page: int = 1,
    size: int = 10,
) -> Tuple[List[AuditLogResponse], int, int]:
    """Fetch audit logs in reverse chronological order with pagination."""
    query = select(AuditLog).options(selectinload(AuditLog.user))
    
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type.lower())
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)

    query = query.order_by(AuditLog.id.desc())
    items_db, total, pages = paginate_query(db, query, page=page, size=size)

    items = [
        AuditLogResponse(
            id=r.id,
            user_id=r.user_id,
            username=r.user.username if r.user else None,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            details=r.details,
            created_at=r.created_at,
        )
        for r in items_db
    ]
    return items, total, pages
