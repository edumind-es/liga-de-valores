#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
"""Falla si algún modelo usa una tabla o columna que las migraciones no crean.

Se ejecuta tras `alembic upgrade head` sobre una base de datos vacía (CI y
modo aula). Solo mira tablas y columnas que faltan: los índices y las tablas
de más no rompen la app y en producción tienen nombres históricos.

Uso: DATABASE_URL=postgresql+asyncpg://... python scripts/check_schema_models.py
"""
from __future__ import annotations

import asyncio
import importlib
import pkgutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

import app.models  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402


def _importar_todos_los_modelos() -> None:
    # Algunos modelos no están en app/models/__init__.py; se importan todos
    # para que ninguna tabla se quede fuera de la comprobación.
    for modulo in pkgutil.iter_modules(app.models.__path__):
        importlib.import_module(f"app.models.{modulo.name}")


def _leer_esquema(conn) -> dict[str, set[str]]:
    inspector = inspect(conn)
    return {
        tabla: {col["name"] for col in inspector.get_columns(tabla)}
        for tabla in inspector.get_table_names()
    }


async def main() -> int:
    _importar_todos_los_modelos()
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        esquema = await conn.run_sync(_leer_esquema)
    await engine.dispose()

    faltan: list[str] = []
    for tabla in Base.metadata.sorted_tables:
        if tabla.name not in esquema:
            faltan.append(f"tabla {tabla.name}")
            continue
        for columna in tabla.columns:
            if columna.name not in esquema[tabla.name]:
                faltan.append(f"columna {tabla.name}.{columna.name}")

    if faltan:
        print("Los modelos usan elementos que ninguna migración crea:")
        for elemento in faltan:
            print(f"  - {elemento}")
        print("Añade una migración de Alembic que los cree.")
        return 1

    print(f"Esquema completo: {len(Base.metadata.tables)} tablas de los modelos presentes tras las migraciones.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
