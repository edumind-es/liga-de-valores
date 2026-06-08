#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# API Router for Pending Actions (gestiones pendientes)
#

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.sql import func
from pydantic import BaseModel
from pathlib import Path

from app.database import get_db
from app.models.pending_action import PendingAction
from app.models.equipo import Equipo
from app.models.liga import Liga
from app.models.partido import Partido
from app.api.deps import get_current_user
from app.models.user import User

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


def _check_classic_evaluacion_completa(partido: Partido) -> bool:
    """Comprueba si la evaluación clásica tiene todos los campos requeridos."""
    if partido.puntos_juego_limpio_local is None or partido.puntos_juego_limpio_visitante is None:
        return False
    if partido.arbitro_id:
        if any(v is None for v in (partido.arbitro_conocimiento, partido.arbitro_gestion, partido.arbitro_apoyo)):
            return False
    if partido.tutor_grada_local_id:
        if any(v is None for v in (partido.grada_animar_local, partido.grada_respeto_local, partido.grada_participacion_local)):
            return False
    if partido.tutor_grada_visitante_id:
        if any(v is None for v in (partido.grada_animar_visitante, partido.grada_respeto_visitante, partido.grada_participacion_visitante)):
            return False
    return True


def _apply_classic_evaluacion(partido: Partido, evaluacion: dict | None) -> None:
    if not isinstance(evaluacion, dict):
        return

    for key, value in evaluacion.items():
        if key in CLASSIC_EVALUACION_FIELDS and isinstance(value, (int, float, bool)):
            setattr(partido, key, int(value))

    vals_arbitro = [
        partido.arbitro_conocimiento,
        partido.arbitro_gestion,
        partido.arbitro_apoyo,
    ]
    valid_arbitro = [value for value in vals_arbitro if value is not None]
    if valid_arbitro:
        partido.arbitro_media = sum(valid_arbitro) / len(valid_arbitro)
        config = partido.liga.config or {}
        arbitro_points = config.get("arbitro_points", 2)
        partido.puntos_arbitro = arbitro_points if partido.arbitro_media >= 5 else 0

    vals_grada_local = [
        partido.grada_animar_local,
        partido.grada_respeto_local,
        partido.grada_participacion_local,
    ]
    valid_grada_local = [value for value in vals_grada_local if value is not None]
    if valid_grada_local:
        media_local = sum(valid_grada_local) / len(valid_grada_local)
        config = partido.liga.config or {}
        if media_local > 3:
            partido.puntos_grada_local = config.get("grada_max_points", 1)
        elif media_local >= 2:
            partido.puntos_grada_local = config.get("grada_mid_points", 0.5)
        else:
            partido.puntos_grada_local = 0

    vals_grada_visitante = [
        partido.grada_animar_visitante,
        partido.grada_respeto_visitante,
        partido.grada_participacion_visitante,
    ]
    valid_grada_visitante = [value for value in vals_grada_visitante if value is not None]
    if valid_grada_visitante:
        media_visitante = sum(valid_grada_visitante) / len(valid_grada_visitante)
        config = partido.liga.config or {}
        if media_visitante > 3:
            partido.puntos_grada_visitante = config.get("grada_max_points", 1)
        elif media_visitante >= 2:
            partido.puntos_grada_visitante = config.get("grada_mid_points", 0.5)
        else:
            partido.puntos_grada_visitante = 0

    partido.evaluacion_completa = _check_classic_evaluacion_completa(partido)


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


@router.get("/count")
async def count_pending_actions(
    liga_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get count of pending actions for badge display."""
    
    query = (
        select(func.count(PendingAction.id))
        .select_from(PendingAction)
        .join(Liga, PendingAction.liga_id == Liga.id)
        .where(
            PendingAction.status == "pending",
            Liga.usuario_id == current_user.id,
        )
    )
    
    if liga_id:
        query = query.where(PendingAction.liga_id == liga_id)
    
    result = await db.execute(query)
    count = result.scalar()
    
    return {"count": count}


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
