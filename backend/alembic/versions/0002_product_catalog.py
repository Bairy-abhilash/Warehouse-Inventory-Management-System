"""add product catalog columns

Revision ID: 0002_product_catalog
Revises: 0001_baseline
Create Date: 2026-08-20 00:00:00

Adds four columns to the products table:
  - supplier_id      nullable FK to suppliers.id
  - reorder_level    NOT NULL with server default 10
  - unit_of_measure  NOT NULL with server default 'pcs'
  - is_active        NOT NULL BOOLEAN with server default TRUE

The server_defaults are CRITICAL: the products table ALREADY HAS ROWS.
When you add a NOT NULL column, PostgreSQL needs a value for every
existing row. The server_default provides that value during the ALTER.
After all rows are backfilled, existing rows get the default.

For the nullable supplier_id, no default is needed (existing rows get NULL).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Revision identifiers form the linked list of migrations.
revision: str = "0002_product_catalog"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Add columns ──────────────────────────────────────
    # op.add_column emits: ALTER TABLE products ADD COLUMN ...
    op.add_column(
        "products",
        sa.Column("supplier_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("reorder_level", sa.Integer(), nullable=False, server_default="10"),
    )
    op.add_column(
        "products",
        sa.Column("unit_of_measure", sa.String(length=20), nullable=False, server_default="pcs"),
    )
    op.add_column(
        "products",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    # ── Add the foreign-key constraint ───────────────────
    # This tells PostgreSQL: products.supplier_id must reference
    # an existing suppliers.id. ON DELETE is left as NO ACTION
    # (you can't delete a supplier that has products).
    op.create_foreign_key(
        "fk_products_supplier_id",
        "products",
        "suppliers",
        ["supplier_id"],
        ["id"],
    )


def downgrade() -> None:
    # Reverse everything, in reverse order (drop FK first, then columns).
    op.drop_constraint("fk_products_supplier_id", "products", type_="foreignkey")
    op.drop_column("products", "is_active")
    op.drop_column("products", "unit_of_measure")
    op.drop_column("products", "reorder_level")
    op.drop_column("products", "supplier_id")
