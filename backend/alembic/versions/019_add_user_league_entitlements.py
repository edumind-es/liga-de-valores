"""add user league entitlement fields

Revision ID: 019_user_league_entitlements
Revises: 018_merge_pending_sport
Create Date: 2026-02-21 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision: str = "019_user_league_entitlements"
down_revision: Union[str, Sequence[str], None] = "018_merge_pending_sport"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("plan_code", sa.String(length=40), nullable=False, server_default="free"),
    )
    op.add_column("users", sa.Column("plan_leagues_limit", sa.Integer(), nullable=True))
    op.add_column(
        "users",
        sa.Column("grandfathered_unlimited", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("grandfathered_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_users_plan_code"), "users", ["plan_code"], unique=False)

    cutoff = datetime(2026, 6, 30, 23, 59, 59, tzinfo=timezone.utc)
    op.execute(
        sa.text(
            """
            UPDATE users
            SET grandfathered_unlimited = TRUE,
                grandfathered_at = COALESCE(grandfathered_at, created_at),
                plan_code = CASE
                    WHEN plan_code IS NULL OR plan_code = '' OR plan_code = 'free'
                    THEN 'founding_teacher'
                    ELSE plan_code
                END
            WHERE created_at <= CAST(:cutoff AS timestamptz)
            """
        ).bindparams(cutoff=cutoff)
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_plan_code"), table_name="users")
    op.drop_column("users", "grandfathered_at")
    op.drop_column("users", "grandfathered_unlimited")
    op.drop_column("users", "plan_leagues_limit")
    op.drop_column("users", "plan_code")
