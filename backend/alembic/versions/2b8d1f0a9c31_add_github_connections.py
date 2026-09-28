from alembic import op
import sqlalchemy as sa


revision = "2b8d1f0a9c31"
down_revision = "587fa3d5526d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "github_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("github_user_id", sa.String(), nullable=False),
        sa.Column("github_username", sa.String(), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_index(
        op.f("ix_github_connections_id"),
        "github_connections",
        ["id"],
        unique=False
    )


def downgrade():
    op.drop_index(
        op.f("ix_github_connections_id"),
        table_name="github_connections"
    )

    op.drop_table("github_connections")