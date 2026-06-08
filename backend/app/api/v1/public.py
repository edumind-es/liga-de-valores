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
API endpoints for Public Access (QR/PIN).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError
from datetime import datetime, timezone
from datetime import timedelta
from pydantic import BaseModel, constr
from typing import Any, Optional, Literal

from app.database import get_db
from app.models import Liga, Jornada, Partido, Equipo
from app.models.pending_action import PendingAction
from app.models.partido_nota import PartidoNota
from app.schemas import PublicLogin, Token, LigaPublicResponse
from app.utils.security import create_access_token
from app.config import settings
from app.services.clasificacion_service import ClasificacionService
from app.core.rate_limit import limiter

router = APIRouter()
PUBLIC_PIN_LENGTH = 6

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/public/login")

async def get_public_token_payload(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("scope") != "public":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token scope",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _normalize_pin(pin: str | None) -> str | None:
    if not pin:
        return None
    normalized = pin.strip()
    if len(normalized) != PUBLIC_PIN_LENGTH or not normalized.isdigit():
        return None
    return normalized

@router.post("/login", response_model=Token)
@limiter.limit("8/minute")
async def public_login(
    request: Request,
    login_data: PublicLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login público con PIN de liga.
    """
    liga = await db.get(Liga, login_data.liga_id)
    
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    
    if not liga.public_pin:
        raise HTTPException(status_code=400, detail="Esta liga no tiene acceso público habilitado")

    pin = _normalize_pin(login_data.pin)
    if not pin:
        raise HTTPException(status_code=400, detail="Formato de PIN inválido")

    if liga.public_pin != pin:
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    
    # Create token
    access_token_expires = timedelta(minutes=60 * 24) # 24 hours
    access_token = create_access_token(
        data={"sub": "public", "liga_id": liga.id, "scope": "public"},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/find-by-pin")
@limiter.limit("20/minute")
async def find_league_by_pin(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Encontrar una liga por su PIN público.
    """
    pin = _normalize_pin(data.get("pin"))
    if not pin:
        raise HTTPException(status_code=400, detail="PIN requerido o inválido")
        
    result = await db.execute(
        select(Liga).where(Liga.public_pin == pin).where(Liga.activa == True)
    )
    liga = result.scalars().first()
    
    if not liga:
        raise HTTPException(status_code=404, detail="No se encontró ninguna liga activa con este PIN")
        
    return {"liga_id": liga.id}

@router.get("/ligas/{liga_id}", response_model=LigaPublicResponse)
async def get_public_liga(
    liga_id: int,
    payload: dict = Depends(get_public_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener datos básicos de la liga (vista pública).
    """
    if payload.get("liga_id") != liga_id:
        raise HTTPException(status_code=403, detail="Token no válido para esta liga")
        
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
        
    return liga

@router.get("/ligas/{liga_id}/clasificacion")
async def get_public_clasificacion(
    liga_id: int,
    payload: dict = Depends(get_public_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener clasificación pública.
    """
    if payload.get("liga_id") != liga_id:
        raise HTTPException(status_code=403, detail="Token no válido para esta liga")
        
    clasificacion = await ClasificacionService.calcular_clasificacion(liga_id, db)
    return {"clasificacion": clasificacion}

@router.get("/ligas/{liga_id}/jornadas")
async def get_public_jornadas(
    liga_id: int,
    payload: dict = Depends(get_public_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener jornadas y partidos (vista pública).
    """
    if payload.get("liga_id") != liga_id:
        raise HTTPException(status_code=403, detail="Token no válido para esta liga")
        
    # Obtener jornadas
    result = await db.execute(
        select(Jornada).where(Jornada.liga_id == liga_id).order_by(Jornada.numero)
    )
    jornadas = result.scalars().all()
    
    # Obtener partidos (podría optimizarse con join)
    result_partidos = await db.execute(
        select(Partido)
        .where(Partido.liga_id == liga_id)
        .options(selectinload(Partido.tipo_deporte))
    )
    partidos = result_partidos.scalars().all()
    
    # Estructurar respuesta
    jornadas_data = []
    for jornada in jornadas:
        j_partidos = [p for p in partidos if p.jornada_id == jornada.id]
        partidos_data = []
        for partido in j_partidos:
            marcador_local, marcador_visitante = partido.extraer_marcador_deportivo()
            partidos_data.append({
                "id": partido.id,
                "jornada_id": partido.jornada_id,
                "equipo_local_id": partido.equipo_local_id,
                "equipo_visitante_id": partido.equipo_visitante_id,
                "finalizado": partido.finalizado,
                "puntos_local": partido.puntos_local,
                "puntos_visitante": partido.puntos_visitante,
                "marcador_local": marcador_local,
                "marcador_visitante": marcador_visitante,
            })

        jornadas_data.append({
            "id": jornada.id,
            "nombre": jornada.nombre,
            "numero": jornada.numero,
            "fecha_inicio": jornada.fecha_inicio,
            "partidos": partidos_data
        })

    return jornadas_data


# ---------------------------------------------------------------------------
# Acceso de alumnos a partidos via PIN
# ---------------------------------------------------------------------------

class MarcadorSubmit(BaseModel):
    marcador: dict[str, Any]
    evaluacion: dict[str, Any] | None = None
    observaciones: str | None = None


def _validate_public_marcador_value(value: Any, *, path: str, depth: int = 0) -> None:
    if depth > 2:
        raise HTTPException(status_code=422, detail=f"Valor inválido para '{path}': estructura demasiado profunda")

    if value is None:
        return

    if isinstance(value, bool):
        return

    if isinstance(value, (int, float)):
        if value < 0:
            raise HTTPException(status_code=422, detail=f"Valor inválido para '{path}': debe ser positivo")
        return

    if isinstance(value, str):
        if len(value) > 32:
            raise HTTPException(status_code=422, detail=f"Valor inválido para '{path}': texto demasiado largo")
        return

    if isinstance(value, list):
        if len(value) > 12:
            raise HTTPException(status_code=422, detail=f"Valor inválido para '{path}': lista demasiado larga")
        for idx, item in enumerate(value):
            _validate_public_marcador_value(item, path=f"{path}[{idx}]", depth=depth + 1)
        return

    if isinstance(value, dict):
        if len(value) > 24:
            raise HTTPException(status_code=422, detail=f"Valor inválido para '{path}': objeto demasiado grande")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 64:
                raise HTTPException(status_code=422, detail=f"Clave inválida en '{path}'")
            _validate_public_marcador_value(item, path=f"{path}.{key}", depth=depth + 1)
        return

    raise HTTPException(status_code=422, detail=f"Valor inválido para '{path}'")


PUBLIC_EVALUACION_LIMITS: dict[str, tuple[float, float]] = {
    "puntos_juego_limpio_local": (0, 1),
    "puntos_juego_limpio_visitante": (0, 1),
    "cumple_minimos_local": (0, 1),
    "cumple_minimos_visitante": (0, 1),
    "arbitro_conocimiento": (0, 10),
    "arbitro_gestion": (0, 10),
    "arbitro_apoyo": (0, 10),
    "grada_animar_local": (0, 4),
    "grada_respeto_local": (0, 4),
    "grada_participacion_local": (0, 4),
    "grada_animar_visitante": (0, 4),
    "grada_respeto_visitante": (0, 4),
    "grada_participacion_visitante": (0, 4),
}


def _normalize_public_evaluacion(evaluacion: dict[str, Any] | None) -> dict[str, Any]:
    if not evaluacion:
        return {}

    normalized: dict[str, Any] = {}
    for key, value in evaluacion.items():
        if key not in PUBLIC_EVALUACION_LIMITS:
            continue

        minimum, maximum = PUBLIC_EVALUACION_LIMITS[key]
        if isinstance(value, bool):
            numeric_value = 1 if value else 0
        elif isinstance(value, (int, float)):
            numeric_value = value
        else:
            raise HTTPException(status_code=422, detail=f"Valor inválido para '{key}'")

        if numeric_value < minimum or numeric_value > maximum:
            raise HTTPException(status_code=422, detail=f"Valor fuera de rango para '{key}'")

        normalized[key] = int(numeric_value)

    return normalized


@router.get("/partido/{pin}")
@limiter.limit("30/minute")
async def get_partido_by_pin(
    request: Request,
    pin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener datos del partido mediante su PIN de 6 dígitos.
    Endpoint público — no requiere autenticación.
    """
    normalized = _normalize_pin(pin)
    if not normalized:
        raise HTTPException(status_code=400, detail="PIN inválido (debe tener 6 dígitos)")

    result = await db.execute(
        select(Partido)
        .where(Partido.pin == normalized)
        .options(
            selectinload(Partido.tipo_deporte),
            selectinload(Partido.equipo_local),
            selectinload(Partido.equipo_visitante),
            selectinload(Partido.arbitro),
            selectinload(Partido.tutor_grada_local),
            selectinload(Partido.tutor_grada_visitante),
            selectinload(Partido.liga),
        )
    )
    partido = result.scalar_one_or_none()

    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    # Respetar ventana de validez si está configurada
    if partido.pin_valid_until:
        now = datetime.now(timezone.utc)
        if now > partido.pin_valid_until:
            raise HTTPException(status_code=410, detail="El acceso a este partido ha expirado")

    if partido.finalizado:
        raise HTTPException(status_code=400, detail="Este partido ya está finalizado")

    marcador_local, marcador_visitante = partido.extraer_marcador_deportivo()

    # Comprobar si hay una propuesta de marcador pendiente para mostrar al alumno
    pending_result = await db.execute(
        select(PendingAction).where(
            and_(
                PendingAction.action_type == "marcador_partido",
                PendingAction.target_id == partido.id,
                PendingAction.status == "pending",
            )
        ).order_by(PendingAction.created_at.desc()).limit(1)
    )
    pending = pending_result.scalar_one_or_none()

    return {
        "id": partido.id,
        "liga_nombre": partido.liga.nombre,
        "liga_id": partido.liga_id,
        "modo_evaluacion": partido.liga.modo_evaluacion,
        "equipo_local": partido.equipo_local.nombre,
        "equipo_visitante": partido.equipo_visitante.nombre,
        "arbitro_nombre": partido.arbitro.nombre if partido.arbitro else None,
        "tutor_grada_local_nombre": partido.tutor_grada_local.nombre if partido.tutor_grada_local else None,
        "tutor_grada_visitante_nombre": partido.tutor_grada_visitante.nombre if partido.tutor_grada_visitante else None,
        "tipo_deporte": {
            "nombre": partido.tipo_deporte.nombre,
            "tipo_marcador": partido.tipo_deporte.tipo_marcador,
            "config": partido.tipo_deporte.config or {},
        },
        "marcador_actual": partido.marcador or {},
        "marcador_local": marcador_local,
        "marcador_visitante": marcador_visitante,
        "marcador_pendiente": pending.data_json.get("marcador") if pending else None,
        "evaluacion_pendiente": pending.data_json.get("evaluacion") if pending else None,
        "hay_propuesta_pendiente": pending is not None,
        "aviso_datos": (
            "Los nombres mostrados corresponden a equipos, no a personas. "
            "No utilices nombres reales de alumnos menores de edad como nombre de equipo. "
            "EDUmind no es responsable del uso de datos personales introducidos por el docente."
        ),
    }


@router.post("/partido/{pin}/marcador", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def submit_marcador_via_pin(
    request: Request,
    pin: str,
    body: MarcadorSubmit,
    db: AsyncSession = Depends(get_db)
):
    """
    Enviar marcador propuesto por alumnos.
    Crea (o actualiza) una acción pendiente de verificación docente.
    """
    normalized = _normalize_pin(pin)
    if not normalized:
        raise HTTPException(status_code=400, detail="PIN inválido (debe tener 6 dígitos)")

    result = await db.execute(
        select(Partido)
        .where(Partido.pin == normalized)
        .options(
            selectinload(Partido.tipo_deporte),
            selectinload(Partido.equipo_local),
            selectinload(Partido.equipo_visitante),
            selectinload(Partido.arbitro),
            selectinload(Partido.tutor_grada_local),
            selectinload(Partido.tutor_grada_visitante),
            selectinload(Partido.liga),
        )
    )
    partido = result.scalar_one_or_none()

    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    if partido.pin_valid_until:
        now = datetime.now(timezone.utc)
        if now > partido.pin_valid_until:
            raise HTTPException(status_code=410, detail="El acceso a este partido ha expirado")

    if partido.finalizado:
        raise HTTPException(status_code=400, detail="Este partido ya está finalizado")

    # Validación básica del marcador
    marcador = body.marcador
    if not isinstance(marcador, dict) or not marcador:
        raise HTTPException(status_code=422, detail="El marcador debe ser un objeto")
    if len(marcador) > 64:
        raise HTTPException(status_code=422, detail="El marcador contiene demasiados campos")
    for key, val in marcador.items():
        if not isinstance(key, str) or len(key) > 64:
            raise HTTPException(status_code=422, detail="El marcador contiene una clave inválida")
        _validate_public_marcador_value(val, path=key)

    evaluacion = _normalize_public_evaluacion(body.evaluacion)
    observaciones = (body.observaciones or "").strip()
    if len(observaciones) > 500:
        raise HTTPException(status_code=422, detail="Las observaciones son demasiado largas")

    data_json = {
        "marcador": marcador,
        "evaluacion": evaluacion,
        "observaciones": observaciones or None,
        "cumple_minimos": {
            "local": bool(evaluacion.get("cumple_minimos_local")),
            "visitante": bool(evaluacion.get("cumple_minimos_visitante")),
        },
        "equipo_local": partido.equipo_local.nombre,
        "equipo_visitante": partido.equipo_visitante.nombre,
        "arbitro": partido.arbitro.nombre if partido.arbitro else None,
        "tutor_grada_local": partido.tutor_grada_local.nombre if partido.tutor_grada_local else None,
        "tutor_grada_visitante": partido.tutor_grada_visitante.nombre if partido.tutor_grada_visitante else None,
        "tipo_deporte": partido.tipo_deporte.nombre,
    }
    description = (
        f"Marcador propuesto por alumnos: "
        f"{partido.equipo_local.nombre} vs {partido.equipo_visitante.nombre}"
    )

    # Upsert: si ya hay una propuesta pendiente, actualizarla en vez de duplicar
    pending_result = await db.execute(
        select(PendingAction).where(
            and_(
                PendingAction.action_type == "marcador_partido",
                PendingAction.target_id == partido.id,
                PendingAction.status == "pending",
            )
        ).limit(1)
    )
    existing = pending_result.scalar_one_or_none()

    if existing:
        existing.data_json = data_json
        existing.description = description
        await db.commit()
        pending_id = existing.id
    else:
        pending = PendingAction(
            action_type="marcador_partido",
            status="pending",
            liga_id=partido.liga_id,
            target_id=partido.id,
            data_json=data_json,
            description=description,
        )
        db.add(pending)
        await db.commit()
        await db.refresh(pending)
        pending_id = pending.id

    return {
        "message": "Marcador enviado correctamente. El/la docente verificará el resultado.",
        "pending_id": pending_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Anotaciones de partido vía PIN — envío público anónimo
# LOPD/RGPD: sin datos personales, moderación previa docente obligatoria
# ─────────────────────────────────────────────────────────────────────────────

class NotaPublicaCreate(BaseModel):
    contenido: str  # validación de longitud en endpoint
    tipo: Optional[Literal["observacion", "incidencia", "evidencia"]] = "observacion"
    consentimiento_lopd: bool  # el alumno debe confirmar explícitamente


@router.post("/partido/{pin}/nota", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def submit_nota_via_pin(
    request: Request,
    pin: str,
    body: NotaPublicaCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Enviar una anotación anónima de partido vía PIN.

    LOPD/RGPD — datos almacenados:
    - Texto libre de la anotación (sin nombre, sin IP, sin identificador del alumno).
    - Tipo pedagógico y timestamp de creación.
    - La nota queda en estado 'pendiente' hasta que el docente la apruebe o rechace.
    - Las notas rechazadas o no revisadas en 30 días se eliminan automáticamente.
    """
    if not body.consentimiento_lopd:
        raise HTTPException(
            status_code=422,
            detail="Debes confirmar que entiendes que la anotación es anónima y será revisada por el docente.",
        )

    contenido = body.contenido.strip()
    if not contenido:
        raise HTTPException(status_code=422, detail="El contenido no puede estar vacío.")
    if len(contenido) > 500:
        raise HTTPException(status_code=422, detail="El contenido no puede superar los 500 caracteres.")

    normalized = _normalize_pin(pin)
    if not normalized:
        raise HTTPException(status_code=400, detail="PIN inválido (debe tener 6 dígitos)")

    result = await db.execute(
        select(Partido).where(Partido.pin == normalized)
    )
    partido = result.scalar_one_or_none()

    if not partido:
        raise HTTPException(status_code=404, detail="PIN de partido no encontrado o caducado")
    if partido.finalizado:
        raise HTTPException(status_code=400, detail="Este partido ya está finalizado. No se admiten más anotaciones.")

    nota = PartidoNota(
        partido_id=partido.id,
        contenido=contenido,
        tipo=body.tipo or "observacion",
        origen="publico",
        estado="pendiente",
    )
    db.add(nota)
    await db.commit()

    return {
        "message": "Anotación enviada correctamente. El/la docente la revisará antes de hacerla visible.",
        "tipo": nota.tipo,
    }
