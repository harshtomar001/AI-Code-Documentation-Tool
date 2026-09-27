"""add foreign key to otp user

Revision ID: 68d1d4047d4d
Revises: d88e4ffced6a
Create Date: 2026-09-26 15:23:46.768193

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "68d1d4047d4d"
down_revision: Union[str, Sequence[str], None] = "d88e4ffced6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_foreign_key(
        "otp_verifications_user_id_fkey",
        "otp_verifications",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_unique_constraint(
        "uq_user_provider_provider_id",
        "users",
        ["provider", "provider_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "uq_user_provider_provider_id",
        "users",
        type_="unique",
    )

    op.drop_constraint(
        "otp_verifications_user_id_fkey",
        "otp_verifications",
        type_="foreignkey",
    )

