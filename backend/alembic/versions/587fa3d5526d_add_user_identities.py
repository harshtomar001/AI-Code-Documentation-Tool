"""add user identities

Revision ID: 587fa3d5526d
Revises: 68d1d4047d4d
Create Date: 2026-09-26 15:43:47.808302
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "587fa3d5526d"
down_revision: Union[str, Sequence[str], None] = "68d1d4047d4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create new user_identities table
    op.create_table(
        "user_identities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_id", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
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
        sa.UniqueConstraint(
            "provider",
            "provider_id",
            name="uq_user_identity_provider_provider_id",
        ),
        sa.UniqueConstraint(
            "user_id",
            "provider",
            name="uq_user_identity_user_provider",
        ),
    )

    op.create_index(
        op.f("ix_user_identities_id"),
        "user_identities",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_identities_user_id"),
        "user_identities",
        ["user_id"],
        unique=False,
    )

    # 2. IMPORTANT:
    # Copy existing Google/Microsoft identities before removing
    # provider/provider_id from users.
    op.execute(
        sa.text(
            """
            INSERT INTO user_identities
                (user_id, provider, provider_id)
            SELECT
                id,
                provider,
                provider_id
            FROM users
            WHERE provider IN ('google', 'microsoft')
              AND provider_id IS NOT NULL
            """
        )
    )

    # 3. Remove old unique constraint from users
    op.drop_constraint(
        "uq_user_provider_provider_id",
        "users",
        type_="unique",
    )

    # 4. Remove old OAuth columns from users
    op.drop_column("users", "provider_id")
    op.drop_column("users", "provider")


def downgrade() -> None:
    # Recreate old columns
    op.add_column(
        "users",
        sa.Column(
            "provider",
            sa.VARCHAR(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "provider_id",
            sa.VARCHAR(length=255),
            nullable=True,
        ),
    )

    # Restore old provider information from identities.
    #
    # If a user has multiple identities, the first one returned
    # is restored because the old schema could store only one.
    op.execute(
        sa.text(
            """
            UPDATE users u
            SET
                provider = i.provider,
                provider_id = i.provider_id
            FROM (
                SELECT DISTINCT ON (user_id)
                    user_id,
                    provider,
                    provider_id
                FROM user_identities
                ORDER BY user_id, id
            ) i
            WHERE u.id = i.user_id
            """
        )
    )

    # Users without Google/Microsoft identity are local users.
    op.execute(
        sa.text(
            """
            UPDATE users
            SET provider = 'local'
            WHERE provider IS NULL
            """
        )
    )

    # Restore old unique constraint
    op.create_unique_constraint(
        "uq_user_provider_provider_id",
        "users",
        ["provider", "provider_id"],
    )

    # Remove new indexes/table
    op.drop_index(
        op.f("ix_user_identities_user_id"),
        table_name="user_identities",
    )

    op.drop_index(
        op.f("ix_user_identities_id"),
        table_name="user_identities",
    )

    op.drop_table("user_identities")

    # Make provider NOT NULL again
    op.alter_column(
        "users",
        "provider",
        existing_type=sa.VARCHAR(length=20),
        nullable=False,
    )

