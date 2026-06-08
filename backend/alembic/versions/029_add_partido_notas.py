#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""Anotaciones de partido (partido_notas) — Sistema LOPD/RGPD compliant.

Tabla para anotaciones anónimas enviadas vía PIN de partido.
Privacy-by-design: sin datos personales, moderación previa docente, TTL automático.

Revision ID: 029_add_partido_notas
Revises: 028_add_league_teacher_memberships
Create Date: 2026-05-20
"""
from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = '029_add_partido_notas'
down_revision: Union[str, None] = '028_add_league_teacher_memberships'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'partido_notas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'partido_id',
            sa.Integer(),
            sa.ForeignKey('partidos.id', ondelete='CASCADE'),
            nullable=False,
            index=True,
        ),
        # Contenido textual — sin datos personales del alumno
        sa.Column('contenido', sa.Text(), nullable=False),
        sa.Column(
            'tipo',
            sa.String(20),
            nullable=False,
            server_default='observacion',
        ),
        # origen: 'publico' = enviado vía PIN de partido | 'docente' = introducido por docente
        sa.Column(
            'origen',
            sa.String(10),
            nullable=False,
            server_default='publico',
        ),
        # estado: 'pendiente' → moderación previa | 'aprobada' → visible en partido | 'rechazada' → eliminable
        sa.Column(
            'estado',
            sa.String(15),
            nullable=False,
            server_default='pendiente',
            index=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('aprobada_at', sa.DateTime(timezone=True), nullable=True),
    )
    # Índice compuesto para consultas docente: partido + estado
    op.create_index(
        'ix_partido_notas_partido_estado',
        'partido_notas',
        ['partido_id', 'estado'],
    )


def downgrade() -> None:
    op.drop_index('ix_partido_notas_partido_estado', table_name='partido_notas')
    op.drop_table('partido_notas')
