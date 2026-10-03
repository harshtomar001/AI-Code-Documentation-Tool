"""change project id to uuid

Revision ID: 8c1176031e1f
Revises: 8f31b7c2e4a1
Create Date: 2026-10-01 23:49:11.879752

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8c1176031e1f"
down_revision: Union[str, Sequence[str], None] = "8f31b7c2e4a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change projects.id from INTEGER to UUID while preserving existing rows."""

    # 1. Add a temporary UUID column.
    op.add_column(
        "projects",
        sa.Column(
            "new_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    # 2. Generate a UUID for every existing project.
    op.execute(
        sa.text(
            "UPDATE projects "
            "SET new_id = gen_random_uuid() "
            "WHERE new_id IS NULL"
        )
    )

    # 3. Make the temporary UUID column non-nullable.
    op.alter_column(
        "projects",
        "new_id",
        nullable=False,
    )

    # 4. Remove the existing integer primary-key constraint.
    op.drop_constraint(
        "projects_pkey",
        "projects",
        type_="primary",
    )

    # 5. Remove the old integer ID column.
    op.drop_column(
        "projects",
        "id",
    )

    # 6. Rename the UUID column to id.
    op.alter_column(
        "projects",
        "new_id",
        new_column_name="id",
    )

    # 7. Make the UUID column the new primary key.
    op.create_primary_key(
        "projects_pkey",
        "projects",
        ["id"],
    )

    # 8. Recreate the index on projects.id.
    op.create_index(
        "ix_projects_id",
        "projects",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    """Change projects.id back from UUID to INTEGER."""

    # A UUID cannot be meaningfully converted back to the original
    # integer IDs because those IDs were replaced during upgrade.
    raise RuntimeError(
        "Downgrade from UUID to INTEGER is not supported because "
        "the original integer project IDs were replaced."
    )