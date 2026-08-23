"""
Database Session / Engine
=========================
Owns the SQLAlchemy engine, session factory, declarative Base, and the
FastAPI dependency that provides a database session per request.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from app.core.config import settings

# SQLite needs check_same_thread=False for FastAPI's threadpool.
# PostgreSQL does not use this argument.
_connect_args: dict = {}
if settings.DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    echo=False,  # set True to see every SQL statement
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

# All models inherit from this Base.
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency.

    Yields a session for the duration of one request and guarantees it is
    closed afterwards, even if the endpoint raises an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
