"""baseline: existing schema

Revision ID: 0001_baseline
Revises:
Create Date: 2026-08-20 00:00:00

This is the BASELINE migration. The 9 tables below ALREADY EXIST in the
PostgreSQL database (created before Alembic was introduced). We therefore
do NOT create them here — the upgrade() and downgrade() bodies are empty.

Running `alembic stamp head` marks the database as being at this revision
without running any SQL. From this point forward, every future schema
change gets its own real migration.

Why an empty baseline?
  If we let Alembic autogenerate the first migration, it would see our
  models and try to CREATE tables that already exist → errors. The
  baseline avoids that by saying "trust me, this schema already exists."
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Revision identifiers. Every migration has a unique `revision` id and
# points to the previous one via `down_revision`. This forms a linked
# list (the migration history / "chains").
revision: str = "0001_baseline"
down_revision: Union[str, None] = None  # first migration → no parent
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The existing schema is considered already applied.
    # No SQL runs here.
    pass


def downgrade() -> None:
    # Going backwards from baseline = nothing to undo.
    pass
    