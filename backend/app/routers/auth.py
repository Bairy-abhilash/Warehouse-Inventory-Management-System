"""
Authentication routes: register, login, and current-user profile.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.errors import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Role, User
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_id=user.role_id,
        role_name=user.role.name if user.role else None,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user. New users get the default "staff" role (id 3).
    Returns an access token so registration logs you in immediately.
    """
    # Email must be unique
    existing = db.scalars(select(User).where(User.email == payload.email)).first()
    if existing:
        raise AppException(
            message="Email is already registered",
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
        )

    # Find default role ("staff" or "employee", or fallback to role_id=3)
    default_role = db.scalars(
        select(Role).where(
            or_(Role.name.ilike("staff"), Role.name.ilike("employee"))
        )
    ).first()
    if not default_role:
        default_role = db.get(Role, 3)

    if not default_role:
        raise AppException(
            message="Default user role not found in database",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="internal_error",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role_id=default_role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(user, attribute_names=["role"])

    token = create_access_token(user.id, {"role": user.role.name})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Verify email + password and return a JWT access token.
    We return the same generic error for unknown email or wrong password
    (so attackers can't enumerate which emails exist).
    """
    user = db.scalars(
        select(User).options(selectinload(User.role)).where(User.email == payload.email)
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise AppException(
            message="Incorrect email or password",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="unauthorized",
        )

    token = create_access_token(user.id, {"role": user.role.name})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the profile of the user who owns the supplied token."""
    return _user_to_response(current_user)
