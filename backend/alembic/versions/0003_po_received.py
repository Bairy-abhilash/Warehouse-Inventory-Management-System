"""add received_quantity to purchase_order_items

Revision ID: 0003_po_received
Revises: 0002_product_catalog
Create Date: 2026-08-25 00:00:00

Tracks how many units of each line item have been received,
enabling partial deliveries and preventing over-receiving.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_po_received"
down_revision: Union[str, None] = "0002_product_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "purchase_order_items",
        sa.Column(
            "received_quantity",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("purchase_order_items", "received_quantity")
