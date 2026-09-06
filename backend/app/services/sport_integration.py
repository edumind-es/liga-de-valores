#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""
Integración de una propuesta de deporte en el catálogo.

Convierte una SportProposal aprobada en un TipoDeporte listo para usar:
código único, configuración del marcador (reglas, tiempos, puntuación),
logo transferido y la propuesta marcada como aprobada. Todo en una
operación, para que el administrador solo tenga que validar.
"""
import shutil
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.sport_proposal import SportProposal
from app.models.tipo_deporte import TipoDeporte
from app.utils.text import slugify


async def _codigo_unico(db: AsyncSession, nombre: str, override: str | None) -> str:
    """Slug único a partir del nombre (o del override), con sufijo si colisiona."""
    base = slugify(override or nombre) or "deporte"
    codigo = base
    i = 2
    while True:
        existe = await db.execute(select(TipoDeporte).where(TipoDeporte.codigo == codigo))
        if existe.scalar_one_or_none() is None:
            return codigo
        codigo = f"{base}-{i}"
        i += 1


def _transferir_logo(logo_filename: str | None, codigo: str) -> str | None:
    """
    Copia el logo de la propuesta al almacén de deportes y devuelve su ruta
    pública. Si el origen no existe, no bloquea la integración (logo opcional).
    """
    if not logo_filename:
        return None
    origen = Path(settings.UPLOAD_DIR) / Path(logo_filename)
    if not origen.exists():
        return None

    destino_dir = Path(settings.UPLOAD_DIR) / "sports"
    destino_dir.mkdir(parents=True, exist_ok=True)
    ext = origen.suffix.lstrip(".") or "webp"
    destino = destino_dir / f"{codigo}_logo.{ext}"
    try:
        shutil.copyfile(origen, destino)
    except OSError:
        return None
    return f"/static/uploads/sports/{codigo}_logo.{ext}"


async def integrar_propuesta(
    proposal: SportProposal,
    db: AsyncSession,
    *,
    codigo: str | None = None,
    tipo_marcador: str | None = None,
    icono: str | None = None,
    permite_empate: bool | None = None,
    config: dict | None = None,
) -> TipoDeporte:
    """
    Crea el TipoDeporte desde la propuesta y la marca como aprobada.
    Los parámetros con nombre permiten al admin ajustar antes de validar;
    si se omiten, se toman de la propuesta.

    Lanza ValueError si la propuesta ya fue integrada (idempotencia).
    """
    if proposal.status == "approved":
        raise ValueError("La propuesta ya está aprobada e integrada.")

    # El nombre del deporte es único en el catálogo
    nombre_existe = await db.execute(select(TipoDeporte).where(TipoDeporte.nombre == proposal.nombre))
    if nombre_existe.scalar_one_or_none() is not None:
        raise ValueError(f"Ya existe un deporte con el nombre '{proposal.nombre}'.")

    codigo_final = await _codigo_unico(db, proposal.nombre, codigo)

    # La config del marcador (reglas, tiempos, puntuación) sale de la propuesta;
    # permite_empate puede venir dentro de config_sugerida
    config_final = config if config is not None else (proposal.config_sugerida or {})
    if permite_empate is None:
        cfg = proposal.config_sugerida or {}
        permite_empate = bool(cfg.get("permite_empate", True))

    logo_public = _transferir_logo(proposal.logo_filename, codigo_final)

    deporte = TipoDeporte(
        nombre=proposal.nombre,
        codigo=codigo_final,
        tipo_marcador=tipo_marcador or proposal.tipo_marcador,
        permite_empate=permite_empate,
        config=config_final,
        descripcion=proposal.descripcion,
        icono=icono or "🏆",
        logo_file=logo_public,
    )
    db.add(deporte)

    proposal.status = "approved"

    await db.commit()
    await db.refresh(deporte)
    return deporte
