"""add documentation batch results

Revision ID: 7dbd6d1ed346
Revises: 0a5541e93827
Create Date: 2026-10-03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7dbd6d1ed346"
down_revision: Union[str, Sequence[str], None] = "0a5541e93827"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "documentation_batches",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "batch_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "total_batches",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="completed",
        ),
        sa.Column(
            "files",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "changes",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "readme",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "job_id",
            "batch_id",
            name="uq_documentation_batch_job_batch",
        ),
    )

    op.create_index(
        "ix_documentation_batches_id",
        "documentation_batches",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_documentation_batches_job_id",
        "documentation_batches",
        ["job_id"],
        unique=False,
    )

    op.create_index(
        "ix_documentation_batches_project_id",
        "documentation_batches",
        ["project_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "ix_documentation_batches_project_id",
        table_name="documentation_batches",
    )

    op.drop_index(
        "ix_documentation_batches_job_id",
        table_name="documentation_batches",
    )

    op.drop_index(
        "ix_documentation_batches_id",
        table_name="documentation_batches",
    )

    op.drop_table("documentation_batches")
