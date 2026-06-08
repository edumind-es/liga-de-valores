#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

"""Add fases finales y cruces para playoff system

Revision ID: 025_add_fases_finales
Revises: 024_production_hardening
Create Date: 2026-05-02

Adds:
  - fases_finales: gestión de fases eliminatorias por liga
  - cruces_fase: emparejamientos entre equipos dentro de una fase
  - partidos.cruce_id: FK nullable para vincular partidos a cruces
"""

from alembic import op
import sqlalchemy as sa

revision = '025_add_fases_finales'
down_revision = '024_production_hardening'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fases_finales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('liga_id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(120), nullable=False, server_default='Fase Final'),
        sa.Column('num_partidos_por_cruce', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('asignar_roles_auto', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('estado', sa.String(20), nullable=False, server_default='borrador'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['liga_id'], ['ligas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fases_finales_liga_id', 'fases_finales', ['liga_id'])

    op.create_table(
        'cruces_fase',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('fase_id', sa.Integer(), nullable=False),
        sa.Column('equipo_a_id', sa.Integer(), nullable=False),
        sa.Column('equipo_b_id', sa.Integer(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ganador_id', sa.Integer(), nullable=True),
        sa.Column('estado', sa.String(20), nullable=False, server_default='pendiente'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['fase_id'], ['fases_finales.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['equipo_a_id'], ['equipos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['equipo_b_id'], ['equipos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ganador_id'], ['equipos.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cruces_fase_fase_id', 'cruces_fase', ['fase_id'])

    op.add_column('partidos', sa.Column('cruce_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_partidos_cruce_id',
        'partidos', 'cruces_fase',
        ['cruce_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_partidos_cruce_id', 'partidos', ['cruce_id'])


def downgrade() -> None:
    op.drop_index('ix_partidos_cruce_id', 'partidos')
    op.drop_constraint('fk_partidos_cruce_id', 'partidos', type_='foreignkey')
    op.drop_column('partidos', 'cruce_id')
    op.drop_index('ix_cruces_fase_fase_id', 'cruces_fase')
    op.drop_table('cruces_fase')
    op.drop_index('ix_fases_finales_liga_id', 'fases_finales')
    op.drop_table('fases_finales')
