"""
Pytest configuration and shared fixtures.

This module sets up an in-memory SQLite database for testing,
seeds default roles, overrides the FastAPI `get_db` dependency,
and provides authenticated TestClient fixtures.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # Register all ORM models
from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db
from app.main import app
from app.models import Role, User


# ── In-Memory Test Engine ─────────────────────────────────────────
# StaticPool ensures the in-memory SQLite database persists across threads
# during a single test session.
TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(autouse=True)
def setup_test_db():
    """
    Runs before EVERY test.
    Creates all tables in SQLite, seeds default roles,
    and drops all tables after the test finishes.
    """
    Base.metadata.create_all(bind=engine)
    
    # Seed default roles required for registration and RBAC
    db = TestingSessionLocal()
    try:
        roles = [
            Role(id=1, name="admin", description="Full system access"),
            Role(id=2, name="manager", description="Inventory manager"),
            Role(id=3, name="staff", description="Warehouse staff"),
        ]
        db.add_all(roles)
        db.commit()
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Provides a raw SQLAlchemy session for test setup or assertion checks."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """
    FastAPI TestClient with overridden get_db dependency.
    All HTTP calls will interact with the in-memory SQLite database.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ── Helper Fixtures for Authenticated Users ───────────────────────

@pytest.fixture
def admin_headers(db_session):
    """Creates an Admin user and returns Authorization Bearer header."""
    user = User(
        username="admin_test",
        email="admin_test@inventory.com",
        password_hash=hash_password("admin123"),
        role_id=1,  # admin
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user.id, {"role": "admin"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def staff_headers(db_session):
    """Creates a Staff user and returns Authorization Bearer header."""
    user = User(
        username="staff_test",
        email="staff_test@inventory.com",
        password_hash=hash_password("staff123"),
        role_id=3,  # staff
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user.id, {"role": "staff"})
    return {"Authorization": f"Bearer {token}"}
