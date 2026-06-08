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

"""Add multi-sport tables

Revision ID: 002
Revises: 001
Create Date: 2025-11-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tipos_deporte table
    op.create_table(
        'tipos_deporte',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=50), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('tipo_marcador', sa.String(length=20), nullable=False),
        sa.Column('permite_empate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('icono', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tipos_deporte_id'), 'tipos_deporte', ['id'], unique=False)
    op.create_index(op.f('ix_tipos_deporte_codigo'), 'tipos_deporte', ['codigo'], unique=True)
    
    # Populate tipos_deporte with initial sports
    op.execute("""
        INSERT INTO tipos_deporte (nombre, codigo, tipo_marcador, permite_empate, config, icono)
        VALUES 
            ('Fútbol', 'futbol', 'goles', true, '{"tiempo_regulacion": 40}', '⚽'),
            ('Bádminton', 'badminton', 'sets', false, '{"sets_para_ganar": 2, "puntos_por_set": 21}', '🏸'),
            ('Colpball', 'colpball', 'puntos', true, '{"puntos_max": 50}', '🥎'),
            ('Rugby Tag', 'rugby_tag', 'tries', true, '{"valor_try": 5, "valor_conversion": 2}', '🏉'),
            ('Baloncesto', 'baloncesto', 'puntos', false, '{"cuartos": 4}', '🏀'),
            ('Voleibol', 'voleibol', 'sets', true, '{"sets_para_ganar": 2, "puntos_por_set": 25}', '🏐'),
            ('Balonmano', 'balonmano', 'goles', true, '{"tiempo_regulacion": 40}', '🤾'),
            ('Ultimate Frisbee', 'ultimate', 'puntos', true, '{"puntos_para_ganar": 15}', '🥏')
    """)
    
    # Create ligas table
    op.create_table(
        'ligas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('temporada', sa.String(length=20), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ligas_id'), 'ligas', ['id'], unique=False)
    
    # Create equipos table
    op.create_table(
        'equipos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('logo_filename', sa.String(length=255), nullable=True),
        sa.Column('color_principal', sa.String(length=7), nullable=True),
        sa.Column('acceso_token', sa.String(length=64), nullable=True),
        sa.Column('liga_id', sa.Integer(), nullable=False),
        sa.Column('puntos_totales', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ganados', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('empatados', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('perdidos', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_juego_limpio', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_arbitro', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_grada', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['liga_id'], ['ligas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_equipos_id'), 'equipos', ['id'], unique=False)
    op.create_index(op.f('ix_equipos_acceso_token'), 'equipos', ['acceso_token'], unique=True)
    
    # Create jornadas table
    op.create_table(
        'jornadas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('numero', sa.Integer(), nullable=True),
        sa.Column('fecha_inicio', sa.DateTime(timezone=True), nullable=True),
        sa.Column('fecha_fin', sa.DateTime(timezone=True), nullable=True),
        sa.Column('liga_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['liga_id'], ['ligas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jornadas_id'), 'jornadas', ['id'], unique=False)
    
    # Create partidos table
    op.create_table(
        'partidos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('liga_id', sa.Integer(), nullable=False),
        sa.Column('jornada_id', sa.Integer(), nullable=True),
        sa.Column('tipo_deporte_id', sa.Integer(), nullable=False),
        sa.Column('equipo_local_id', sa.Integer(), nullable=False),
        sa.Column('equipo_visitante_id', sa.Integer(), nullable=False),
        sa.Column('arbitro_id', sa.Integer(), nullable=True),
        sa.Column('tutor_grada_local_id', sa.Integer(), nullable=True),
        sa.Column('tutor_grada_visitante_id', sa.Integer(), nullable=True),
        sa.Column('marcador', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('puntos_local', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_visitante', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resultado', sa.String(length=10), nullable=True),
        sa.Column('finalizado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=True),
        sa.Column('puntos_juego_limpio_local', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_juego_limpio_visitante', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_arbitro', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_grada_local', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('puntos_grada_visitante', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('arbitro_conocimiento', sa.Integer(), nullable=True),
        sa.Column('arbitro_gestion', sa.Integer(), nullable=True),
        sa.Column('arbitro_apoyo', sa.Integer(), nullable=True),
        sa.Column('arbitro_media', sa.Float(), nullable=True),
        sa.Column('grada_animar_local', sa.Integer(), nullable=True),
        sa.Column('grada_respeto_local', sa.Integer(), nullable=True),
        sa.Column('grada_participacion_local', sa.Integer(), nullable=True),
        sa.Column('grada_animar_visitante', sa.Integer(), nullable=True),
        sa.Column('grada_respeto_visitante', sa.Integer(), nullable=True),
        sa.Column('grada_participacion_visitante', sa.Integer(), nullable=True),
        sa.Column('pin', sa.String(length=6), nullable=True),
        sa.Column('pin_valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('pin_valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['arbitro_id'], ['equipos.id'], ),
        sa.ForeignKeyConstraint(['equipo_local_id'], ['equipos.id'], ),
        sa.ForeignKeyConstraint(['equipo_visitante_id'], ['equipos.id'], ),
        sa.ForeignKeyConstraint(['jornada_id'], ['jornadas.id'], ),
        sa.ForeignKeyConstraint(['liga_id'], ['ligas.id'], ),
        sa.ForeignKeyConstraint(['tipo_deporte_id'], ['tipos_deporte.id'], ),
        sa.ForeignKeyConstraint(['tutor_grada_local_id'], ['equipos.id'], ),
        sa.ForeignKeyConstraint(['tutor_grada_visitante_id'], ['equipos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_partidos_id'), 'partidos', ['id'], unique=False)
    op.create_index(op.f('ix_partidos_pin'), 'partidos', ['pin'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_partidos_pin'), table_name='partidos')
    op.drop_index(op.f('ix_partidos_id'), table_name='partidos')
    op.drop_table('partidos')
    
    op.drop_index(op.f('ix_jornadas_id'), table_name='jornadas')
    op.drop_table('jornadas')
    
    op.drop_index(op.f('ix_equipos_acceso_token'), table_name='equipos')
    op.drop_index(op.f('ix_equipos_id'), table_name='equipos')
    op.drop_table('equipos')
    
    op.drop_index(op.f('ix_ligas_id'), table_name='ligas')
    op.drop_table('ligas')
    
    op.drop_index(op.f('ix_tipos_deporte_codigo'), table_name='tipos_deporte')
    op.drop_index(op.f('ix_tipos_deporte_id'), table_name='tipos_deporte')
    op.drop_table('tipos_deporte')
