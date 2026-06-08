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

import secrets
from datetime import datetime, timezone
from typing import List, Optional, Iterable
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.responses import Response
from app.core.rate_limit import limiter
from fastapi.responses import JSONResponse  # Response ya importado arriba
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Partido, Liga, Equipo, TipoDeporte, Jornada, User
from app.models.partido_nota import PartidoNota
from app.models.evaluacion_personalizada import EvaluacionPersonalizada
from app.models.criterio_evaluacion import CriterioEvaluacion
from app.schemas.partido import (
    PartidoCreate, 
    PartidoResponse, 
    PartidoDetailed, 
    PartidoUpdateMarcador, 
    PartidoUpdateEvaluacion
)
from app.schemas.criterio_evaluacion import EvaluacionPersonalizadaCreate
from app.api.v1.auth import get_current_user
from app.services.clasificacion_service import ClasificacionService
from app.services.league_teacher_access import (
    OPEN_MATCHES,
    VALIDATE_MATCHES,
    VIEW_MATCHES,
    VIEW_RESULTS,
    ensure_liga_permission,
    list_accessible_liga_ids,
)
from app.services.match_role_schema_service import force_lock_schema, get_or_create_match_role_schema
from app.utils.versioning import stable_hash


def _evaluacion_personalizada_version(evaluaciones: List[EvaluacionPersonalizada]) -> str:
    payload = [
        {
            "criterio_id": e.criterio_id,
            "equipo_id": e.equipo_id,
            "valor": e.valor,
        }
        for e in evaluaciones
    ]
    payload.sort(key=lambda x: (x["criterio_id"], -1 if x["equipo_id"] is None else x["equipo_id"], x["valor"]))
    return stable_hash(payload)


def _is_classic_evaluacion_completa(partido: Partido) -> bool:
    if partido.puntos_juego_limpio_local is None or partido.puntos_juego_limpio_visitante is None:
        return False

    if partido.arbitro_id:
        if any(
            value is None
            for value in (
                partido.arbitro_conocimiento,
                partido.arbitro_gestion,
                partido.arbitro_apoyo,
            )
        ):
            return False

    if partido.tutor_grada_local_id:
        if any(
            value is None
            for value in (
                partido.grada_animar_local,
                partido.grada_respeto_local,
                partido.grada_participacion_local,
            )
        ):
            return False

    if partido.tutor_grada_visitante_id:
        if any(
            value is None
            for value in (
                partido.grada_animar_visitante,
                partido.grada_respeto_visitante,
                partido.grada_participacion_visitante,
            )
        ):
            return False

    return True


def _is_personalizada_completa(
    partido: Partido,
    criterios: Iterable[CriterioEvaluacion],
    evaluaciones: Iterable[EvaluacionPersonalizada],
) -> bool:
    criterios_list = list(criterios)
    if not criterios_list:
        return True

    evals = list(evaluaciones)
    eval_pairs = {(e.criterio_id, e.equipo_id) for e in evals}

    for criterio in criterios_list:
        if criterio.categoria == 'grada_local':
            if (criterio.id, partido.equipo_local_id) not in eval_pairs:
                return False
        elif criterio.categoria == 'grada_visitante':
            if (criterio.id, partido.equipo_visitante_id) not in eval_pairs:
                return False
        else:
            if not any(e.criterio_id == criterio.id for e in evals):
                return False

    return True


async def _refresh_evaluacion_completa(partido: Partido, db: AsyncSession) -> bool:
    if partido.liga.modo_evaluacion == 'personalizado':
        criterios_result = await db.execute(
            select(CriterioEvaluacion)
            .where(CriterioEvaluacion.liga_id == partido.liga_id)
            .where(CriterioEvaluacion.activo == True)
        )
        criterios = criterios_result.scalars().all()
        evaluaciones = partido.evaluaciones_personalizadas or []
        partido.evaluacion_completa = _is_personalizada_completa(partido, criterios, evaluaciones)
    else:
        partido.evaluacion_completa = _is_classic_evaluacion_completa(partido)

    return partido.evaluacion_completa

async def _build_criterios_con_valores(partido: Partido, db: AsyncSession):
    criterios_result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == partido.liga_id)
        .where(CriterioEvaluacion.activo == True)
        .order_by(CriterioEvaluacion.orden)
    )
    criterios = criterios_result.scalars().all()

    evaluaciones_map = {
        (e.criterio_id, e.equipo_id): e.valor
        for e in partido.evaluaciones_personalizadas
    }

    criterios_con_valores = []
    for c in criterios:
        criterio_data = {
            "id": c.id,
            "nombre": c.nombre,
            "codigo": c.codigo,
            "categoria": c.categoria,
            "escala_min": c.escala_min,
            "escala_max": c.escala_max,
            "icono": c.icono,
            "valor": evaluaciones_map.get((c.id, None), None)
        }

        if c.categoria in ['grada_local', 'grada_visitante']:
            equipo_id = partido.equipo_local_id if c.categoria == 'grada_local' else partido.equipo_visitante_id
            criterio_data["valor"] = evaluaciones_map.get((c.id, equipo_id), None)
            criterio_data["equipo_id"] = equipo_id

        criterios_con_valores.append(criterio_data)

    return criterios_con_valores

router = APIRouter()

@router.post("/", response_model=PartidoResponse, status_code=status.HTTP_201_CREATED)
async def create_partido(
    partido: PartidoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crear un nuevo partido.
    Solo el propietario de la liga puede crear partidos.
    """
    # Verificar liga y permisos
    result = await db.execute(select(Liga).filter(Liga.id == partido.liga_id))
    liga = result.scalar_one_or_none()
    
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    
    await ensure_liga_permission(
        db,
        liga,
        current_user,
        OPEN_MATCHES,
        forbidden_detail="No tienes permisos para crear partidos en esta liga",
    )

    schema = await force_lock_schema(db, liga)
    total_teams_in_liga = await db.scalar(
        select(func.count()).select_from(Equipo).where(Equipo.liga_id == partido.liga_id)
    )
    enforce_schema_roles = (total_teams_in_liga or 0) >= schema.roles_per_match

    required_support_by_format = {
        3: ["arbitro_id"],
        4: ["arbitro_id", "tutor_grada_local_id"],
        5: ["arbitro_id", "tutor_grada_local_id", "tutor_grada_visitante_id"],
    }
    if enforce_schema_roles:
        for required_field in required_support_by_format.get(schema.roles_per_match, []):
            if getattr(partido, required_field) is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"Formato de liga requiere campo '{required_field}'",
                )

        if schema.roles_per_match <= 4 and partido.tutor_grada_visitante_id is not None:
            raise HTTPException(status_code=422, detail="Formato actual no permite tutor_grada_visitante_id")
        if schema.roles_per_match <= 3 and partido.tutor_grada_local_id is not None:
            raise HTTPException(status_code=422, detail="Formato actual no permite tutor_grada_local_id")
    
    # Verificar equipos
    team_ids = [
        partido.equipo_local_id,
        partido.equipo_visitante_id,
        partido.arbitro_id,
        partido.tutor_grada_local_id,
        partido.tutor_grada_visitante_id,
    ]
    team_ids = [team_id for team_id in team_ids if team_id is not None]
    result = await db.execute(
        select(Equipo).filter(Equipo.id.in_(team_ids))
    )
    equipos = result.scalars().all()
    if len(equipos) != len(set(team_ids)):
        raise HTTPException(status_code=404, detail="Uno o ambos equipos no existen")
    
    # Verificar que equipos pertenecen a la liga
    for equipo in equipos:
        if equipo.liga_id != partido.liga_id:
            raise HTTPException(status_code=400, detail=f"El equipo {equipo.nombre} no pertenece a esta liga")
            
    # Crear partido
    db_partido = Partido(**partido.model_dump())
    db.add(db_partido)
    await db.commit()
    await db.refresh(db_partido)
    
    return db_partido

@router.get("/", response_model=List[PartidoDetailed])
async def read_partidos(
    liga_id: Optional[int] = None,
    jornada_id: Optional[int] = None,
    equipo_id: Optional[int] = None,
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Listar partidos con filtros opcionales. Solo devuelve partidos de ligas propias.
    """
    query = select(Partido).options(
        selectinload(Partido.tipo_deporte),
        selectinload(Partido.equipo_local),
        selectinload(Partido.equipo_visitante),
        selectinload(Partido.arbitro),
        selectinload(Partido.tutor_grada_local),
        selectinload(Partido.tutor_grada_visitante)
    ).join(Liga, Partido.liga_id == Liga.id)

    accessible_ids = await list_accessible_liga_ids(db, current_user, VIEW_MATCHES)
    if accessible_ids is not None:
        if not accessible_ids:
            return []
        query = query.filter(Partido.liga_id.in_(accessible_ids))

    if liga_id:
        query = query.filter(Partido.liga_id == liga_id)

    if jornada_id:
        query = query.filter(Partido.jornada_id == jornada_id)

    if equipo_id:
        query = query.filter(
            or_(
                Partido.equipo_local_id == equipo_id,
                Partido.equipo_visitante_id == equipo_id
            )
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    partidos = result.scalars().all()

    return partidos

@router.get("/{partido_id}", response_model=PartidoDetailed)
async def read_partido(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener detalles de un partido. Requiere ser propietario de la liga.
    """
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.tipo_deporte),
        selectinload(Partido.equipo_local),
        selectinload(Partido.equipo_visitante),
        selectinload(Partido.arbitro),
        selectinload(Partido.tutor_grada_local),
        selectinload(Partido.tutor_grada_visitante),
        selectinload(Partido.evaluaciones_personalizadas),
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()

    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        VIEW_MATCHES,
        forbidden_detail="No tienes permisos para ver este partido",
    )

    if not partido.finalizado and not partido.evaluacion_completa:
        await _refresh_evaluacion_completa(partido, db)
        await db.commit()
        await db.refresh(partido)

    return partido

@router.put("/{partido_id}/marcador", response_model=PartidoResponse)
async def update_marcador(
    partido_id: int,
    marcador_update: PartidoUpdateMarcador,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar el marcador de un partido.
    Calcula automáticamente los puntos y resultado.
    """
    # Obtener partido con relaciones necesarias para validación
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.tipo_deporte),
        selectinload(Partido.evaluaciones_personalizadas)
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()
    
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
        
    # Verificar permisos
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        OPEN_MATCHES,
        forbidden_detail="No tienes permisos para editar este partido",
    )

    # Control de conflictos
    current_version = partido.marcador_version
    if not marcador_update.expected_version:
        return JSONResponse(
            status_code=409,
            content={
                "message": "Conflicto de marcador: falta expected_version para guardar.",
                "serverData": {
                    "id": partido.id,
                    "marcador": partido.marcador or {},
                    "marcador_version": current_version,
                },
            },
        )
    if marcador_update.expected_version != current_version:
        return JSONResponse(
            status_code=409,
            content={
                "message": "Conflicto de marcador: el servidor tiene una versión más reciente.",
                "serverData": {
                    "id": partido.id,
                    "marcador": partido.marcador or {},
                    "marcador_version": current_version,
                },
            },
        )
        
    # Actualizar marcador
    partido.marcador = marcador_update.marcador
    # NO marcar como finalizado automáticamente - el usuario debe usar /finalizar
    
    # Calcular puntos
    partido.calcular_puntos_desde_marcador()
    
    await db.commit()
    await db.refresh(partido)
    
    # Actualizar estadísticas de equipos (throttled)
    await ClasificacionService.schedule_stats_updates(
        [
            partido.equipo_local_id,
            partido.equipo_visitante_id,
            partido.arbitro_id,
            partido.tutor_grada_local_id,
            partido.tutor_grada_visitante_id,
        ],
        throttle_seconds=5
    )
    
    return partido

@router.put("/{partido_id}/evaluacion", response_model=PartidoResponse)
async def update_evaluacion(
    partido_id: int,
    evaluacion: PartidoUpdateEvaluacion,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar evaluación educativa (juego limpio, árbitro, grada).
    """
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga)
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()
    
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
        
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        VALIDATE_MATCHES,
        forbidden_detail="No tienes permisos para editar este partido",
    )
        
    # Actualizar campos proporcionados
    update_data = evaluacion.model_dump(exclude_unset=True)
    expected_version = update_data.pop("expected_version", None)
    current_version = partido.evaluacion_version
    if not expected_version:
        return JSONResponse(
            status_code=409,
            content={
                "message": "Conflicto de evaluación: falta expected_version para guardar.",
                "serverData": {
                    "id": partido.id,
                    "puntos_juego_limpio_local": partido.puntos_juego_limpio_local,
                    "puntos_juego_limpio_visitante": partido.puntos_juego_limpio_visitante,
                    "arbitro_conocimiento": partido.arbitro_conocimiento,
                    "arbitro_gestion": partido.arbitro_gestion,
                    "arbitro_apoyo": partido.arbitro_apoyo,
                    "grada_animar_local": partido.grada_animar_local,
                    "grada_respeto_local": partido.grada_respeto_local,
                    "grada_participacion_local": partido.grada_participacion_local,
                    "grada_animar_visitante": partido.grada_animar_visitante,
                    "grada_respeto_visitante": partido.grada_respeto_visitante,
                    "grada_participacion_visitante": partido.grada_participacion_visitante,
                    "evaluacion_version": current_version,
                },
            },
        )
    if expected_version != current_version:
        return JSONResponse(
            status_code=409,
            content={
                "message": "Conflicto de evaluación: el servidor tiene una versión más reciente.",
                "serverData": {
                    "id": partido.id,
                    "puntos_juego_limpio_local": partido.puntos_juego_limpio_local,
                    "puntos_juego_limpio_visitante": partido.puntos_juego_limpio_visitante,
                    "arbitro_conocimiento": partido.arbitro_conocimiento,
                    "arbitro_gestion": partido.arbitro_gestion,
                    "arbitro_apoyo": partido.arbitro_apoyo,
                    "grada_animar_local": partido.grada_animar_local,
                    "grada_respeto_local": partido.grada_respeto_local,
                    "grada_participacion_local": partido.grada_participacion_local,
                    "grada_animar_visitante": partido.grada_animar_visitante,
                    "grada_respeto_visitante": partido.grada_respeto_visitante,
                    "grada_participacion_visitante": partido.grada_participacion_visitante,
                    "evaluacion_version": current_version,
                },
            },
        )
    for key, value in update_data.items():
        setattr(partido, key, value)
        
    # Calcular media árbitro si aplica
    if any(k in update_data for k in ['arbitro_conocimiento', 'arbitro_gestion', 'arbitro_apoyo']):
        vals = [
            partido.arbitro_conocimiento,
            partido.arbitro_gestion,
            partido.arbitro_apoyo
        ]
        # Filter None values
        valid_vals = [v for v in vals if v is not None]
        
        if valid_vals:
            partido.arbitro_media = sum(valid_vals) / len(valid_vals)
            # Sistema de puntuación: +2 puntos si logra evaluación positiva (>= 5)
            # Configurable via liga.config
            config = partido.liga.config or {}
            arbitro_points = config.get("arbitro_points", 2)
            partido.puntos_arbitro = arbitro_points if partido.arbitro_media >= 5 else 0
        
    # Calcular media grada local
    if any(k in update_data for k in ['grada_animar_local', 'grada_respeto_local', 'grada_participacion_local']):
        vals = [
            partido.grada_animar_local,
            partido.grada_respeto_local,
            partido.grada_participacion_local
        ]
        valid_vals = [v for v in vals if v is not None]
        if valid_vals:
            media_local = sum(valid_vals) / len(valid_vals)
            # Sistema de puntuación normalizado (escala 0-4):
            # >75% (>3) → 1 punto | 50-75% (2-3) → 0.5 puntos | <50% (<2) → 0 puntos
            config = partido.liga.config or {}
            grada_max = config.get("grada_max_points", 1)
            grada_mid = config.get("grada_mid_points", 0.5)
            
            if media_local > 3:
                partido.puntos_grada_local = grada_max
            elif media_local >= 2:
                partido.puntos_grada_local = grada_mid
            else:
                partido.puntos_grada_local = 0
            
    # Calcular media grada visitante
    if any(k in update_data for k in ['grada_animar_visitante', 'grada_respeto_visitante', 'grada_participacion_visitante']):
        vals = [
            partido.grada_animar_visitante,
            partido.grada_respeto_visitante,
            partido.grada_participacion_visitante
        ]
        valid_vals = [v for v in vals if v is not None]
        if valid_vals:
            media_visitante = sum(valid_vals) / len(valid_vals)
            # Sistema de puntuación normalizado (escala 0-4):
            # >75% (>3) → 1 punto | 50-75% (2-3) → 0.5 puntos | <50% (<2) → 0 puntos
            config = partido.liga.config or {}
            grada_max = config.get("grada_max_points", 1)
            grada_mid = config.get("grada_mid_points", 0.5)
            
            if media_visitante > 3:
                partido.puntos_grada_visitante = grada_max
            elif media_visitante >= 2:
                partido.puntos_grada_visitante = grada_mid
            else:
                partido.puntos_grada_visitante = 0

    partido.evaluacion_completa = _is_classic_evaluacion_completa(partido)

    await db.commit()
    await db.refresh(partido)
    
    # Actualizar estadísticas de equipos (throttled)
    await ClasificacionService.schedule_stats_updates(
        [
            partido.equipo_local_id,
            partido.equipo_visitante_id,
            partido.arbitro_id,
            partido.tutor_grada_local_id,
            partido.tutor_grada_visitante_id,
        ],
        throttle_seconds=5
    )
    
    return partido

@router.put("/{partido_id}/finalizar", response_model=PartidoResponse)
async def finalizar_partido(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Finalizar un partido explícitamente.
    Calcula puntos finales y actualiza clasificación.
    """
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.tipo_deporte)
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()
    
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
        
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        VALIDATE_MATCHES,
        forbidden_detail="No tienes permisos para finalizar este partido",
    )
    
    if partido.finalizado:
        raise HTTPException(status_code=400, detail="El partido ya está finalizado")

    evaluacion_ok = await _refresh_evaluacion_completa(partido, db)
    if not evaluacion_ok:
        raise HTTPException(
            status_code=400,
            detail="No se puede finalizar el partido sin completar la evaluación educativa."
        )
        
    # Marcar como finalizado
    partido.finalizado = True
    
    # Calcular puntos finales
    partido.calcular_puntos_desde_marcador()
    
    await db.commit()
    await db.refresh(partido)
    
    # Actualizar estadísticas de equipos (force)
    await ClasificacionService.schedule_stats_updates(
        [
            partido.equipo_local_id,
            partido.equipo_visitante_id,
            partido.arbitro_id,
            partido.tutor_grada_local_id,
            partido.tutor_grada_visitante_id,
        ],
        force=True
    )
    
    return partido

@router.delete("/{partido_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_partido(
    request: Request,
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Eliminar un partido.
    """
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.equipo_local),
        selectinload(Partido.equipo_visitante),
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()

    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    if not current_user.is_superuser and partido.liga.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este partido")

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        user_id=current_user.id,
        action="delete_partido",
        resource="partido",
        resource_id=partido_id,
        resource_name=f"{partido.equipo_local.nombre} vs {partido.equipo_visitante.nombre}",
        ip_address=request.client.host if request.client else None,
        details={"liga_id": partido.liga_id, "finalizado": partido.finalizado},
    )
    await db.delete(partido)
    await db.commit()

@router.get("/{partido_id}/export/acta")
async def export_acta_pdf(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exportar acta del partido a PDF.
    """
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.tipo_deporte),
        selectinload(Partido.equipo_local),
        selectinload(Partido.equipo_visitante),
        selectinload(Partido.arbitro),
        selectinload(Partido.tutor_grada_local),
        selectinload(Partido.tutor_grada_visitante),
        selectinload(Partido.evaluaciones_personalizadas)
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()
    
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
        
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        VIEW_RESULTS,
        forbidden_detail="No tienes permisos",
    )
        
    from app.services.report_service import ReportService
    from fastapi.responses import Response

    marcador_local, marcador_visitante = partido.extraer_marcador_deportivo()
    evaluacion_personalizada = None
    if partido.liga.modo_evaluacion == 'personalizado':
        evaluacion_personalizada = await _build_criterios_con_valores(partido, db)

    slot_labels = {
        "slot_3": "Arbitro",
        "slot_4": "Tutor de grada local",
        "slot_5": "Tutor de grada visitante",
    }
    schema = await get_or_create_match_role_schema(db, partido.liga, create_if_missing=False)
    if schema:
        for slot in schema.slots:
            if slot.slot_key in slot_labels and slot.role_label:
                slot_labels[slot.slot_key] = slot.role_label
    
    # Convertir objeto SQLAlchemy a dict para el servicio
    partido_dict = {
        "id": partido.id,
        "fecha_hora": partido.fecha_hora.strftime('%d/%m/%Y %H:%M') if partido.fecha_hora else None,
        "jornada_id": partido.jornada_id,
        "tipo_deporte": {
            "nombre": partido.tipo_deporte.nombre,
            "tipo_marcador": partido.tipo_deporte.tipo_marcador
        },
        "equipo_local": {"nombre": partido.equipo_local.nombre},
        "equipo_visitante": {"nombre": partido.equipo_visitante.nombre},
        "equipo_local_id": partido.equipo_local_id,
        "equipo_visitante_id": partido.equipo_visitante_id,
        "arbitro_nombre": partido.arbitro.nombre if partido.arbitro else None,
        "grada_local_nombre": partido.tutor_grada_local.nombre if partido.tutor_grada_local else None,
        "grada_visitante_nombre": partido.tutor_grada_visitante.nombre if partido.tutor_grada_visitante else None,
        "slot_3_label": slot_labels["slot_3"],
        "slot_4_label": slot_labels["slot_4"],
        "slot_5_label": slot_labels["slot_5"],
        "modo_evaluacion": partido.liga.modo_evaluacion,
        "marcador": partido.marcador or {},
        "marcador_local": marcador_local,
        "marcador_visitante": marcador_visitante,
        "puntos_local": partido.puntos_local,
        "puntos_visitante": partido.puntos_visitante,
        "puntos_juego_limpio_local": partido.puntos_juego_limpio_local,
        "puntos_juego_limpio_visitante": partido.puntos_juego_limpio_visitante,
        "puntos_arbitro": partido.puntos_arbitro,
        "puntos_grada_local": partido.puntos_grada_local,
        "puntos_grada_visitante": partido.puntos_grada_visitante,
        "arbitro_media": partido.arbitro_media,
        "grada_animar_local": partido.grada_animar_local,
        "grada_animar_visitante": partido.grada_animar_visitante,
        "grada_respeto_local": partido.grada_respeto_local,
        "grada_respeto_visitante": partido.grada_respeto_visitante,
        "grada_participacion_local": partido.grada_participacion_local,
        "grada_participacion_visitante": partido.grada_participacion_visitante,
        "evaluacion_personalizada": evaluacion_personalizada,
    }
    
    pdf_content = ReportService.generate_acta_partido_pdf(partido_dict)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=acta_partido_{partido_id}.pdf"}
    )


@router.get("/{partido_id}/evaluacion-personalizada")
async def get_evaluacion_personalizada(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener las evaluaciones personalizadas de un partido.
    Devuelve los criterios de la liga y los valores actuales del partido.
    """
    # Obtener partido con liga
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.evaluaciones_personalizadas)
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()
    
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        VIEW_RESULTS,
        forbidden_detail="No tienes permisos para ver este partido",
    )
    
    # Obtener criterios de la liga
    criterios_con_valores = await _build_criterios_con_valores(partido, db)
    evaluacion_version = _evaluacion_personalizada_version(partido.evaluaciones_personalizadas)
    
    return {
        "modo_evaluacion": partido.liga.modo_evaluacion,
        "criterios": criterios_con_valores,
        "evaluacion_version": evaluacion_version,
    }


@router.put("/{partido_id}/evaluacion-personalizada")
async def update_evaluacion_personalizada(
    partido_id: int,
    evaluaciones: List[EvaluacionPersonalizadaCreate],
    expected_version: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar evaluaciones personalizadas de un partido.
    Recibe una lista de {criterio_id, equipo_id?, valor}.
    """
    # Obtener partido con liga
    query = select(Partido).filter(Partido.id == partido_id).options(
        selectinload(Partido.liga),
        selectinload(Partido.evaluaciones_personalizadas)
    )
    result = await db.execute(query)
    partido = result.scalar_one_or_none()
    
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        VALIDATE_MATCHES,
        forbidden_detail="No tienes permisos para editar este partido",
    )
    
    if partido.liga.modo_evaluacion != 'personalizado':
        raise HTTPException(
            status_code=400, 
            detail="Este partido pertenece a una liga con evaluación clásica. Usa el endpoint /evaluacion"
        )

    current_version = _evaluacion_personalizada_version(partido.evaluaciones_personalizadas)
    if not expected_version:
        criterios_con_valores = await _build_criterios_con_valores(partido, db)
        return JSONResponse(
            status_code=409,
            content={
                "message": "Conflicto de evaluación personalizada: falta expected_version para guardar.",
                "serverData": {
                    "modo_evaluacion": partido.liga.modo_evaluacion,
                    "criterios": criterios_con_valores,
                    "evaluacion_version": current_version,
                },
            },
        )
    if expected_version != current_version:
        criterios_con_valores = await _build_criterios_con_valores(partido, db)
        return JSONResponse(
            status_code=409,
            content={
                "message": "Conflicto de evaluación personalizada: el servidor tiene una versión más reciente.",
                "serverData": {
                    "modo_evaluacion": partido.liga.modo_evaluacion,
                    "criterios": criterios_con_valores,
                    "evaluacion_version": current_version,
                },
            },
        )
    
    # Validar que los criterios pertenecen a la liga
    criterio_ids = [e.criterio_id for e in evaluaciones]
    criterios_result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.id.in_(criterio_ids))
        .where(CriterioEvaluacion.liga_id == partido.liga_id)
    )
    criterios_validos = {c.id: c for c in criterios_result.scalars().all()}
    
    for e in evaluaciones:
        if e.criterio_id not in criterios_validos:
            raise HTTPException(
                status_code=400, 
                detail=f"El criterio {e.criterio_id} no pertenece a esta liga"
            )
        
        # Validar que el valor está dentro de la escala
        criterio = criterios_validos[e.criterio_id]
        if e.valor < criterio.escala_min or e.valor > criterio.escala_max:
            raise HTTPException(
                status_code=400,
                detail=f"El valor {e.valor} está fuera del rango {criterio.escala_min}-{criterio.escala_max} para {criterio.nombre}"
            )
    
    # Upsert evaluaciones
    for e in evaluaciones:
        # Buscar evaluación existente
        existing = await db.execute(
            select(EvaluacionPersonalizada)
            .where(EvaluacionPersonalizada.partido_id == partido_id)
            .where(EvaluacionPersonalizada.criterio_id == e.criterio_id)
            .where(EvaluacionPersonalizada.equipo_id == e.equipo_id)
        )
        eval_existente = existing.scalar_one_or_none()
        
        if eval_existente:
            eval_existente.valor = e.valor
        else:
            nueva_eval = EvaluacionPersonalizada(
                partido_id=partido_id,
                criterio_id=e.criterio_id,
                equipo_id=e.equipo_id,
                valor=e.valor
            )
            db.add(nueva_eval)
    
    
    # Calcular puntos educativos basados en umbrales de criterios
    # Acumuladores de puntos para cada equipo (local y visitante)
    puntos_local = 0.0
    puntos_visitante = 0.0
    puntos_grada_local = 0.0
    puntos_grada_visitante = 0.0
    puntos_arbitro = 0.0
    
    # Obtener todas las evaluaciones actualizadas
    evaluaciones_actuales = await db.execute(
        select(EvaluacionPersonalizada, CriterioEvaluacion)
        .join(CriterioEvaluacion)
        .where(EvaluacionPersonalizada.partido_id == partido_id)
    )
    datos_evaluacion = evaluaciones_actuales.all()
    
    # Mapa de equipos del partido para saber cuál es local y visitante
    id_local = partido.equipo_local_id
    id_visitante = partido.equipo_visitante_id
    
    for evaluacion, criterio in datos_evaluacion:
        puntos_obtenidos = 0.0
        
        # Calcular puntos según umbrales definidos en el criterio
        if evaluacion.valor >= criterio.umbral_alto:
            puntos_obtenidos = criterio.puntos_alto
        elif evaluacion.valor >= criterio.umbral_medio:
            puntos_obtenidos = criterio.puntos_medio
            
        # Determinar a qué apartado asignar los puntos
        if criterio.categoria == 'grada_local':
            puntos_grada_local += puntos_obtenidos
            continue
        if criterio.categoria == 'grada_visitante':
            puntos_grada_visitante += puntos_obtenidos
            continue
        if criterio.categoria == 'arbitro':
            puntos_arbitro += puntos_obtenidos
            continue

        # 1. Si el criterio es específico de equipo, usar equipo_id de la evaluación
        if evaluacion.equipo_id:
            if evaluacion.equipo_id == id_local:
                puntos_local += puntos_obtenidos
            elif evaluacion.equipo_id == id_visitante:
                puntos_visitante += puntos_obtenidos
        # 2. Si el criterio es general/jugador sin equipo_id, sumarlo a ambos
        elif criterio.categoria in ('general', 'jugador'):
            puntos_local += puntos_obtenidos
            puntos_visitante += puntos_obtenidos

    # Guardar puntos calculados en los campos "contenedor" de puntos educativos
    partido.puntos_juego_limpio_local = int(puntos_local) # Cast a int si el modelo lo requiere, o float si soporta
    partido.puntos_juego_limpio_visitante = int(puntos_visitante)
    partido.puntos_grada_local = puntos_grada_local
    partido.puntos_grada_visitante = puntos_grada_visitante
    partido.puntos_arbitro = int(puntos_arbitro)
    
    criterios_activos_result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == partido.liga_id)
        .where(CriterioEvaluacion.activo == True)
    )
    criterios_activos = criterios_activos_result.scalars().all()
    partido.evaluacion_completa = _is_personalizada_completa(
        partido,
        criterios_activos,
        [e for e, _ in datos_evaluacion],
    )

    await db.commit()
    await db.refresh(partido)
    await db.refresh(partido, attribute_names=["evaluaciones_personalizadas"])

    nueva_version = _evaluacion_personalizada_version([e for e, _ in datos_evaluacion])
    criterios_con_valores = await _build_criterios_con_valores(partido, db)
    
    # Actualizar estadísticas de equipos (throttled)
    await ClasificacionService.schedule_stats_updates(
        [
            partido.equipo_local_id,
            partido.equipo_visitante_id,
            partido.arbitro_id,
            partido.tutor_grada_local_id,
            partido.tutor_grada_visitante_id,
        ],
        throttle_seconds=5
    )
    
    return {
        "status": "ok",
        "evaluaciones_guardadas": len(evaluaciones),
        "puntos_calculados": {"local": puntos_local, "visitante": puntos_visitante},
        "evaluacion_version": nueva_version,
        "criterios": criterios_con_valores,
    }


async def _get_partido_with_permission(
    partido_id: int,
    db: AsyncSession,
    current_user: User,
    permission: str,
) -> Partido:
    result = await db.execute(
        select(Partido).filter(Partido.id == partido_id).options(selectinload(Partido.liga))
    )
    partido = result.scalar_one_or_none()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    await ensure_liga_permission(
        db,
        partido.liga,
        current_user,
        permission,
        forbidden_detail="No tienes permisos para este partido",
    )
    return partido


@router.post("/{partido_id}/pin", response_model=PartidoResponse)
@limiter.limit("10/minute")
async def generate_partido_pin(
    request: Request,
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera o regenera el PIN de acceso publico del partido para el alumnado."""
    partido = await _get_partido_with_permission(partido_id, db, current_user, OPEN_MATCHES)

    digits = "0123456789"
    pin = None
    for _ in range(50):
        candidate = "".join(secrets.choice(digits) for _ in range(6))
        existing = await db.scalar(
            select(Partido.id).where(
                Partido.pin == candidate,
                Partido.finalizado == False,
                Partido.id != partido_id,
            )
        )
        if existing is None:
            pin = candidate
            break

    if pin is None:
        raise HTTPException(status_code=500, detail="No se pudo generar un PIN unico, reintenta")

    partido.pin = pin
    partido.pin_valid_from = datetime.now(timezone.utc)
    partido.pin_valid_until = None
    await db.commit()
    await db.refresh(partido)
    return partido


@router.delete("/{partido_id}/pin", response_model=PartidoResponse)
@limiter.limit("10/minute")
async def revoke_partido_pin(
    request: Request,
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoca el PIN de acceso publico del partido."""
    partido = await _get_partido_with_permission(partido_id, db, current_user, OPEN_MATCHES)

    partido.pin = None
    partido.pin_valid_from = None
    partido.pin_valid_until = None
    await db.commit()
    await db.refresh(partido)
    return partido


@router.get("/export/pines")
async def export_pines_calendario(
    liga_id: int = Query(..., description="ID de la liga"),
    formato: str = Query("pdf", description="Formato de exportación: pdf o csv"),
    solo_con_pin: bool = Query(False, description="Incluir solo partidos con PIN asignado"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporta el calendario completo de partidos de una liga con sus PINes y roles.
    Útil para imprimir y usar en clase.
    Formato: pdf (A4 apaisado, imprimible) o csv (para Excel/Sheets).
    """
    result = await db.execute(select(Liga).where(Liga.id == liga_id))
    liga = result.scalar_one_or_none()
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    await ensure_liga_permission(
        db,
        liga,
        current_user,
        VIEW_MATCHES,
        forbidden_detail="No tienes permisos para esta liga",
    )

    query = (
        select(Partido)
        .where(Partido.liga_id == liga_id)
        .options(
            selectinload(Partido.tipo_deporte),
            selectinload(Partido.equipo_local),
            selectinload(Partido.equipo_visitante),
            selectinload(Partido.arbitro),
            selectinload(Partido.tutor_grada_local),
            selectinload(Partido.tutor_grada_visitante),
            selectinload(Partido.jornada),
        )
        .order_by(Partido.jornada_id.asc().nullslast(), Partido.id.asc())
    )
    if solo_con_pin:
        query = query.where(Partido.pin.isnot(None))

    result = await db.execute(query)
    partidos = result.scalars().all()

    # Serializar a lista de dicts
    partidos_data = []
    for p in partidos:
        fecha_str = p.fecha_hora.strftime("%d/%m/%Y %H:%M") if p.fecha_hora else ""
        partidos_data.append({
            "jornada_nombre": p.jornada.nombre if p.jornada else "Sin jornada",
            "fecha_hora": fecha_str,
            "deporte": p.tipo_deporte.nombre if p.tipo_deporte else "",
            "equipo_local": p.equipo_local.nombre if p.equipo_local else "",
            "equipo_visitante": p.equipo_visitante.nombre if p.equipo_visitante else "",
            "arbitro": p.arbitro.nombre if p.arbitro else None,
            "tutor_grada_local": p.tutor_grada_local.nombre if p.tutor_grada_local else None,
            "tutor_grada_visitante": p.tutor_grada_visitante.nombre if p.tutor_grada_visitante else None,
            "pin": p.pin,
            "finalizado": p.finalizado,
        })

    from app.services.report_service import ReportService

    if formato.lower() == "csv":
        content = ReportService.generate_pines_csv(liga.nombre, partidos_data)
        filename = f"pines_{liga.nombre.lower().replace(' ', '_')}.csv"
        return Response(
            content=content.encode("utf-8-sig"),  # utf-8-sig para compatibilidad Excel
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # PDF por defecto
    pdf_content = ReportService.generate_pines_pdf(liga.nombre, partidos_data)
    filename = f"pines_{liga.nombre.lower().replace(' ', '_')}.pdf"
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Anotaciones de partido (notas) — área docente
# Privacy-by-design / LOPD/RGPD: sin datos personales, moderación previa
# ─────────────────────────────────────────────────────────────────────────────

class PartidoNotaResponse(BaseModel):
    id: int
    partido_id: int
    contenido: str
    tipo: str
    origen: str
    estado: str
    created_at: datetime
    aprobada_at: Optional[datetime]

    class Config:
        from_attributes = True


class PartidoNotaEstadoUpdate(BaseModel):
    estado: str  # aprobada | rechazada


@router.get("/{partido_id}/notas", response_model=List[PartidoNotaResponse])
async def list_notas_partido(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas las anotaciones de un partido (pendientes y aprobadas). Solo docente."""
    partido = await _get_partido_with_permission(partido_id, db, current_user, VIEW_MATCHES)
    result = await db.execute(
        select(PartidoNota)
        .where(PartidoNota.partido_id == partido_id)
        .order_by(PartidoNota.created_at.asc())
    )
    return result.scalars().all()


@router.put("/{partido_id}/notas/{nota_id}/estado", response_model=PartidoNotaResponse)
async def update_estado_nota(
    partido_id: int,
    nota_id: int,
    body: PartidoNotaEstadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aprueba o rechaza una anotación. Solo el docente gestor puede moderar."""
    await _get_partido_with_permission(partido_id, db, current_user, VALIDATE_MATCHES)

    if body.estado not in ("aprobada", "rechazada"):
        raise HTTPException(status_code=422, detail="Estado debe ser 'aprobada' o 'rechazada'")

    result = await db.execute(
        select(PartidoNota)
        .where(PartidoNota.id == nota_id, PartidoNota.partido_id == partido_id)
    )
    nota = result.scalar_one_or_none()
    if not nota:
        raise HTTPException(status_code=404, detail="Anotación no encontrada")

    nota.estado = body.estado
    if body.estado == "aprobada":
        nota.aprobada_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(nota)
    return nota


@router.delete("/{partido_id}/notas/{nota_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nota(
    partido_id: int,
    nota_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina una anotación (rechazadas o no deseadas). Solo docente."""
    await _get_partido_with_permission(partido_id, db, current_user, VALIDATE_MATCHES)

    result = await db.execute(
        select(PartidoNota)
        .where(PartidoNota.id == nota_id, PartidoNota.partido_id == partido_id)
    )
    nota = result.scalar_one_or_none()
    if not nota:
        raise HTTPException(status_code=404, detail="Anotación no encontrada")

    await db.delete(nota)
    await db.commit()
