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

"""Add pickleball, baloncesto 3x3, volley adaptado and update colpbol/boccia configs

Revision ID: 011_add_new_sports
Revises: 010_taxonomias_pedagogicas
Create Date: 2026-01-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '011_add_new_sports'
down_revision: Union[str, None] = '010_taxonomias_pedagogicas'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update Colpbol - Change to goles and add proper config
    # Sistema de puntuación por goles (3 puntos victoria, 1 empate)
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            tipo_marcador = 'goles',
            config = '{
                "tiempo_regulacion": 30,
                "jugadores": 7,
                "botones_puntuacion": [1],
                "puntos_victoria": 3,
                "puntos_empate": 1
            }',
            descripcion = 'Deporte de equipo donde se golpea el balón con el puño. Victoria por goles.'
        WHERE codigo = 'colpbol'
    """)
    
    # 2. Update Boccia - Enhanced config for precision scoring
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            config = '{
                "ends": 4,
                "bolas_por_jugador": 6,
                "botones_puntuacion": [1, 2, 3, 4, 5, 6]
            }',
            descripcion = 'Deporte de precisión con bolas. Puntuación por cercanía a la bola objetivo.'
        WHERE codigo = 'boccia'
    """)
    
    # 3. Add Pickleball
    op.execute("""
        INSERT INTO tipos_deporte (nombre, codigo, tipo_marcador, permite_empate, config, icono, descripcion, categoria)
        VALUES (
            'Pickleball', 
            'pickleball', 
            'puntos', 
            false, 
            '{
                "puntos_para_ganar": 11,
                "diferencia_minima": 2,
                "botones_puntuacion": [1],
                "cambio_saque_puntos": 1
            }', 
            '🏓', 
            'Deporte de raqueta en cancha reducida. Sistema a 11 puntos con ventaja de 2.',
            'alternativo'
        )
        ON CONFLICT (codigo) DO UPDATE SET
            config = EXCLUDED.config,
            descripcion = EXCLUDED.descripcion
    """)
    
    # 4. Add Baloncesto 3x3
    op.execute("""
        INSERT INTO tipos_deporte (nombre, codigo, tipo_marcador, permite_empate, config, icono, descripcion, categoria)
        VALUES (
            'Baloncesto 3x3', 
            'baloncesto_3x3', 
            'puntos', 
            false, 
            '{
                "puntos_para_ganar": 21,
                "tiempo_limite": 10,
                "botones_puntuacion": [1, 2]
            }', 
            '🏀', 
            'Baloncesto en media cancha. 1 punto interior, 2 puntos exterior. Primero a 21 o mayor puntuación en 10 min.',
            'convencional'
        )
        ON CONFLICT (codigo) DO UPDATE SET
            config = EXCLUDED.config,
            descripcion = EXCLUDED.descripcion
    """)
    
    # 5. Add Volley Adaptado (versión genérica)
    op.execute("""
        INSERT INTO tipos_deporte (nombre, codigo, tipo_marcador, permite_empate, config, icono, descripcion, categoria)
        VALUES (
            'Volleyball Adaptado', 
            'volley_adaptado', 
            'sets', 
            false, 
            '{
                "sets_para_ganar": 2,
                "puntos_por_set": 25,
                "puntos_set_decisivo": 15,
                "diferencia_minima": 2,
                "botones_puntuacion": [1]
            }', 
            '🏐♿', 
            'Volleyball adaptado para diferentes necesidades. Sistema de sets tradicional.',
            'adaptado'
        )
        ON CONFLICT (codigo) DO UPDATE SET
            config = EXCLUDED.config,
            descripcion = EXCLUDED.descripcion
    """)


def downgrade() -> None:
    # Revert Colpbol to original config
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            tipo_marcador = 'puntos',
            config = '{"puntos_max": 50}',
            descripcion = NULL
        WHERE codigo = 'colpbol'
    """)
    
    # Revert Boccia to original config
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            config = '{"bolas_por_jugador": 6}',
            descripcion = 'Deporte de precisión con bolas. 6 bolas por jugador'
        WHERE codigo = 'boccia'
    """)
    
    # Remove new sports
    op.execute("""
        DELETE FROM tipos_deporte 
        WHERE codigo IN ('pickleball', 'baloncesto_3x3', 'volley_adaptado')
    """)
