"""add_team_portal_fields

Revision ID: 72a20bb2d4f9
Revises: 013_rename_colpbol
Create Date: 2026-01-15 19:02:48.768247

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '72a20bb2d4f9'
down_revision: Union[str, None] = '013_rename_colpbol'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add team portal fields to ligas table
    op.add_column('ligas', sa.Column('team_roles', sa.JSON(), server_default='["Capitán/a", "Entrenador/a", "Árbitro/a", "Tutor/a de grada", "Preparador/a físico/a"]', nullable=True))
    op.add_column('ligas', sa.Column('team_commitments', sa.JSON(), server_default='{"Capitán/a": ["Liderar con respeto", "Dar ejemplo", "Comunicar con el profesorado"], "Entrenador/a": ["Gestionar alineaciones", "Decidir cambios", "Organizar táctica"], "Árbitro/a": ["Ser imparcial", "Conocer las reglas", "Gestionar conflictos con calma"], "Tutor/a de grada": ["Asegurar que el equipo anime con respeto y deportividad", "Evitar insultos", "Celebrar sin humillar"], "Preparador/a físico/a": ["Ayudar en calentamiento", "Prevenir lesiones", "Motivar al equipo"]}', nullable=True))


def downgrade() -> None:
    op.drop_column('ligas', 'team_commitments')
    op.drop_column('ligas', 'team_roles')
