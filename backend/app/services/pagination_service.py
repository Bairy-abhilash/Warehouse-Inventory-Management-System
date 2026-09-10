"""Pagination and sorting service helper for SQLAlchemy."""

import math
from typing import Any, List, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def paginate_query(
    db: Session,
    query: Any,
    page: int = 1,
    size: int = 10,
) -> Tuple[List[Any], int, int]:
    """
    Executes a paginated query and returns (items, total_count, total_pages).
    """
    page = max(1, page)
    size = min(100, max(1, size))

    # Count total matching rows
    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0

    pages = math.ceil(total / size) if total > 0 else 0
    offset = (page - 1) * size

    items = db.scalars(query.offset(offset).limit(size)).all()
    return list(items), total, pages
