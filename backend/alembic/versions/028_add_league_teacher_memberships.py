"""add league teacher memberships

Revision ID: 028_add_league_teacher_memberships
Revises: 027_add_email_verification
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "028_add_league_teacher_memberships"
down_revision = "027_add_email_verification"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "league_teacher_memberships",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("liga_id", sa.Integer(), sa.ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(40), nullable=False, server_default="collaborator_teacher"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("can_view_league", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("can_view_matches", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("can_open_matches", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_validate_matches", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_view_results", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("can_manage_members", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("revoked_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("liga_id", "user_id", name="uq_league_teacher_memberships_liga_user"),
    )
    op.create_index("ix_league_teacher_memberships_liga_id", "league_teacher_memberships", ["liga_id"])
    op.create_index("ix_league_teacher_memberships_user_id", "league_teacher_memberships", ["user_id"])
    op.create_index("ix_league_teacher_memberships_status", "league_teacher_memberships", ["status"])


def downgrade():
    op.drop_index("ix_league_teacher_memberships_status", table_name="league_teacher_memberships")
    op.drop_index("ix_league_teacher_memberships_user_id", table_name="league_teacher_memberships")
    op.drop_index("ix_league_teacher_memberships_liga_id", table_name="league_teacher_memberships")
    op.drop_table("league_teacher_memberships")
