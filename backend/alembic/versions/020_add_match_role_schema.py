"""add configurable match role schema tables

Revision ID: 020_match_role_schema
Revises: 019_user_league_entitlements
Create Date: 2026-02-22 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "020_match_role_schema"
down_revision: Union[str, Sequence[str], None] = "019_user_league_entitlements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "league_match_role_schema",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("liga_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("roles_per_match", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("roles_per_match between 3 and 5", name="ck_lmrs_roles_per_match_range"),
        sa.CheckConstraint("status in ('draft','locked','deprecated')", name="ck_lmrs_status"),
        sa.ForeignKeyConstraint(["liga_id"], ["ligas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_league_match_role_schema_id"), "league_match_role_schema", ["id"], unique=False)
    op.create_index(op.f("ix_league_match_role_schema_liga_id"), "league_match_role_schema", ["liga_id"], unique=False)

    op.create_table(
        "league_match_role_slot",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schema_id", sa.Integer(), nullable=False),
        sa.Column("slot_key", sa.String(length=20), nullable=False),
        sa.Column("slot_order", sa.Integer(), nullable=False),
        sa.Column("role_code", sa.String(length=64), nullable=False),
        sa.Column("role_label", sa.String(length=120), nullable=False),
        sa.Column("scoring_category", sa.String(length=32), nullable=False, server_default="custom"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("evaluation_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["schema_id"], ["league_match_role_schema.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schema_id", "slot_key", name="uq_lmrs_slot_key"),
        sa.UniqueConstraint("schema_id", "slot_order", name="uq_lmrs_slot_order"),
    )
    op.create_index(op.f("ix_league_match_role_slot_id"), "league_match_role_slot", ["id"], unique=False)
    op.create_index(op.f("ix_league_match_role_slot_schema_id"), "league_match_role_slot", ["schema_id"], unique=False)

    op.create_table(
        "league_match_role_rule",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schema_id", sa.Integer(), nullable=False),
        sa.Column("role_code", sa.String(length=64), nullable=False),
        sa.Column("rule_code", sa.String(length=64), nullable=False),
        sa.Column("params_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.ForeignKeyConstraint(["schema_id"], ["league_match_role_schema.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_league_match_role_rule_id"), "league_match_role_rule", ["id"], unique=False)
    op.create_index(op.f("ix_league_match_role_rule_schema_id"), "league_match_role_rule", ["schema_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_league_match_role_rule_schema_id"), table_name="league_match_role_rule")
    op.drop_index(op.f("ix_league_match_role_rule_id"), table_name="league_match_role_rule")
    op.drop_table("league_match_role_rule")

    op.drop_index(op.f("ix_league_match_role_slot_schema_id"), table_name="league_match_role_slot")
    op.drop_index(op.f("ix_league_match_role_slot_id"), table_name="league_match_role_slot")
    op.drop_table("league_match_role_slot")

    op.drop_index(op.f("ix_league_match_role_schema_liga_id"), table_name="league_match_role_schema")
    op.drop_index(op.f("ix_league_match_role_schema_id"), table_name="league_match_role_schema")
    op.drop_table("league_match_role_schema")
