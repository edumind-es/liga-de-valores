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
add_evaluacion_personalizada_tables

Revision ID: 008_add_evaluacion_personalizada
Revises: cb01274cf145
Create Date: 2026-01-10

Añade las tablas para el sistema de evaluación personalizable:
- criterios_evaluacion: Criterios configurables por liga
- evaluaciones_personalizadas: Valores de evaluación para partidos
- modo_evaluacion en ligas: Para elegir entre sistema clásico y personalizado
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008_add_evaluacion_personalizada'
down_revision = '7b46c8ad51db'  # add_email_fichas_to_ligas (actual head de la BD)
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Añadir campo modo_evaluacion a ligas
    op.add_column(
        'ligas',
        sa.Column('modo_evaluacion', sa.String(20), nullable=False, server_default='clasico')
    )
    
    # 2. Crear tabla criterios_evaluacion
    op.create_table(
        'criterios_evaluacion',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('liga_id', sa.Integer(), sa.ForeignKey('ligas.id', ondelete='CASCADE'), nullable=False, index=True),
        
        # Información del criterio
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.Column('codigo', sa.String(30), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        
        # Categoría
        sa.Column('categoria', sa.String(20), nullable=False, server_default='general'),
        
        # Configuración de escala
        sa.Column('escala_min', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('escala_max', sa.Integer(), nullable=False, server_default='10'),
        
        # Umbrales y puntos
        sa.Column('umbral_alto', sa.Float(), server_default='7.0'),
        sa.Column('umbral_medio', sa.Float(), server_default='4.0'),
        sa.Column('puntos_alto', sa.Float(), server_default='1.0'),
        sa.Column('puntos_medio', sa.Float(), server_default='0.5'),
        
        # Control de visualización
        sa.Column('orden', sa.Integer(), server_default='0'),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('icono', sa.String(10), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # 3. Crear tabla evaluaciones_personalizadas
    op.create_table(
        'evaluaciones_personalizadas',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('partido_id', sa.Integer(), sa.ForeignKey('partidos.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('criterio_id', sa.Integer(), sa.ForeignKey('criterios_evaluacion.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('equipo_id', sa.Integer(), sa.ForeignKey('equipos.id', ondelete='SET NULL'), nullable=True),
        
        # Valor de evaluación
        sa.Column('valor', sa.Integer(), nullable=False),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        
        # Constraint de unicidad
        sa.UniqueConstraint('partido_id', 'criterio_id', 'equipo_id', name='uq_evaluacion_partido_criterio_equipo'),
    )
    
    # 4. Crear índice compuesto para búsquedas frecuentes
    op.create_index(
        'ix_evaluaciones_partido_criterio',
        'evaluaciones_personalizadas',
        ['partido_id', 'criterio_id']
    )


def downgrade() -> None:
    # Eliminar en orden inverso
    op.drop_index('ix_evaluaciones_partido_criterio', table_name='evaluaciones_personalizadas')
    op.drop_table('evaluaciones_personalizadas')
    op.drop_table('criterios_evaluacion')
    op.drop_column('ligas', 'modo_evaluacion')
