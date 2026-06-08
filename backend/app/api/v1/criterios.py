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
API Router for CriterioEvaluacion - Criterios de evaluación personalizables.

Permite a docentes gestionar criterios de evaluación para ligas en modo personalizado.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.api.deps import get_current_user
from app.models import User, Liga, CriterioEvaluacion
from app.schemas.criterio_evaluacion import (
    CriterioEvaluacionCreate,
    CriterioEvaluacionUpdate,
    CriterioEvaluacionResponse,
    PlantillaEvaluacion,
    PLANTILLAS_EVALUACION,
)

router = APIRouter()

MAX_CRITERIOS_POR_LIGA = 10


@router.get("/plantillas", response_model=List[PlantillaEvaluacion])
async def get_plantillas():
    """
    Obtener plantillas predefinidas de criterios de evaluación.
    
    Estas plantillas sirven como punto de partida para configurar
    criterios personalizados en una liga.
    """
    return PLANTILLAS_EVALUACION


@router.get("/{liga_id}/criterios", response_model=List[CriterioEvaluacionResponse])
async def list_criterios(
    liga_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todos los criterios de evaluación de una liga.
    """
    # Verificar que la liga existe y pertenece al usuario
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta liga")
    
    # Obtener criterios ordenados
    result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == liga_id)
        .order_by(CriterioEvaluacion.orden, CriterioEvaluacion.id)
    )
    criterios = result.scalars().all()
    
    return criterios


@router.post("/{liga_id}/criterios", response_model=CriterioEvaluacionResponse, status_code=status.HTTP_201_CREATED)
async def create_criterio(
    liga_id: int,
    criterio_data: CriterioEvaluacionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo criterio de evaluación para una liga.
    
    Solo disponible para ligas en modo 'personalizado'.
    Máximo 10 criterios por liga.
    """
    # Verificar liga
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta liga")
    
    # Verificar modo evaluación
    if liga.modo_evaluacion != 'personalizado':
        raise HTTPException(
            status_code=400, 
            detail="Solo puedes añadir criterios en ligas con modo de evaluación 'personalizado'"
        )
    
    # Verificar límite de criterios
    count_result = await db.execute(
        select(CriterioEvaluacion.id)
        .where(CriterioEvaluacion.liga_id == liga_id)
    )
    count = len(count_result.scalars().all())
    if count >= MAX_CRITERIOS_POR_LIGA:
        raise HTTPException(
            status_code=400,
            detail=f"Has alcanzado el máximo de {MAX_CRITERIOS_POR_LIGA} criterios por liga"
        )
    
    # Verificar código único
    existing = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == liga_id)
        .where(CriterioEvaluacion.codigo == criterio_data.codigo)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un criterio con el código '{criterio_data.codigo}' en esta liga"
        )
    
    # Crear criterio
    criterio = CriterioEvaluacion(
        liga_id=liga_id,
        **criterio_data.model_dump()
    )
    db.add(criterio)
    await db.commit()
    await db.refresh(criterio)
    
    return criterio


@router.post("/{liga_id}/criterios/desde-plantilla/{nombre_plantilla}", response_model=List[CriterioEvaluacionResponse])
async def create_criterios_from_plantilla(
    liga_id: int,
    nombre_plantilla: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear criterios a partir de una plantilla predefinida.
    
    Reemplaza todos los criterios existentes de la liga.
    """
    # Verificar liga
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta liga")
    
    # Verificar modo evaluación
    if liga.modo_evaluacion != 'personalizado':
        raise HTTPException(
            status_code=400, 
            detail="Solo puedes añadir criterios en ligas con modo de evaluación 'personalizado'"
        )
    
    # Buscar plantilla
    plantilla = next((p for p in PLANTILLAS_EVALUACION if p.nombre == nombre_plantilla), None)
    if not plantilla:
        raise HTTPException(status_code=404, detail=f"Plantilla '{nombre_plantilla}' no encontrada")
    
    # Verificar límite
    if len(plantilla.criterios) > MAX_CRITERIOS_POR_LIGA:
        raise HTTPException(
            status_code=400,
            detail=f"La plantilla tiene más de {MAX_CRITERIOS_POR_LIGA} criterios"
        )
    
    # Eliminar criterios existentes
    existing = await db.execute(
        select(CriterioEvaluacion).where(CriterioEvaluacion.liga_id == liga_id)
    )
    for c in existing.scalars().all():
        await db.delete(c)
    
    # Crear nuevos criterios
    criterios_creados = []
    for i, crit_data in enumerate(plantilla.criterios):
        criterio = CriterioEvaluacion(
            liga_id=liga_id,
            nombre=crit_data.nombre,
            codigo=crit_data.codigo,
            descripcion=crit_data.descripcion,
            categoria=crit_data.categoria,
            escala_min=crit_data.escala_min,
            escala_max=crit_data.escala_max,
            icono=crit_data.icono,
            orden=i,
            activo=True
        )
        db.add(criterio)
        criterios_creados.append(criterio)
    
    await db.commit()
    
    # Refrescar todos
    for c in criterios_creados:
        await db.refresh(c)
    
    return criterios_creados


@router.put("/{liga_id}/criterios/{criterio_id}", response_model=CriterioEvaluacionResponse)
async def update_criterio(
    liga_id: int,
    criterio_id: int,
    criterio_data: CriterioEvaluacionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un criterio de evaluación.
    """
    # Verificar liga
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta liga")
    
    # Obtener criterio
    criterio = await db.get(CriterioEvaluacion, criterio_id)
    if not criterio or criterio.liga_id != liga_id:
        raise HTTPException(status_code=404, detail="Criterio no encontrado en esta liga")
    
    # Actualizar campos
    update_data = criterio_data.model_dump(exclude_unset=True)
    
    # Verificar código único si se está cambiando
    if 'codigo' in update_data and update_data['codigo'] != criterio.codigo:
        existing = await db.execute(
            select(CriterioEvaluacion)
            .where(CriterioEvaluacion.liga_id == liga_id)
            .where(CriterioEvaluacion.codigo == update_data['codigo'])
            .where(CriterioEvaluacion.id != criterio_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un criterio con el código '{update_data['codigo']}' en esta liga"
            )
    
    for key, value in update_data.items():
        setattr(criterio, key, value)
    
    await db.commit()
    await db.refresh(criterio)
    
    return criterio


@router.delete("/{liga_id}/criterios/{criterio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_criterio(
    liga_id: int,
    criterio_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un criterio de evaluación.
    
    ADVERTENCIA: Esto eliminará también todas las evaluaciones asociadas a este criterio.
    """
    # Verificar liga
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta liga")
    
    # Obtener criterio
    criterio = await db.get(CriterioEvaluacion, criterio_id)
    if not criterio or criterio.liga_id != liga_id:
        raise HTTPException(status_code=404, detail="Criterio no encontrado en esta liga")
    
    await db.delete(criterio)
    await db.commit()
    
    return None


@router.put("/{liga_id}/criterios/reordenar", response_model=List[CriterioEvaluacionResponse])
async def reordenar_criterios(
    liga_id: int,
    orden_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reordenar los criterios de una liga.
    
    Recibe una lista de IDs de criterios en el nuevo orden deseado.
    """
    # Verificar liga
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta liga")
    
    # Obtener criterios
    result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == liga_id)
    )
    criterios = {c.id: c for c in result.scalars().all()}
    
    # Verificar que todos los IDs pertenecen a la liga
    for cid in orden_ids:
        if cid not in criterios:
            raise HTTPException(
                status_code=400,
                detail=f"El criterio con ID {cid} no pertenece a esta liga"
            )
    
    # Actualizar orden
    for i, cid in enumerate(orden_ids):
        criterios[cid].orden = i
    
    await db.commit()
    
    # Devolver criterios ordenados
    result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == liga_id)
        .order_by(CriterioEvaluacion.orden)
    )
    
    return result.scalars().all()
