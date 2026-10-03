"""add documentation runs

Revision ID: 0a5541e93827
Revises: 8c1176031e1f
Create Date: 2026-10-03 01:19:16.683812

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a5541e93827'
down_revision: Union[str, Sequence[str], None] = '8c1176031e1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "documentation_runs",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "docstrings_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "comments_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "readme_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "functions_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "classes_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "methods_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "modules_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
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
    )

    op.create_index(
        op.f("ix_documentation_runs_id"),
        "documentation_runs",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_documentation_runs_project_id"),
        "documentation_runs",
        ["project_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_documentation_runs_project_id"),
        table_name="documentation_runs",
    )

    op.drop_index(
        op.f("ix_documentation_runs_id"),
        table_name="documentation_runs",
    )

    op.drop_table("documentation_runs")
