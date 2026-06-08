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

"""
wiki_fichas_juegos

Revision ID: 009_wiki_fichas_juegos
Revises: 008_add_evaluacion_personalizada
Create Date: 2026-01-10

Implementa el sistema de Wiki de Fichas de Juegos:
- Añade campo 'categoria' a tipos_deporte (alternativo, popular, tradicional, convencional)
- Añade campos estructurados a game_submissions (materiales, reglas, pictogramas, etc.)
- Añade campos de atribución docente y control de limpieza automática
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '009_wiki_fichas_juegos'
down_revision = '008_add_evaluacion_personalizada'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ═══════════════════════════════════════════════════════════════════
    # 1. TIPOS_DEPORTE: Añadir categoría para clasificación en Wiki
    # ═══════════════════════════════════════════════════════════════════
    op.add_column(
        'tipos_deporte',
        sa.Column('categoria', sa.String(30), nullable=True)
    )
    op.create_index('ix_tipos_deporte_categoria', 'tipos_deporte', ['categoria'])
    
    # ═══════════════════════════════════════════════════════════════════
    # 2. GAME_SUBMISSIONS: Añadir campos estructurados
    # ═══════════════════════════════════════════════════════════════════
    
    # Contenido estructurado (ANÓNIMO)
    op.add_column(
        'game_submissions',
        sa.Column('materiales', sa.Text(), nullable=True)
    )
    op.add_column(
        'game_submissions',
        sa.Column('reglas', sa.Text(), nullable=True)
    )
    op.add_column(
        'game_submissions',
        sa.Column('representacion_grafica', sa.String(255), nullable=True)
    )
    op.add_column(
        'game_submissions',
        sa.Column('pictogramas_materiales', JSON, nullable=True)
    )
    op.add_column(
        'game_submissions',
        sa.Column('pictogramas_reglas', JSON, nullable=True)
    )
    
    # Atribución docente (opcional)
    op.add_column(
        'game_submissions',
        sa.Column('docente_nombre', sa.String(100), nullable=True)
    )
    op.add_column(
        'game_submissions',
        sa.Column('docente_email', sa.String(255), nullable=True)
    )
    
    # Control de limpieza automática
    op.add_column(
        'game_submissions',
        sa.Column('aviso_enviado', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'game_submissions',
        sa.Column('fecha_aviso', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'game_submissions',
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Hacer file_path nullable (ahora es opcional, datos estructurados son primarios)
    op.alter_column(
        'game_submissions',
        'file_path',
        existing_type=sa.String(255),
        nullable=True
    )
    
    # Índices para búsquedas frecuentes en Wiki
    op.create_index('ix_game_submissions_published_at', 'game_submissions', ['published_at'])
    op.create_index('ix_game_submissions_aviso_enviado', 'game_submissions', ['aviso_enviado'])


def downgrade() -> None:
    # Eliminar índices
    op.drop_index('ix_game_submissions_aviso_enviado', table_name='game_submissions')
    op.drop_index('ix_game_submissions_published_at', table_name='game_submissions')
    
    # Restaurar file_path a NOT NULL
    op.alter_column(
        'game_submissions',
        'file_path',
        existing_type=sa.String(255),
        nullable=False
    )
    
    # Eliminar columnas de game_submissions
    op.drop_column('game_submissions', 'published_at')
    op.drop_column('game_submissions', 'fecha_aviso')
    op.drop_column('game_submissions', 'aviso_enviado')
    op.drop_column('game_submissions', 'docente_email')
    op.drop_column('game_submissions', 'docente_nombre')
    op.drop_column('game_submissions', 'pictogramas_reglas')
    op.drop_column('game_submissions', 'pictogramas_materiales')
    op.drop_column('game_submissions', 'representacion_grafica')
    op.drop_column('game_submissions', 'reglas')
    op.drop_column('game_submissions', 'materiales')
    
    # Eliminar categoría de tipos_deporte
    op.drop_index('ix_tipos_deporte_categoria', table_name='tipos_deporte')
    op.drop_column('tipos_deporte', 'categoria')
