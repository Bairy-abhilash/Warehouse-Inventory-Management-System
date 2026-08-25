"""Authentication-related Pydantic schemas."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    """Request body for POST /auth/register."""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    """Request body for POST /auth/login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User data returned to clients — NEVER includes password_hash."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role_id: int
    role_name: Optional[str] = None


class TokenResponse(BaseModel):
    """Returned after successful login/registration."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
