"""
Shared API dependencies.

These are FastAPI dependencies (used with Depends(...)) that authenticate
requests and enforce role-based authorization.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

# OAuth2PasswordBearer tells FastAPI to look for a token in the
# Authorization header:  Authorization: Bearer <token>
# The tokenUrl is only used by Swagger UI for the "Authorize" button.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the JWT, load the matching user from the database, and return it.

    This is the dependency used on every protected endpoint:
        @router.get("/products")
        def list_products(user: User = Depends(get_current_user)):
            ...
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exc

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exc

    # Eager-load role so user.role.name works without extra queries.
    user = db.scalars(
        select(User).options(selectinload(User.role)).where(User.id == int(user_id))
    ).first()

    if user is None:
        raise credentials_exc

    return user


def require_roles(*allowed: str):
    """
    Dependency factory: restrict an endpoint to users with one of the
    given role names (case-insensitive).

    Usage:
        @router.delete("/products/{id}",
                       dependencies=[Depends(require_roles("admin"))])
    """
    allowed_lower = {r.lower() for r in allowed}

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_name = current_user.role.name if (current_user and current_user.role) else ""
        if user_role_name.lower() not in allowed_lower:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role_name}' is not allowed to perform this action",
            )
        return current_user
    return _checker
