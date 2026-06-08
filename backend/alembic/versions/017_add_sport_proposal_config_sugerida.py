"""Add config_sugerida to sport_proposals

Revision ID: 017_sport_proposal_cfg
Revises: 016_add_evaluacion_completa
Create Date: 2026-02-11 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '017_sport_proposal_cfg'
down_revision: Union[str, None] = '016_add_evaluacion_completa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("sport_proposals")}

    if "config_sugerida" not in existing_columns:
        op.add_column("sport_proposals", sa.Column("config_sugerida", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("sport_proposals")}

    if "config_sugerida" in existing_columns:
        op.drop_column("sport_proposals", "config_sugerida")
