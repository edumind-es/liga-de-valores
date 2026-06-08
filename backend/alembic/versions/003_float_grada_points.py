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

"""Cambiar puntos_grada a Float para soportar medios puntos

Revision ID: 003_float_grada_points
Revises: cb01274cf145
Create Date: 2025-12-14 20:06:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_float_grada_points'
down_revision = 'cb01274cf145'
branch_labels = None
depends_on = None


def upgrade():
    """
    Cambiar columnas puntos_grada de Integer a Float para soportar
    sistema de puntuación gradual: >75%=1pt, 50-75%=0.5pt, <50%=0pt
    """
    # Cambiar puntos_grada en tabla equipos
    op.alter_column('equipos', 'puntos_grada',
                    existing_type=sa.Integer(),
                    type_=sa.Float(),
                    existing_nullable=False,
                    existing_server_default='0')
    
    # Cambiar puntos_grada_local en tabla partidos
    op.alter_column('partidos', 'puntos_grada_local',
                    existing_type=sa.Integer(),
                    type_=sa.Float(),
                    existing_nullable=False,
                    existing_server_default='0')
    
    # Cambiar puntos_grada_visitante en tabla partidos
    op.alter_column('partidos', 'puntos_grada_visitante',
                    existing_type=sa.Integer(),
                    type_=sa.Float(),
                    existing_nullable=False,
                    existing_server_default='0')


def downgrade():
    """
    Revertir cambios: Float → Integer
    NOTA: Valores como 0.5 se truncarán a 0
    """
    # Revertir puntos_grada_visitante en tabla partidos
    op.alter_column('partidos', 'puntos_grada_visitante',
                    existing_type=sa.Float(),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    existing_server_default='0')
    
    # Revertir puntos_grada_local en tabla partidos
    op.alter_column('partidos', 'puntos_grada_local',
                    existing_type=sa.Float(),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    existing_server_default='0')
    
    # Revertir puntos_grada en tabla equipos
    op.alter_column('equipos', 'puntos_grada',
                    existing_type=sa.Float(),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    existing_server_default='0')
