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

"""Fix scoreboard types for sports with incorrect tipo_marcador

Revision ID: 014_fix_scoreboard_types
Revises: 013_rename_colpbol
Create Date: 2026-02-09

Changes:
- Pickleball: puntos -> sets (official format: best of 3 games to 11)
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '014_fix_scoreboard_types'
down_revision: Union[str, None] = 'db8144756603'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Pickleball: Change from puntos to sets
    # Official pickleball is played best of 3 games to 11 points (win by 2)
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            tipo_marcador = 'sets',
            config = '{
                "sets_para_ganar": 2,
                "puntos_por_set": 11,
                "diferencia_minima": 2,
                "botones_puntuacion": [1],
                "cambio_saque_puntos": 1
            }',
            descripcion = 'Deporte de raqueta en cancha reducida. Mejor de 3 juegos a 11 puntos con ventaja de 2.'
        WHERE codigo = 'pickleball'
    """)


def downgrade() -> None:
    # Revert Pickleball to puntos
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            tipo_marcador = 'puntos',
            config = '{
                "puntos_para_ganar": 11,
                "diferencia_minima": 2,
                "botones_puntuacion": [1],
                "cambio_saque_puntos": 1
            }',
            descripcion = 'Deporte de raqueta en cancha reducida. Sistema a 11 puntos con ventaja de 2.'
        WHERE codigo = 'pickleball'
    """)
