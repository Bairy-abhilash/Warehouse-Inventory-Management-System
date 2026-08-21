"""
Alembic Environment
===================

This file is the bridge between Alembic and our application.
Alembic imports and runs it every time you run a migration command.

It is responsible for:
  1. Loading our .env (so DATABASE_URL is available)
  2. Pointing Alembic at our SQLAlchemy metadata (all our models)
  3. Connecting to the database
  4. Running migrations either "online" (against the real DB) or
     "offline" (generating a SQL script)

The most important line is:
    target_metadata = Base.metadata
This is what makes `alembic revision --autogenerate` work — Alembic
compares our models against the actual database and generates the
CREATE/ALTER statements to make them match.
"""

import os
import sys
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Make our app importable ────────────────────────────────
# alembic/ is a subfolder, so add the backend/ folder to Python's path.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load variables from .env into os.environ
load_dotenv()

# This is the Alembic Config object (reads alembic.ini)
config = context.config

# Override the URL from .env (so the password stays out of alembic.ini)
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Set up Python logging from the config file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import our models so Base.metadata knows about every table ──
# Importing the models package triggers all model class definitions,
# which registers every table on Base.metadata.
from database import Base  # noqa: E402
import models  # noqa: F401, E402

# This is the metadata Alembic compares against the live database.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    'Offline' mode: generate a SQL script WITHOUT connecting to the DB.
    Useful for reviewing changes or handing SQL to a DBA.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    'Online' mode: connect to the database and apply migrations directly.
    This is the mode we use in development.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # detect column TYPE changes too, not just names
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
