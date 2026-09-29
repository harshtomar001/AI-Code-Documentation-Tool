"""add projects table

Revision ID: 8f31b7c2e4a1
Revises: 2b8d1f0a9c31
Create Date: 2026-09-29 23:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f31b7c2e4a1"
down_revision: Union[str, Sequence[str], None] = "2b8d1f0a9c31"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=20), nullable=False),
        sa.Column("github_owner", sa.String(length=255), nullable=True),
        sa.Column("github_repo", sa.String(length=255), nullable=True),
        sa.Column("github_url", sa.String(length=500), nullable=True),
        sa.Column("local_storage_path", sa.String(length=500), nullable=True),
        sa.Column("language", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("documentation_progress", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_projects_id"),
        "projects",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_projects_user_id"),
        "projects",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_user_id"), table_name="projects")
    op.drop_index(op.f("ix_projects_id"), table_name="projects")
    op.drop_table("projects")
