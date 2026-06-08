"""add submission policy metadata fields

Revision ID: 021_submission_policy
Revises: 020_match_role_schema
Create Date: 2026-04-02 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "021_submission_policy"
down_revision: Union[str, Sequence[str], None] = "020_match_role_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "game_submissions",
        sa.Column("policy_notice_version", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "game_submissions",
        sa.Column(
            "policy_notice_accepted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "game_submissions",
        sa.Column(
            "community_guidelines_accepted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "game_submissions",
        sa.Column(
            "moderation_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "game_submissions",
        sa.Column("moderation_flags", sa.JSON(), nullable=True),
    )
    op.add_column(
        "game_submissions",
        sa.Column("content_fingerprint", sa.String(length=64), nullable=True),
    )

    op.create_index(
        op.f("ix_game_submissions_moderation_required"),
        "game_submissions",
        ["moderation_required"],
        unique=False,
    )
    op.create_index(
        op.f("ix_game_submissions_content_fingerprint"),
        "game_submissions",
        ["content_fingerprint"],
        unique=False,
    )

    # Keep future inserts explicit and avoid hidden DB defaults in app logic.
    op.alter_column("game_submissions", "policy_notice_accepted", server_default=None)
    op.alter_column("game_submissions", "community_guidelines_accepted", server_default=None)
    op.alter_column("game_submissions", "moderation_required", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_game_submissions_content_fingerprint"), table_name="game_submissions")
    op.drop_index(op.f("ix_game_submissions_moderation_required"), table_name="game_submissions")

    op.drop_column("game_submissions", "content_fingerprint")
    op.drop_column("game_submissions", "moderation_flags")
    op.drop_column("game_submissions", "moderation_required")
    op.drop_column("game_submissions", "community_guidelines_accepted")
    op.drop_column("game_submissions", "policy_notice_accepted")
    op.drop_column("game_submissions", "policy_notice_version")
