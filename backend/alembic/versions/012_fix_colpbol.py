#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

"""Fix Colpbol config - correct codigo is colpball

Revision ID: 012_fix_colpbol
Revises: 011_add_new_sports
Create Date: 2026-01-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '012_fix_colpbol'
down_revision: Union[str, None] = '011_add_new_sports'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix Colpbol - the correct codigo in DB is 'colpball' not 'colpbol'
    # Sistema de puntuación por goles (3 puntos victoria, 1 empate)
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            nombre = 'Colpbol',
            tipo_marcador = 'goles',
            config = '{
                "tiempo_regulacion": 30,
                "jugadores": 7,
                "botones_puntuacion": [1],
                "puntos_victoria": 3,
                "puntos_empate": 1
            }',
            descripcion = 'Deporte de equipo donde se golpea el balón con el puño. Victoria por goles.'
        WHERE codigo = 'colpball'
    """)


def downgrade() -> None:
    # Revert to original
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            nombre = 'Colpball',
            tipo_marcador = 'puntos',
            config = '{"puntos_max": 50}',
            descripcion = NULL
        WHERE codigo = 'colpball'
    """)
