"""add user profile fields

Revision ID: c5e931b72a01
Revises: 7dbd6d1ed346
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c5e931b72a01"
down_revision: Union[str, Sequence[str], None] = "7dbd6d1ed346"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Check if columns already exist (safe idempotent migration)
    op.execute(
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS location VARCHAR(100),
        ADD COLUMN IF NOT EXISTS website VARCHAR(255),
        ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
        """
    )


def downgrade() -> None:
    op.drop_column("users", "social_links")
    op.drop_column("users", "website")
    op.drop_column("users", "location")
    op.drop_column("users", "bio")
