#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# API Router for Pending Actions (gestiones pendientes)
#

import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.sql import func
from pydantic import BaseModel
from pathlib import Path

from app.database import get_db, AsyncSessionLocal
from app.models.pending_action import PendingAction
from app.models.equipo import Equipo
from app.models.liga import Liga
from app.models.partido import Partido
from app.api.deps import get_current_user
from app.models.user import User
from app.services.evaluacion_clasica import aplicar_evaluacion_clasica, es_evaluacion_clasica_completa

router = APIRouter(prefix="/pending-actions", tags=["Pending Actions"])


CLASSIC_EVALUACION_FIELDS = {
    "puntos_juego_limpio_local",
    "puntos_juego_limpio_visitante",
    "arbitro_conocimiento",
    "arbitro_gestion",
    "arbitro_apoyo",
    "grada_animar_local",
    "grada_respeto_local",
    "grada_participacion_local",
    "grada_animar_visitante",
    "grada_respeto_visitante",
    "grada_participacion_visitante",
}


def _apply_classic_evaluacion(partido: Partido, evaluacion: dict | None) -> None:
    """
    Aplica una evaluación enviada por el alumnado: filtra a los campos
    permitidos, normaliza a entero y delega el cálculo de medias/puntos
    en el servicio compartido (app/services/evaluacion_clasica.py).
    """
    if not isinstance(evaluacion, dict):
        return

    datos = {
        key: int(value)
        for key, value in evaluacion.items()
        if key in CLASSIC_EVALUACION_FIELDS and isinstance(value, (int, float, bool))
    }
    aplicar_evaluacion_clasica(partido, datos)
    partido.evaluacion_completa = es_evaluacion_clasica_completa(partido)


# Schemas
class PendingActionCreate(BaseModel):
    action_type: str
    liga_id: int
    target_id: int
    data_json: Optional[dict] = None
    description: Optional[str] = None


class PendingActionResponse(BaseModel):
    id: int
    action_type: str
    status: str
    liga_id: int
    target_id: int
    data_json: Optional[dict]
    description: Optional[str]
    created_at: str
    reviewed_at: Optional[str]
    reviewer_notes: Optional[str]
    
    class Config:
        from_attributes = True


class PendingActionReview(BaseModel):
    notes: Optional[str] = None


# Endpoints
@router.post("", response_model=PendingActionResponse, status_code=status.HTTP_201_CREATED)
async def create_pending_action(
    data: PendingActionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new pending action (e.g., logo submission for approval)."""
    
    # Verify liga exists
    liga_result = await db.execute(select(Liga).where(Liga.id == data.liga_id))
    liga = liga_result.scalar_one_or_none()
    if not liga:
        raise HTTPException(status_code=404, detail="Liga not found")

    # Scope pending actions to the league owner (or superuser).
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permisos para esta liga")
    
    # Create pending action
    pending = PendingAction(
        action_type=data.action_type,
        liga_id=data.liga_id,
        target_id=data.target_id,
        data_json=data.data_json,
        description=data.description,
        status="pending"
    )
    
    db.add(pending)
    await db.commit()
    await db.refresh(pending)
    
    return {
        **pending.__dict__,
        "created_at": pending.created_at.isoformat() if pending.created_at else None,
        "reviewed_at": pending.reviewed_at.isoformat() if pending.reviewed_at else None
    }


@router.get("", response_model=list[PendingActionResponse])
async def list_pending_actions(
    liga_id: Optional[int] = None,
    action_type: Optional[str] = None,
    status_filter: Optional[str] = "pending",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List pending actions. Requires authentication. Filters by liga if specified."""
    
    query = (
        select(PendingAction)
        .join(Liga, PendingAction.liga_id == Liga.id)
        .where(Liga.usuario_id == current_user.id)
    )
    
    conditions = []
    if liga_id:
        conditions.append(PendingAction.liga_id == liga_id)
    if action_type:
        conditions.append(PendingAction.action_type == action_type)
    if status_filter:
        conditions.append(PendingAction.status == status_filter)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(PendingAction.created_at.desc())
    
    result = await db.execute(query)
    actions = result.scalars().all()
    
    return [
        {
            **action.__dict__,
            "created_at": action.created_at.isoformat() if action.created_at else None,
            "reviewed_at": action.reviewed_at.isoformat() if action.reviewed_at else None
        }
        for action in actions
    ]


async def _contar_pendientes(db: AsyncSession, user_id: int, liga_id: Optional[int]) -> int:
    """Cuenta las acciones pendientes del docente (opcionalmente por liga)."""
    query = (
        select(func.count(PendingAction.id))
        .select_from(PendingAction)
        .join(Liga, PendingAction.liga_id == Liga.id)
        .where(
            PendingAction.status == "pending",
            Liga.usuario_id == user_id,
        )
    )
    if liga_id:
        query = query.where(PendingAction.liga_id == liga_id)
    result = await db.execute(query)
    return result.scalar() or 0


@router.get("/count")
async def count_pending_actions(
    liga_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get count of pending actions for badge display."""
    count = await _contar_pendientes(db, current_user.id, liga_id)
    return {"count": count}


# Cadencia del stream de pendientes (segundos entre comprobaciones)
STREAM_INTERVALO = 10


@router.get("/stream")
async def stream_pending_actions(
    liga_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """
    SSE: emite el contador de pendientes solo cuando cambia. Sustituye el
    polling HTTP de 15s del frontend por una única conexión persistente
    (el frontend degrada a polling si el stream no está disponible).
    """
    user_id = current_user.id

    async def eventos():
        ultimo: Optional[int] = None
        # Primer valor inmediato; después, comprobación cada STREAM_INTERVALO
        while True:
            try:
                # Sesión corta por consulta: no retener conexiones del pool
                # durante la vida (larga) del stream
                async with AsyncSessionLocal() as session:
                    count = await _contar_pendientes(session, user_id, liga_id)
            except Exception:
                count = ultimo
            if count is not None and count != ultimo:
                ultimo = count
                yield f"event: pendientes\ndata: {json.dumps({'count': count})}\n\n"
            else:
                # Comentario SSE como latido: mantiene viva la conexión a
                # través de proxies sin generar eventos en el cliente
                yield ": ping\n\n"
            await asyncio.sleep(STREAM_INTERVALO)

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx: desactiva buffering para SSE
        },
    )


@router.put("/{action_id}/approve", response_model=PendingActionResponse)
async def approve_pending_action(
    action_id: int,
    review: PendingActionReview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a pending action. Applies the change (e.g., updates team logo)."""
    
    result = await db.execute(
        select(PendingAction)
        .join(Liga, PendingAction.liga_id == Liga.id)
        .where(
            PendingAction.id == action_id,
            Liga.usuario_id == current_user.id,
        )
    )
    action = result.scalar_one_or_none()
    
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")
    
    if action.status != "pending":
        raise HTTPException(status_code=400, detail="Action already reviewed")
    
    # Apply the action based on type
    _approved_partido = None

    if action.action_type == "logo":
        # Update team logo
        team_result = await db.execute(
            select(Equipo).where(
                Equipo.id == action.target_id,
                Equipo.liga_id == action.liga_id,
            )
        )
        team = team_result.scalar_one_or_none()
        if team and action.data_json:
            logo_url = action.data_json.get("logo_url")
            logo_filename = action.data_json.get("logo_filename")
            if logo_url:
                team.logo_url = str(logo_url)
                team.logo_filename = str(logo_filename or Path(str(logo_url)).name)

    elif action.action_type == "marcador_partido":
        # Aplicar marcador propuesto por alumnos al partido
        from sqlalchemy.orm import selectinload
        partido_result = await db.execute(
            select(Partido)
            .where(Partido.id == action.target_id)
            .options(
                selectinload(Partido.liga),
                selectinload(Partido.tipo_deporte),
            )
        )
        partido = partido_result.scalar_one_or_none()
        if partido and action.data_json:
            marcador = action.data_json.get("marcador")
            if marcador and isinstance(marcador, dict):
                partido.marcador = marcador
                partido.calcular_puntos_desde_marcador()

            evaluacion = action.data_json.get("evaluacion")
            _apply_classic_evaluacion(partido, evaluacion)

            # La aprobación docente finaliza el partido
            partido.finalizado = True
            _approved_partido = partido

    # Update action status
    action.status = "approved"
    action.reviewed_at = func.now()
    action.reviewed_by = current_user.id
    action.reviewer_notes = review.notes
    
    await db.commit()
    await db.refresh(action)

    if _approved_partido is not None:
        from app.services.clasificacion_service import ClasificacionService
        await ClasificacionService.schedule_stats_updates(
            [
                _approved_partido.equipo_local_id,
                _approved_partido.equipo_visitante_id,
                _approved_partido.arbitro_id,
                _approved_partido.tutor_grada_local_id,
                _approved_partido.tutor_grada_visitante_id,
            ],
            force=True,
        )

    return {
        **action.__dict__,
        "created_at": action.created_at.isoformat() if action.created_at else None,
        "reviewed_at": action.reviewed_at.isoformat() if action.reviewed_at else None
    }


@router.put("/{action_id}/reject", response_model=PendingActionResponse)
async def reject_pending_action(
    action_id: int,
    review: PendingActionReview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reject a pending action."""
    
    result = await db.execute(
        select(PendingAction)
        .join(Liga, PendingAction.liga_id == Liga.id)
        .where(
            PendingAction.id == action_id,
            Liga.usuario_id == current_user.id,
        )
    )
    action = result.scalar_one_or_none()
    
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")
    
    if action.status != "pending":
        raise HTTPException(status_code=400, detail="Action already reviewed")
    
    # Update action status
    action.status = "rejected"
    action.reviewed_at = func.now()
    action.reviewed_by = current_user.id
    action.reviewer_notes = review.notes
    
    await db.commit()
    await db.refresh(action)
    
    return {
        **action.__dict__,
        "created_at": action.created_at.isoformat() if action.created_at else None,
        "reviewed_at": action.reviewed_at.isoformat() if action.reviewed_at else None
    }
