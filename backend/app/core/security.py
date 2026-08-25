"""
Security utilities: password hashing and JWT tokens.

This module contains NO FastAPI code on purpose — it is plain Python
logic that can be tested and reused independently of HTTP concerns.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ── Password hashing ──────────────────────────────────────────
def hash_password(plain: str) -> str:
    """
    Turn a plain-text password into a bcrypt hash.

    bcrypt handles salting automatically (each hash embeds its own random
    salt, so the same password produces a different hash each time).
    bcrypt also caps input at 72 bytes, so we truncate defensively.
    """
    pw_bytes = plain.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """
    Check a plain-text password against a stored hash.
    Returns True if they match, False otherwise.
    """
    pw_bytes = plain.encode("utf-8")[:72]
    hash_bytes = hashed.encode("utf-8")
    try:
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except (ValueError, TypeError):
        # Malformed hash — treat as a failed login rather than crashing.
        return False


# ── JWT tokens ────────────────────────────────────────────────
def create_access_token(subject: str | int, extra: Optional[dict[str, Any]] = None) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: usually the user id (stored in the standard "sub" claim).
        extra:   any additional claims (e.g. role, username).

    The token includes an expiry ("exp") based on settings.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(subject),   # subject: who the token belongs to
        "iat": now,           # issued at
        "exp": expire,        # expiry
    }
    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """
    Verify a JWT and return its payload, or None if invalid/expired.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
