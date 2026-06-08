"""Add evaluacion_completa to partidos

Revision ID: 016_add_evaluacion_completa
Revises: db8144756603
Create Date: 2026-02-11 18:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '016_add_evaluacion_completa'
down_revision: Union[str, None] = 'db8144756603'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("partidos")}

    if "evaluacion_completa" not in existing_columns:
        op.add_column(
            "partidos",
            sa.Column(
                "evaluacion_completa",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
        op.alter_column("partidos", "evaluacion_completa", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("partidos")}

    if "evaluacion_completa" in existing_columns:
        op.drop_column("partidos", "evaluacion_completa")
