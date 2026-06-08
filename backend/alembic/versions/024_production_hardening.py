#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

"""Production hardening: unique pin, FK indexes, pending_actions index

Revision ID: 024_production_hardening
Revises: 023_add_email_enviado
Create Date: 2026-04-30

Adds:
  - UNIQUE constraint on partidos.pin (prevents duplicate PIN access)
  - Indexes on FK columns missing them (ligas.usuario_id, jornadas.liga_id,
    partidos.arbitro_id, partidos.tipo_deporte_id, partidos.tutor_grada_*,
    pending_actions.liga_id, pending_actions.target_id)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '024_production_hardening'
down_revision: Union[str, None] = '023_add_email_enviado'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Unique constraint on partidos.pin — prevents two matches sharing the same student-access PIN
    op.create_index(
        'uq_partidos_pin_not_null',
        'partidos',
        ['pin'],
        unique=True,
        postgresql_where=sa.text('pin IS NOT NULL'),
        sqlite_where=sa.text('pin IS NOT NULL'),
    )

    # FK indexes missing from original schema
    op.create_index('ix_ligas_usuario_id', 'ligas', ['usuario_id'], unique=False)
    op.create_index('ix_jornadas_liga_id', 'jornadas', ['liga_id'], unique=False)
    op.create_index('ix_partidos_arbitro_id', 'partidos', ['arbitro_id'], unique=False)
    op.create_index('ix_partidos_tipo_deporte_id', 'partidos', ['tipo_deporte_id'], unique=False)
    op.create_index('ix_partidos_tutor_grada_local_id', 'partidos', ['tutor_grada_local_id'], unique=False)
    op.create_index('ix_partidos_tutor_grada_visitante_id', 'partidos', ['tutor_grada_visitante_id'], unique=False)

    # pending_actions: index on action_type+status for the pending-count badge query
    op.create_index(
        'ix_pending_actions_type_status',
        'pending_actions',
        ['action_type', 'status'],
        unique=False,
    )
    op.create_index('ix_pending_actions_target_id', 'pending_actions', ['target_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_pending_actions_target_id', table_name='pending_actions')
    op.drop_index('ix_pending_actions_type_status', table_name='pending_actions')
    op.drop_index('ix_partidos_tutor_grada_visitante_id', table_name='partidos')
    op.drop_index('ix_partidos_tutor_grada_local_id', table_name='partidos')
    op.drop_index('ix_partidos_tipo_deporte_id', table_name='partidos')
    op.drop_index('ix_partidos_arbitro_id', table_name='partidos')
    op.drop_index('ix_jornadas_liga_id', table_name='jornadas')
    op.drop_index('ix_ligas_usuario_id', table_name='ligas')
    op.drop_index('uq_partidos_pin_not_null', table_name='partidos')
