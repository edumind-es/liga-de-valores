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

"""Update sports catalog: TowerTouchball config, remove swimming, inclusive language

Revision ID: 007_update_sports_catalog
Revises: 006_add_alternative_sports
Create Date: 2025-12-16

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '007_update_sports_catalog'
down_revision: Union[str, None] = '006_add_alternative_sports'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update TowerTouchball with special scoring system
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            tipo_marcador = 'towertouchball',
            config = '{
                "duracion_minutos": 15,
                "conos_por_equipo": 3,
                "tiene_cono_especial": true,
                "victoria_por_conos": true,
                "victoria_por_puntos": true
            }',
            descripcion = 'Deporte alternativo creado por Luis Vilela. Victoria por puntos (+1/-1 al dar con pelota en campo contrario) o derribando los 3 conos del equipo contrario (excepto el cono especial primero)'
        WHERE codigo = 'towertouchball'
    """)
    
    # 2. Remove Natación Adaptada
    op.execute("""
        DELETE FROM tipos_deporte WHERE codigo = 'natacion_adapt'
    """)
    
    # 3. Update descriptions to inclusive language (remove explicit disability references)
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Deporte paralímpico con balón sonoro. 3 jugadores por equipo'
        WHERE codigo = 'goalball'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Deporte de precisión con bolas. 6 bolas por jugador'
        WHERE codigo = 'boccia'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Voleibol jugado sentado. Adaptado para todos'
        WHERE codigo = 'sitting_vball'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Baloncesto en silla de ruedas. Deporte paralímpico'
        WHERE codigo = 'wheelchair_bball'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Fútbol con balón sonoro. 5 jugadores por equipo'
        WHERE codigo = 'futbol_5'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Fútbol adaptado. 7 jugadores por equipo'
        WHERE codigo = 'futbol_7_pc'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Atletismo inclusivo para todos. Múltiples modalidades'
        WHERE codigo = 'atletismo_adapt'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Voleibol con balón sonoro. Sistema de sets tradicional'
        WHERE codigo = 'vball_ciegos'
    """)


def downgrade() -> None:
    # Restore TowerTouchball original config
    op.execute("""
        UPDATE tipos_deporte 
        SET 
            tipo_marcador = 'puntos',
            config = '{"torres": 4, "puntos_para_ganar": 50}',
            descripcion = 'Deporte alternativo creado por Luis Vilela con torres como objetivos'
        WHERE codigo = 'towertouchball'
    """)
    
    # Re-add Natación Adaptada
    op.execute("""
        INSERT INTO tipos_deporte (nombre, codigo, tipo_marcador, permite_empate, config, icono, descripcion)
        VALUES ('Natación Adaptada', 'natacion_adapt', 'tiempo', false, 
                '{"categorias": ["libre", "espalda", "braza", "mariposa"]}', 
                '🏊♿', 
                'Natación adaptada para diferentes discapacidades')
    """)
    
    # Restore original descriptions
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Deporte paralímpico para personas con discapacidad visual'
        WHERE codigo = 'goalball'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Deporte de precisión para personas con discapacidad física severa'
        WHERE codigo = 'boccia'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Voleibol sentado para personas con discapacidad física'
        WHERE codigo = 'sitting_vball'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Baloncesto en silla de ruedas'
        WHERE codigo = 'wheelchair_bball'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Fútbol para personas con discapacidad visual (balon sonoro)'
        WHERE codigo = 'futbol_5'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Fútbol para personas con parálisis cerebral'
        WHERE codigo = 'futbol_7_pc'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Atletismo adaptado para diferentes discapacidades'
        WHERE codigo = 'atletismo_adapt'
    """)
    
    op.execute("""
        UPDATE tipos_deporte 
        SET descripcion = 'Voleibol adaptado para personas con discapacidad visual usando balón sonoro'
        WHERE codigo = 'vball_ciegos'
    """)
