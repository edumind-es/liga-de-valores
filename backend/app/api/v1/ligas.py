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
API endpoints for Ligas (Leagues).
"""
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import Liga, User, Equipo, Jornada, Partido
from app.models.league_teacher_membership import LeagueTeacherMembership
from app.models.league_match_role_schema import LeagueMatchRoleSchema
from app.schemas import (
    LigaCreate,
    LigaUpdate,
    LigaResponse,
    LigaWithStats,
    LeagueCapacityResponse,
    LeagueTeacherMemberResponse,
    LeagueTeacherMemberUpsert,
    MatchRoleSchemaInput,
    MatchRoleSchemaResponse,
)
from app.api.deps import get_current_user
from app.services.clasificacion_service import ClasificacionService
# CalendarGenerator deprecated - use /jornadas/{id}/generar-calendario instead
from app.services.public_pin_service import generate_unique_public_pin
from app.services.league_entitlement_service import ensure_can_create_league, get_league_capacity
from app.services.match_role_schema_service import (
    get_or_create_match_role_schema,
    maybe_auto_lock_schema,
    update_schema_in_draft,
    force_lock_schema,
    league_has_structural_activity,
)
from app.services.audit_service import log_audit_event
from app.services.league_teacher_access import (
    MANAGE_MEMBERS,
    VIEW_LEAGUE,
    apply_role_defaults,
    ensure_liga_permission,
    list_accessible_liga_ids,
    revoke_membership,
)

router = APIRouter()


def _schema_priority(schema: LeagueMatchRoleSchema) -> int:
    if schema.status == "locked":
        return 2
    if schema.status == "draft":
        return 1
    return 0


async def _load_match_role_schemas_for_ligas(
    db: AsyncSession,
    liga_ids: list[int],
) -> dict[int, LeagueMatchRoleSchema]:
    if not liga_ids:
        return {}

    result = await db.execute(
        select(LeagueMatchRoleSchema)
        .where(LeagueMatchRoleSchema.liga_id.in_(liga_ids))
        .options(
            selectinload(LeagueMatchRoleSchema.slots),
            selectinload(LeagueMatchRoleSchema.rules),
        )
        .execution_options(populate_existing=True)
        .order_by(
            LeagueMatchRoleSchema.liga_id.asc(),
            LeagueMatchRoleSchema.version.desc(),
            LeagueMatchRoleSchema.id.desc(),
        )
    )

    schemas_by_liga: dict[int, LeagueMatchRoleSchema] = {}
    for schema in result.scalars().all():
        current = schemas_by_liga.get(schema.liga_id)
        if current is None or _schema_priority(schema) > _schema_priority(current):
            schemas_by_liga[schema.liga_id] = schema

    return schemas_by_liga


async def _load_liga_stats(
    db: AsyncSession,
    liga_ids: list[int],
) -> dict[int, dict[str, int]]:
    if not liga_ids:
        return {}

    stats: defaultdict[int, dict[str, int]] = defaultdict(
        lambda: {
            "total_equipos": 0,
            "total_jornadas": 0,
            "total_partidos": 0,
        }
    )

    for model, key in (
        (Equipo, "total_equipos"),
        (Jornada, "total_jornadas"),
        (Partido, "total_partidos"),
    ):
        result = await db.execute(
            select(model.liga_id, func.count())
            .where(model.liga_id.in_(liga_ids))
            .group_by(model.liga_id)
        )
        for liga_id, count in result.all():
            stats[int(liga_id)][key] = int(count or 0)

    return dict(stats)


async def _commit_liga_changes(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        message = str(getattr(exc, "orig", exc))
        if "ux_ligas_public_pin_not_null" in message or "ligas.public_pin" in message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este PIN ya está en uso por otra liga",
            ) from exc
        raise


async def _serialize_liga(
    db: AsyncSession,
    liga: Liga,
    *,
    include_stats: bool = False,
    schema: LeagueMatchRoleSchema | None = None,
    stats: dict[str, int] | None = None,
) -> dict:
    if schema is None:
        schema = await get_or_create_match_role_schema(db, liga, create_if_missing=False)
    payload = {
        "id": liga.id,
        "nombre": liga.nombre,
        "descripcion": liga.descripcion,
        "temporada": liga.temporada,
        "activa": liga.activa,
        "modo_competicion": liga.modo_competicion,
        "modo_evaluacion": liga.modo_evaluacion,
        "usuario_id": liga.usuario_id,
        "public_pin": liga.public_pin,
        "email_fichas": liga.email_fichas,
        "config": liga.config,
        "team_roles": liga.team_roles,
        "team_commitments": liga.team_commitments,
        "match_role_schema": schema,
        "created_at": liga.created_at,
        "updated_at": liga.updated_at,
    }
    if not include_stats:
        return payload

    if stats is None:
        stats_map = await _load_liga_stats(db, [liga.id])
        stats = stats_map.get(liga.id, {})

    payload["total_equipos"] = int(stats.get("total_equipos", 0))
    payload["total_jornadas"] = int(stats.get("total_jornadas", 0))
    payload["total_partidos"] = int(stats.get("total_partidos", 0))
    return payload


def _serialize_membership(member: LeagueTeacherMembership) -> dict:
    return {
        "id": member.id,
        "liga_id": member.liga_id,
        "user_id": member.user_id,
        "user_codigo": member.user.codigo if member.user else None,
        "user_email": member.user.email if member.user else None,
        "role": member.role,
        "status": member.status,
        "can_view_league": member.can_view_league,
        "can_view_matches": member.can_view_matches,
        "can_open_matches": member.can_open_matches,
        "can_validate_matches": member.can_validate_matches,
        "can_view_results": member.can_view_results,
        "can_manage_members": member.can_manage_members,
        "created_by": member.created_by,
        "revoked_by": member.revoked_by,
        "created_at": member.created_at,
        "updated_at": member.updated_at,
        "revoked_at": member.revoked_at,
    }

@router.get("/", response_model=List[LigaResponse])
async def list_ligas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todas las ligas del usuario actual.
    """
    accessible_ids = await list_accessible_liga_ids(db, current_user, VIEW_LEAGUE)
    query = select(Liga)
    if accessible_ids is not None:
        if not accessible_ids:
            return []
        query = query.where(Liga.id.in_(accessible_ids))
    result = await db.execute(query)
    ligas = result.scalars().all()
    liga_ids = [liga.id for liga in ligas]
    schemas_by_liga = await _load_match_role_schemas_for_ligas(db, liga_ids)
    return [
        await _serialize_liga(db, liga, schema=schemas_by_liga.get(liga.id))
        for liga in ligas
    ]


@router.get("/capacity", response_model=LeagueCapacityResponse)
async def get_liga_capacity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener capacidad de creación de ligas para el usuario actual
    según plan y reglas de grandfathering.
    """
    return await get_league_capacity(db, current_user)


@router.post("/", response_model=LigaResponse, status_code=status.HTTP_201_CREATED)
async def create_liga(
    liga_data: LigaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva liga.
    """
    await ensure_can_create_league(db, current_user)

    nueva_liga = Liga(
        nombre=liga_data.nombre,
        descripcion=liga_data.descripcion,
        temporada=liga_data.temporada,
        activa=liga_data.activa,
        modo_competicion=liga_data.modo_competicion,
        modo_evaluacion=liga_data.modo_evaluacion,
        email_fichas=liga_data.email_fichas,
        config=liga_data.config,
        team_roles=liga_data.team_roles,
        team_commitments=liga_data.team_commitments,
        usuario_id=current_user.id
    )
    
    db.add(nueva_liga)
    await db.flush()

    normalized_schema_payload = liga_data.match_role_schema or MatchRoleSchemaInput(roles_per_match=4)
    await update_schema_in_draft(db, nueva_liga, normalized_schema_payload)

    await _commit_liga_changes(db)
    await db.refresh(nueva_liga)
    
    return await _serialize_liga(db, nueva_liga)

@router.get("/{liga_id}", response_model=LigaWithStats)
async def get_liga(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener una liga específica con estadísticas.
    """
    liga = await db.get(Liga, liga_id)
    
    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )
    
    await ensure_liga_permission(db, liga, current_user, VIEW_LEAGUE)
    
    schemas_by_liga = await _load_match_role_schemas_for_ligas(db, [liga.id])
    stats_by_liga = await _load_liga_stats(db, [liga.id])
    return await _serialize_liga(
        db,
        liga,
        include_stats=True,
        schema=schemas_by_liga.get(liga.id),
        stats=stats_by_liga.get(liga.id),
    )

@router.put("/{liga_id}", response_model=LigaResponse)
async def update_liga(
    liga_id: int,
    liga_data: LigaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar una liga.
    """
    liga = await db.get(Liga, liga_id)
    
    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )
    
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta liga"
        )
    
    # Actualizar campos
    if liga_data.nombre is not None:
        liga.nombre = liga_data.nombre
    if liga_data.descripcion is not None:
        liga.descripcion = liga_data.descripcion
    if liga_data.temporada is not None:
        liga.temporada = liga_data.temporada
    if liga_data.activa is not None:
        liga.activa = liga_data.activa
    if liga_data.modo_competicion is not None:
        liga.modo_competicion = liga_data.modo_competicion
    if liga_data.modo_evaluacion is not None:
        liga.modo_evaluacion = liga_data.modo_evaluacion
    if "public_pin" in liga_data.model_fields_set:
        if liga_data.public_pin is not None:
            existing = await db.scalar(
                select(Liga.id).where(Liga.public_pin == liga_data.public_pin, Liga.id != liga_id)
            )
            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este PIN ya está en uso por otra liga",
                )
        liga.public_pin = liga_data.public_pin
    
    if liga_data.email_fichas is not None:
        liga.email_fichas = liga_data.email_fichas
    
    if liga_data.config is not None:
        liga.config = liga_data.config

    if liga_data.team_roles is not None:
        liga.team_roles = liga_data.team_roles

    if liga_data.team_commitments is not None:
        liga.team_commitments = liga_data.team_commitments

    if liga_data.match_role_schema is not None:
        await update_schema_in_draft(db, liga, liga_data.match_role_schema)
    
    await _commit_liga_changes(db)
    await db.refresh(liga)
    
    return await _serialize_liga(db, liga)


@router.get("/{liga_id}/match-role-schema", response_model=MatchRoleSchemaResponse)
async def get_match_role_schema(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liga no encontrada")
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos")

    schema = await maybe_auto_lock_schema(db, liga)
    await db.commit()
    await db.refresh(schema)
    await db.refresh(schema, attribute_names=["slots", "rules"])
    return schema


@router.put("/{liga_id}/match-role-schema", response_model=MatchRoleSchemaResponse)
async def update_match_role_schema(
    liga_id: int,
    payload: MatchRoleSchemaInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liga no encontrada")
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos")

    schema = await update_schema_in_draft(db, liga, payload)
    await db.commit()
    await db.refresh(schema)
    await db.refresh(schema, attribute_names=["slots", "rules"])
    return schema


@router.delete("/{liga_id}/match-role-schema/lock", response_model=MatchRoleSchemaResponse)
async def unlock_match_role_schema(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Desbloquea el schema de partido para re-edicion. Solo posible si no hay partidos ni jornadas."""
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liga no encontrada")
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos")

    schema = await get_or_create_match_role_schema(db, liga, create_if_missing=False)
    if schema is None or schema.status != "locked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El schema no esta bloqueado")

    has_activity = await league_has_structural_activity(db, liga_id)
    if has_activity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Elimina todos los partidos y jornadas antes de desbloquear el formato",
        )

    schema.status = "draft"
    schema.locked_at = None
    await db.commit()
    await db.refresh(schema)
    await db.refresh(schema, attribute_names=["slots", "rules"])
    return schema


@router.post("/{liga_id}/match-role-schema/lock", response_model=MatchRoleSchemaResponse)
async def lock_match_role_schema(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liga no encontrada")
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos")

    schema = await force_lock_schema(db, liga)
    await db.commit()
    await db.refresh(schema)
    await db.refresh(schema, attribute_names=["slots", "rules"])
    return schema


@router.post("/{liga_id}/public-pin")
async def generar_public_pin(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generar (o regenerar) un PIN público único para la liga.
    """
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos")

    try:
        pin = await generate_unique_public_pin(db, exclude_liga_id=liga_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    liga.public_pin = pin
    await _commit_liga_changes(db)
    await db.refresh(liga)

    return {"public_pin": liga.public_pin}


@router.delete("/{liga_id}/public-pin", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_public_pin(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Desactivar acceso público eliminando el PIN.
    """
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos")

    liga.public_pin = None
    await db.commit()


@router.get("/{liga_id}/docentes", response_model=List[LeagueTeacherMemberResponse])
async def list_liga_docentes(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar docentes asociados a una liga."""
    liga = await db.get(Liga, liga_id)
    await ensure_liga_permission(
        db,
        liga,
        current_user,
        MANAGE_MEMBERS,
        forbidden_detail="No tienes permisos para gestionar docentes",
    )

    result = await db.execute(
        select(LeagueTeacherMembership)
        .where(LeagueTeacherMembership.liga_id == liga_id)
        .options(selectinload(LeagueTeacherMembership.user))
        .order_by(LeagueTeacherMembership.status.asc(), LeagueTeacherMembership.created_at.desc())
    )
    return [_serialize_membership(member) for member in result.scalars().all()]


@router.post("/{liga_id}/docentes", response_model=LeagueTeacherMemberResponse, status_code=status.HTTP_201_CREATED)
async def upsert_liga_docente(
    liga_id: int,
    payload: LeagueTeacherMemberUpsert,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Añadir o reactivar un docente colaborador en una liga."""
    liga = await db.get(Liga, liga_id)
    await ensure_liga_permission(
        db,
        liga,
        current_user,
        MANAGE_MEMBERS,
        forbidden_detail="No tienes permisos para gestionar docentes",
    )

    target_query = select(User)
    if payload.user_id is not None:
        target_query = target_query.where(User.id == payload.user_id)
    else:
        target_query = target_query.where(User.email == str(payload.email))
    target_user = (await db.execute(target_query)).scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario docente no encontrado")
    if target_user.id == liga.usuario_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El propietario ya tiene acceso completo")

    result = await db.execute(
        select(LeagueTeacherMembership)
        .where(
            LeagueTeacherMembership.liga_id == liga_id,
            LeagueTeacherMembership.user_id == target_user.id,
        )
        .options(selectinload(LeagueTeacherMembership.user))
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        membership = LeagueTeacherMembership(
            liga_id=liga_id,
            user_id=target_user.id,
            created_by=current_user.id,
            user=target_user,
        )
        db.add(membership)
    else:
        membership.status = "active"
        membership.revoked_by = None
        membership.revoked_at = None
        membership.user = target_user

    apply_role_defaults(
        membership,
        payload.role,
        payload.permissions.explicit_values() if payload.permissions else None,
    )

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="upsert_liga_docente",
        resource="liga",
        resource_id=liga_id,
        resource_name=liga.nombre,
        ip_address=request.client.host if request.client else None,
        details={"member_user_id": target_user.id, "role": membership.role},
    )
    await db.commit()
    await db.refresh(membership)
    membership.user = target_user
    return _serialize_membership(membership)


@router.delete("/{liga_id}/docentes/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_liga_docente(
    liga_id: int,
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revocar el acceso de un docente colaborador sin borrar trazabilidad."""
    liga = await db.get(Liga, liga_id)
    await ensure_liga_permission(
        db,
        liga,
        current_user,
        MANAGE_MEMBERS,
        forbidden_detail="No tienes permisos para gestionar docentes",
    )

    result = await db.execute(
        select(LeagueTeacherMembership).where(
            LeagueTeacherMembership.liga_id == liga_id,
            LeagueTeacherMembership.user_id == user_id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente asociado no encontrado")

    await revoke_membership(membership, current_user)
    await log_audit_event(
        db,
        user_id=current_user.id,
        action="revoke_liga_docente",
        resource="liga",
        resource_id=liga_id,
        resource_name=liga.nombre,
        ip_address=request.client.host if request.client else None,
        details={"member_user_id": user_id},
    )
    await db.commit()

@router.delete("/{liga_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_liga(
    request: Request,
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una liga (y todos sus datos en cascada).
    """
    liga = await db.get(Liga, liga_id)

    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar esta liga"
        )

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        user_id=current_user.id,
        action="delete_liga",
        resource="liga",
        resource_id=liga_id,
        resource_name=liga.nombre,
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(liga)
    await db.commit()

@router.get("/{liga_id}/clasificacion")
async def get_clasificacion(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener clasificación de la liga.
    
    Incluye:
    - Puntos deportivos (sistema 3-2-1)
    - Puntos educativos (MRPS + arbitraje + grada)
    - Total de puntos
    """
    liga = await db.get(Liga, liga_id)
    
    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )
    
    await ensure_liga_permission(db, liga, current_user, VIEW_LEAGUE)
    
    clasificacion = await ClasificacionService.calcular_clasificacion(liga_id, db)
    
    return {
        "liga_id": liga_id,
        "liga_nombre": liga.nombre,
        "clasificacion": clasificacion
    }

# DEPRECATED: Use /jornadas/{id}/generar-calendario instead
# This endpoint generated entire league calendar at once
# New approach: Generate calendar per jornada for better control
"""
@router.post("/{liga_id}/generar-calendario", status_code=status.HTTP_201_CREATED)
async def generate_calendar(
    liga_id: int,
    calendar_data: CalendarCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # DEPRECATED - Use /jornadas/{id}/generar-calendario for per-jornada generation
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Este endpoint está deprecado. Usa /jornadas/{id}/generar-calendario para generar partidos por jornada."
    )
"""

@router.get("/{liga_id}/export/clasificacion/csv")
async def export_clasificacion_csv(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exportar clasificación a CSV.
    """
    liga = await db.get(Liga, liga_id)
    await ensure_liga_permission(db, liga, current_user, VIEW_LEAGUE, not_found_detail="Liga no encontrada")
        
    clasificacion = await ClasificacionService.calcular_clasificacion(liga_id, db)
    
    from app.services.report_service import ReportService
    from fastapi.responses import Response
    
    csv_content = ReportService.generate_clasificacion_csv(clasificacion)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=clasificacion_{liga_id}.csv"}
    )

@router.get("/{liga_id}/export/clasificacion/pdf")
async def export_clasificacion_pdf(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exportar clasificación a PDF.
    """
    liga = await db.get(Liga, liga_id)
    await ensure_liga_permission(db, liga, current_user, VIEW_LEAGUE, not_found_detail="Liga no encontrada")
        
    clasificacion = await ClasificacionService.calcular_clasificacion(liga_id, db)
    
    from app.services.report_service import ReportService
    from fastapi.responses import Response
    
    pdf_content = ReportService.generate_clasificacion_pdf(liga.nombre, clasificacion)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=clasificacion_{liga_id}.pdf"}
    )


@router.get("/{liga_id}/export/estadisticas")
async def export_estadisticas(
    liga_id: int,
    formato: str = "csv",
    jornada_id: int = None,
    equipo_id: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Exporta datos estadísticos de partidos (puntos, marcador, roles) por jornada o equipo.
    Diseñado para análisis matemático en clase (Excel/Sheets/PDF).
    """
    liga = await db.get(Liga, liga_id)
    await ensure_liga_permission(db, liga, current_user, VIEW_LEAGUE, not_found_detail="Liga no encontrada")

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
    if jornada_id:
        query = query.where(Partido.jornada_id == jornada_id)
    if equipo_id:
        from sqlalchemy import or_
        query = query.where(
            or_(Partido.equipo_local_id == equipo_id, Partido.equipo_visitante_id == equipo_id)
        )

    result = await db.execute(query)
    partidos = result.scalars().all()

    partidos_data = []
    for p in partidos:
        marcador_local, marcador_visitante = p.extraer_marcador_deportivo()
        partidos_data.append({
            "jornada_nombre": p.jornada.nombre if p.jornada else "",
            "jornada_numero": p.jornada.numero if p.jornada else "",
            "fecha_hora": p.fecha_hora.strftime("%d/%m/%Y %H:%M") if p.fecha_hora else "",
            "deporte": p.tipo_deporte.nombre if p.tipo_deporte else "",
            "equipo_local": p.equipo_local.nombre if p.equipo_local else "",
            "equipo_visitante": p.equipo_visitante.nombre if p.equipo_visitante else "",
            "arbitro": p.arbitro.nombre if p.arbitro else "",
            "tutor_grada_local": p.tutor_grada_local.nombre if p.tutor_grada_local else "",
            "tutor_grada_visitante": p.tutor_grada_visitante.nombre if p.tutor_grada_visitante else "",
            "marcador_local": marcador_local,
            "marcador_visitante": marcador_visitante,
            "resultado": p.resultado or "",
            "puntos_local": p.puntos_local or 0,
            "puntos_visitante": p.puntos_visitante or 0,
            "puntos_jl_local": p.puntos_juego_limpio_local or 0,
            "puntos_jl_visitante": p.puntos_juego_limpio_visitante or 0,
            "puntos_arbitro": p.puntos_arbitro or 0,
            "puntos_grada_local": p.puntos_grada_local or 0,
            "puntos_grada_visitante": p.puntos_grada_visitante or 0,
            "arbitro_media": round(p.arbitro_media, 2) if p.arbitro_media is not None else "",
            "finalizado": p.finalizado,
        })

    from app.services.report_service import ReportService
    from fastapi.responses import Response
    safe_nombre = liga.nombre.lower().replace(" ", "_")

    if formato.lower() == "pdf":
        content = ReportService.generate_estadisticas_pdf(liga.nombre, partidos_data)
        filename = f"estadisticas_{safe_nombre}.pdf"
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    content = ReportService.generate_estadisticas_csv(liga.nombre, partidos_data)
    filename = f"estadisticas_{safe_nombre}.csv"
    return Response(
        content=content.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
