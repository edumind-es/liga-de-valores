#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""Los Cinco Mundos como dominio: columna mundo en criterios_evaluacion.

Migración ADITIVA y reversible: columna nullable, sin defaults que
reescriban datos y sin tocar filas existentes (los criterios antiguos
quedan sin mundo asignado hasta que el docente los etiquete).

Revision ID: 030_add_mundo_criterios
Revises: 029_add_partido_notas
Create Date: 2026-07-14
"""
from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = '030_add_mundo_criterios'
down_revision: Union[str, None] = '029_add_partido_notas'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Valores posibles: fisico, mental, emocional, social, interior (o NULL)
    op.add_column(
        'criterios_evaluacion',
        sa.Column('mundo', sa.String(12), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('criterios_evaluacion', 'mundo')
