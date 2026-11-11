#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
"""Columnas que existían en los modelos pero ninguna migración creaba

ligas.config, tipos_deporte.vt_file y tipos_deporte.logo_file se añadieron en
producción a mano (scripts/update_ligas_schema.py y
scripts/update_tipos_deporte_schema.py); las dos de sport_proposals, sin
script. Una base de datos nueva, como la del modo aula, se quedaba sin ellas y
la app fallaba al listar deportes, crear ligas o proponer deportes.
IF NOT EXISTS hace que en producción, donde ya están, no cambie nada.

También se corrige el CHECK de estado de sport_proposals (ver upgrade).

Revision ID: 031_columnas_sin_migracion
Revises: 030_add_mundo_criterios
Create Date: 2026-11-11
"""
from typing import Sequence, Union

from alembic import op


revision: str = '031_columnas_sin_migracion'
down_revision: Union[str, None] = '030_add_mundo_criterios'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Mismas definiciones que los scripts manuales que se usaron en producción
    op.execute("ALTER TABLE ligas ADD COLUMN IF NOT EXISTS config JSON DEFAULT '{}'")
    op.execute("ALTER TABLE tipos_deporte ADD COLUMN IF NOT EXISTS vt_file VARCHAR(255)")
    op.execute("ALTER TABLE tipos_deporte ADD COLUMN IF NOT EXISTS logo_file VARCHAR(255)")
    # Propuestas de deporte: tampoco había migración ni script para estas dos
    op.execute("ALTER TABLE sport_proposals ADD COLUMN IF NOT EXISTS caracteristicas_adicionales TEXT")
    op.execute("ALTER TABLE sport_proposals ADD COLUMN IF NOT EXISTS logo_filename VARCHAR")
    # La 017 crea en instalaciones nuevas un CHECK que solo admite estados en
    # mayúsculas, pero la app guarda 'pending', 'approved' y 'rejected'. Se
    # sustituye por uno que no distingue mayúsculas: ninguna fila existente
    # puede incumplirlo, haya en la tabla un formato, el otro o ambos.
    op.execute("ALTER TABLE sport_proposals DROP CONSTRAINT IF EXISTS sport_proposals_status_check")
    op.execute(
        "ALTER TABLE sport_proposals ADD CONSTRAINT sport_proposals_status_check "
        "CHECK (upper(status) IN ('PENDING', 'APPROVED', 'REJECTED'))"
    )


def downgrade() -> None:
    # No se borran: en producción estas columnas son anteriores a esta
    # migración y tienen datos; quitarlas al bajar de versión los perdería.
    pass
