#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

import random
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Liga, Equipo, Partido, TipoDeporte
from app.models.fase_final import FaseFinal, CruceFase
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.schemas.fase_final import (
    FaseFinalCreate,
    FaseFinalResponse,
    CruceFaseResponse,
    GenerarCrucesPayload,
    ResolverCrucePayload,
)

router = APIRouter()


async def _get_liga_owned(liga_id: int, db: AsyncSession, user: User) -> Liga:
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if not user.is_superuser and liga.usuario_id != user.id:
        raise HTTPException(status_code=403, detail="Sin permisos")
    return liga


async def _load_fase(fase_id: int, db: AsyncSession) -> FaseFinal:
    result = await db.execute(
        select(FaseFinal)
        .where(FaseFinal.id == fase_id)
        .options(
            selectinload(FaseFinal.cruces).selectinload(CruceFase.equipo_a),
            selectinload(FaseFinal.cruces).selectinload(CruceFase.equipo_b),
            selectinload(FaseFinal.cruces).selectinload(CruceFase.ganador),
            selectinload(FaseFinal.cruces).selectinload(CruceFase.partidos),
        )
    )
    fase = result.scalar_one_or_none()
    if not fase:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    return fase


def _fase_to_response(fase: FaseFinal) -> dict:
    cruces = []
    for cruce in fase.cruces:
        cruces.append({
            "id": cruce.id,
            "fase_id": cruce.fase_id,
            "equipo_a": {"id": cruce.equipo_a.id, "nombre": cruce.equipo_a.nombre, "logo_url": cruce.equipo_a.logo_url},
            "equipo_b": {"id": cruce.equipo_b.id, "nombre": cruce.equipo_b.nombre, "logo_url": cruce.equipo_b.logo_url},
            "orden": cruce.orden,
            "ganador_id": cruce.ganador_id,
            "estado": cruce.estado,
            "created_at": cruce.created_at,
            "partidos_ids": [p.id for p in cruce.partidos],
        })
    return {
        "id": fase.id,
        "liga_id": fase.liga_id,
        "nombre": fase.nombre,
        "num_partidos_por_cruce": fase.num_partidos_por_cruce,
        "asignar_roles_auto": fase.asignar_roles_auto,
        "estado": fase.estado,
        "created_at": fase.created_at,
        "updated_at": fase.updated_at,
        "cruces": cruces,
    }


@router.get("/{liga_id}/fases-finales", response_model=List[FaseFinalResponse])
async def list_fases_finales(
    liga_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_liga_owned(liga_id, db, current_user)
    result = await db.execute(
        select(FaseFinal)
        .where(FaseFinal.liga_id == liga_id)
        .options(
            selectinload(FaseFinal.cruces).selectinload(CruceFase.equipo_a),
            selectinload(FaseFinal.cruces).selectinload(CruceFase.equipo_b),
            selectinload(FaseFinal.cruces).selectinload(CruceFase.ganador),
            selectinload(FaseFinal.cruces).selectinload(CruceFase.partidos),
        )
        .order_by(FaseFinal.created_at)
    )
    fases = result.scalars().all()
    return [_fase_to_response(f) for f in fases]


@router.post("/{liga_id}/fases-finales", response_model=FaseFinalResponse, status_code=status.HTTP_201_CREATED)
async def create_fase_final(
    liga_id: int,
    payload: FaseFinalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_liga_owned(liga_id, db, current_user)
    fase = FaseFinal(
        liga_id=liga_id,
        nombre=payload.nombre,
        num_partidos_por_cruce=payload.num_partidos_por_cruce,
        asignar_roles_auto=payload.asignar_roles_auto,
    )
    db.add(fase)
    await db.commit()
    await db.refresh(fase)
    fase = await _load_fase(fase.id, db)
    return _fase_to_response(fase)


@router.post("/{liga_id}/fases-finales/{fase_id}/generar-cruces", response_model=FaseFinalResponse)
async def generar_cruces(
    liga_id: int,
    fase_id: int,
    payload: GenerarCrucesPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera cruces desde la clasificación actual. top_n equipos clasificados."""
    await _get_liga_owned(liga_id, db, current_user)
    fase = await _load_fase(fase_id, db)
    if fase.liga_id != liga_id:
        raise HTTPException(status_code=403, detail="Fase no pertenece a esta liga")
    if fase.cruces:
        raise HTTPException(status_code=409, detail="Esta fase ya tiene cruces generados")

    # Obtener equipos clasificados por puntos totales
    equipos_result = await db.execute(
        select(Equipo)
        .where(Equipo.liga_id == liga_id)
        .order_by(
            (Equipo.puntos_competitivos + Equipo.puntos_arbitraje + Equipo.puntos_grada).desc()
        )
        .limit(payload.top_n)
    )
    equipos = list(equipos_result.scalars().all())

    if len(equipos) < 2:
        raise HTTPException(status_code=422, detail="Se necesitan al menos 2 equipos para generar cruces")

    if len(equipos) % 2 != 0:
        equipos = equipos[:len(equipos) - 1]

    random.shuffle(equipos)

    # Determinar deportes disponibles para los partidos de cruce
    deportes_disponibles: list[int] = []
    if payload.tipo_deporte_ids:
        deportes_disponibles = payload.tipo_deporte_ids
    else:
        dep_result = await db.execute(
            select(Partido.tipo_deporte_id)
            .where(Partido.liga_id == liga_id, Partido.cruce_id.is_(None))
            .distinct()
        )
        deportes_disponibles = [r[0] for r in dep_result.all() if r[0]]

    if not deportes_disponibles:
        dep_result = await db.execute(select(TipoDeporte.id).limit(1))
        row = dep_result.scalar_one_or_none()
        if row:
            deportes_disponibles = [row]

    # Crear cruces en pares
    for i, orden in enumerate(range(0, len(equipos), 2)):
        equipo_a = equipos[orden]
        equipo_b = equipos[orden + 1]
        cruce = CruceFase(
            fase_id=fase.id,
            equipo_a_id=equipo_a.id,
            equipo_b_id=equipo_b.id,
            orden=i,
        )
        db.add(cruce)
        await db.flush()

        # Crear partidos del cruce con deportes asignados aleatoriamente
        deportes_cruce = []
        if deportes_disponibles:
            muestra = deportes_disponibles * fase.num_partidos_por_cruce
            random.shuffle(muestra)
            deportes_cruce = muestra[:fase.num_partidos_por_cruce]
        else:
            deportes_cruce = [None] * fase.num_partidos_por_cruce

        # Equipos eliminados actúan como árbitros/grada si asignar_roles_auto
        equipos_eliminados_ids = [
            e.id for e in equipos
            if e.id not in (equipo_a.id, equipo_b.id)
        ]

        for j, deporte_id in enumerate(deportes_cruce):
            arbitro_id = None
            tutor_grada_local_id = None
            tutor_grada_visitante_id = None

            if fase.asignar_roles_auto and equipos_eliminados_ids:
                pool = list(equipos_eliminados_ids)
                random.shuffle(pool)
                if pool:
                    arbitro_id = pool[0]
                if len(pool) > 1:
                    tutor_grada_local_id = pool[1]
                if len(pool) > 2:
                    tutor_grada_visitante_id = pool[2]

            partido = Partido(
                liga_id=liga_id,
                tipo_deporte_id=deporte_id,
                equipo_local_id=equipo_a.id,
                equipo_visitante_id=equipo_b.id,
                arbitro_id=arbitro_id,
                tutor_grada_local_id=tutor_grada_local_id,
                tutor_grada_visitante_id=tutor_grada_visitante_id,
                cruce_id=cruce.id,
                marcador={},
            )
            db.add(partido)

    await db.commit()
    fase = await _load_fase(fase_id, db)
    return _fase_to_response(fase)


@router.post("/{liga_id}/fases-finales/{fase_id}/cruces/{cruce_id}/resolver", response_model=CruceFaseResponse)
async def resolver_cruce(
    liga_id: int,
    fase_id: int,
    cruce_id: int,
    payload: ResolverCrucePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca el ganador de un cruce y lo marca como finalizado."""
    await _get_liga_owned(liga_id, db, current_user)

    result = await db.execute(
        select(CruceFase)
        .where(CruceFase.id == cruce_id, CruceFase.fase_id == fase_id)
        .options(
            selectinload(CruceFase.equipo_a),
            selectinload(CruceFase.equipo_b),
            selectinload(CruceFase.ganador),
            selectinload(CruceFase.partidos),
        )
    )
    cruce = result.scalar_one_or_none()
    if not cruce:
        raise HTTPException(status_code=404, detail="Cruce no encontrado")

    if payload.ganador_id not in (cruce.equipo_a_id, cruce.equipo_b_id):
        raise HTTPException(status_code=422, detail="El ganador debe ser uno de los dos equipos del cruce")

    cruce.ganador_id = payload.ganador_id
    cruce.estado = "finalizado"
    await db.commit()
    await db.refresh(cruce)
    await db.refresh(cruce, attribute_names=["equipo_a", "equipo_b", "ganador", "partidos"])

    return {
        "id": cruce.id,
        "fase_id": cruce.fase_id,
        "equipo_a": {"id": cruce.equipo_a.id, "nombre": cruce.equipo_a.nombre, "logo_url": cruce.equipo_a.logo_url},
        "equipo_b": {"id": cruce.equipo_b.id, "nombre": cruce.equipo_b.nombre, "logo_url": cruce.equipo_b.logo_url},
        "orden": cruce.orden,
        "ganador_id": cruce.ganador_id,
        "estado": cruce.estado,
        "created_at": cruce.created_at,
        "partidos_ids": [p.id for p in cruce.partidos],
    }


@router.delete("/{liga_id}/fases-finales/{fase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fase_final(
    liga_id: int,
    fase_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_liga_owned(liga_id, db, current_user)
    fase = await db.get(FaseFinal, fase_id)
    if not fase or fase.liga_id != liga_id:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    await db.delete(fase)
    await db.commit()
