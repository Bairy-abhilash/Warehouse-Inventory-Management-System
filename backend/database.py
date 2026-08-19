"""
Database Setup
==============

This file is the SINGLE place in the app that knows how to connect to
PostgreSQL. Everything else (models, endpoints) imports from here.

It defines:
  - engine:       the connection pool to PostgreSQL (one per application)
  - SessionLocal: a factory that creates a new database session
  - Base:         the parent class all models inherit from
  - get_db():     a FastAPI dependency that yields a session per request
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL etc. from the .env file into os.environ
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# ── The engine ──────────────────────────────────────────
# The engine maintains a pool of network connections to PostgreSQL.
# Creating an engine is expensive (it sets up the pool), so we do it
# exactly ONCE at startup and reuse it everywhere.
#
# echo=False keeps the console clean. Set echo=True to see every SQL
# statement SQLAlchemy runs (handy while learning/debugging).
engine = create_engine(DATABASE_URL, echo=False, future=True)

# ── The session factory ─────────────────────────────────
# SessionLocal is NOT itself a session. It's a function that MAKES sessions.
# We call SessionLocal() to get a fresh session for each request.
#
# autocommit=False: nothing is saved until we explicitly call db.commit()
# autoflush=False:  changes aren't auto-sent to the DB mid-transaction;
#                  we control when SQL runs via commit/query.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── The declarative base ────────────────────────────────
# All model classes inherit from Base. It collects metadata about every
# table (the "registry") so SQLAlchemy knows how to map them.
Base = declarative_base()


# ── FastAPI dependency ──────────────────────────────────
def get_db():
    """
    Give each request its own database session, and ALWAYS close it.

    The `yield` pattern works like this:
      1. Code BEFORE yield runs when the request starts (open session)
      2. The yielded value is injected into the endpoint as `db`
      3. Code AFTER yield runs when the request finishes — even if the
         endpoint raised an exception — guaranteeing the session closes.

    This is why endpoints declare:  db: Session = Depends(get_db)
    They never open or close connections themselves.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
