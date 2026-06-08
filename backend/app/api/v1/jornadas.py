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
API endpoints for Jornadas.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.database import get_db
from app.models import Jornada, Liga, User, Partido, Equipo
from app.schemas import JornadaCreate, JornadaUpdate, JornadaResponse, JornadaWithStats
from app.api.deps import get_current_user
from app.services.match_role_schema_service import force_lock_schema

router = APIRouter()

@router.get("/", response_model=List[JornadaWithStats])
async def list_jornadas_by_liga(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todas las jornadas de una liga.
    """
    # Verificar liga
    liga = await db.get(Liga, liga_id)
    if not liga or liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )
    
    # Obtener jornadas
    result = await db.execute(
        select(Jornada).where(Jornada.liga_id == liga_id).order_by(Jornada.numero, Jornada.created_at)
    )
    jornadas = result.scalars().all()
    
    # Añadir stats (total partidos)
    jornadas_with_stats = []
    for jornada in jornadas:
        result_partidos = await db.execute(
            select(Partido).where(Partido.jornada_id == jornada.id)
        )
        total_partidos = len(result_partidos.scalars().all())
        
        jornada_dict = {
            "id": jornada.id,
            "nombre": jornada.nombre,
            "fecha_inicio": jornada.fecha_inicio,
            "fecha_fin": jornada.fecha_fin,
            "numero": jornada.numero,
            "liga_id": jornada.liga_id,
            "created_at": jornada.created_at,
            "total_partidos": total_partidos
        }
        jornadas_with_stats.append(jornada_dict)
        
    return jornadas_with_stats

@router.post("/", response_model=JornadaResponse, status_code=status.HTTP_201_CREATED)
async def create_jornada(
    jornada_data: JornadaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva jornada.
    """
    # Verificar liga
    liga = await db.get(Liga, jornada_data.liga_id)
    if not liga or liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )

    numero = jornada_data.numero
    if numero is None:
        max_numero = await db.scalar(
            select(func.max(Jornada.numero)).where(Jornada.liga_id == jornada_data.liga_id)
        )
        numero = (max_numero or 0) + 1
    
    nueva_jornada = Jornada(
        nombre=jornada_data.nombre,
        fecha_inicio=jornada_data.fecha_inicio,
        fecha_fin=jornada_data.fecha_fin,
        numero=numero,
        liga_id=jornada_data.liga_id
    )
    
    db.add(nueva_jornada)
    await db.commit()
    await db.refresh(nueva_jornada)
    
    return nueva_jornada

@router.get("/{jornada_id}", response_model=JornadaResponse)
async def get_jornada(
    jornada_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener una jornada específica.
    """
    jornada = await db.get(Jornada, jornada_id)
    
    if not jornada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jornada no encontrada"
        )
    
    # Verificar permisos via liga
    liga = await db.get(Liga, jornada.liga_id)
    if not liga or liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    return jornada

@router.put("/{jornada_id}", response_model=JornadaResponse)
async def update_jornada(
    jornada_id: int,
    jornada_data: JornadaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar una jornada.
    """
    jornada = await db.get(Jornada, jornada_id)
    
    if not jornada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jornada no encontrada"
        )
    
    # Verificar permisos
    liga = await db.get(Liga, jornada.liga_id)
    if not liga or liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    # Actualizar campos
    if jornada_data.nombre is not None:
        jornada.nombre = jornada_data.nombre
    if jornada_data.fecha_inicio is not None:
        jornada.fecha_inicio = jornada_data.fecha_inicio
    if jornada_data.fecha_fin is not None:
        jornada.fecha_fin = jornada_data.fecha_fin
    if jornada_data.numero is not None:
        jornada.numero = jornada_data.numero
    
    await db.commit()
    await db.refresh(jornada)
    
    return jornada

@router.delete("/{jornada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jornada(
    request: Request,
    jornada_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una jornada.
    """
    jornada = await db.get(Jornada, jornada_id)

    if not jornada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jornada no encontrada"
        )

    liga = await db.get(Liga, jornada.liga_id)
    if not liga or liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )

    from app.services.audit_service import log_audit_event
    await log_audit_event(
        db,
        user_id=current_user.id,
        action="delete_jornada",
        resource="jornada",
        resource_id=jornada_id,
        resource_name=jornada.nombre,
        ip_address=request.client.host if request.client else None,
        details={"liga_id": jornada.liga_id},
    )
    await db.delete(jornada)
    await db.commit()


@router.post("/{jornada_id}/generar-calendario")
async def generar_calendario(
    jornada_id: int,
    tipo_deporte_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generar partidos automáticamente para una jornada.
    
    El algoritmo utilizado depende del modo de competición de la liga:
    - Liga multi-deporte: Genera TODOS los partidos posibles (todas las combinaciones)
    - Liga de un solo deporte: Usa Round-Robin tradicional (Berger)
    
    Asigna 5 equipos diferentes a cada partido cuando hay suficientes:
    - Equipo Local
    - Equipo Visitante  
    - Equipo Árbitro
    - Equipo Grada Local
    - Equipo Grada Visitante
    """
    from app.services.calendar_generator import generar_calendario_jornada, generar_calendario_all_vs_all
    
    # Get jornada
    jornada = await db.get(Jornada, jornada_id)
    
    if not jornada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jornada no encontrada"
        )
    
    # Verify liga ownership
    liga = await db.get(Liga, jornada.liga_id)
    if not liga or liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para esta liga"
        )

    schema = await force_lock_schema(db, liga)
    roles_per_match = schema.roles_per_match

    # Ensure jornada.numero is set (required for Round-Robin algorithm)
    if jornada.numero is None:
        max_numero = await db.scalar(
            select(func.max(Jornada.numero)).where(Jornada.liga_id == jornada.liga_id)
        )
        jornada.numero = (max_numero or 0) + 1
        await db.flush()
    
    # Generate calendar based on league mode
    try:
        # Count teams to decide algorithm for small leagues
        result_equipos = await db.execute(
            select(func.count()).select_from(Equipo).where(Equipo.liga_id == jornada.liga_id)
        )
        num_equipos = result_equipos.scalar() or 0

        if num_equipos < roles_per_match:
            raise ValueError(
                f"Se requieren minimo {roles_per_match} equipos para formato de {roles_per_match} roles por partido"
            )

        # FIX: Small leagues (<= 4 teams) MUST use All-vs-All to generate enough matches
        # (Round Robin generates too few matches for small groups: 2 for 4 teams, fails for 3)
        if liga.modo_competicion == 'multi_deporte' or num_equipos <= 4:
            # All-vs-all mode: generate all possible combinations
            partidos = await generar_calendario_all_vs_all(
                db=db,
                jornada_id=jornada_id,
                liga_id=jornada.liga_id,
                tipo_deporte_id=tipo_deporte_id,
                roles_per_match=roles_per_match,
            )
            modo_usado = "Todas las combinaciones (Automatico para <= 4 equipos)"
        else:
            # Traditional Round-Robin mode
            partidos = await generar_calendario_jornada(
                db=db,
                jornada_id=jornada_id,
                liga_id=jornada.liga_id,
                tipo_deporte_id=tipo_deporte_id,
                roles_per_match=roles_per_match,
            )
            modo_usado = "Round-Robin tradicional (único deporte)"
        
        await db.commit()
        
        return {
            "message": f"Calendario generado exitosamente",
            "modo": modo_usado,
            "jornada_id": jornada_id,
            "partidos_creados": len(partidos),
            "equipos_por_partido": roles_per_match
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar calendario: {str(e)}"
        )
