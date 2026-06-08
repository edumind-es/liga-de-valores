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
API endpoints for Equipos (Teams).
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import List, Optional
import secrets
import os
from pathlib import Path

from app.database import get_db
from app.models import Equipo, Liga, User
from app.schemas import EquipoCreate, EquipoUpdate, EquipoResponse
from app.models import Partido, Jornada
from app.api.deps import get_current_user
from app.config import settings

router = APIRouter()


async def _ensure_unique_team_name(
    db: AsyncSession,
    *,
    liga_id: int,
    nombre: str,
    exclude_equipo_id: int | None = None,
) -> None:
    normalized = nombre.strip().lower()
    if not normalized:
        return

    query = select(Equipo.id).where(
        Equipo.liga_id == liga_id,
        func.lower(func.trim(Equipo.nombre)) == normalized,
    )
    if exclude_equipo_id is not None:
        query = query.where(Equipo.id != exclude_equipo_id)

    result = await db.execute(query.limit(1))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un equipo con ese nombre en la liga",
        )

@router.get("/", response_model=List[EquipoResponse])
async def list_equipos(
    liga_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar equipos.
    - Si se especifica liga_id: lista equipos de esa liga (verificando propiedad si no es superuser).
    - Si NO se especifica liga_id: SOLO superusers pueden listar todos los equipos.
    """
    query = select(Equipo)
    
    if liga_id:
        # Verificar que la liga pertenece al usuario si no es superuser
        if not current_user.is_superuser:
            liga = await db.get(Liga, liga_id)
            if not liga or liga.usuario_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Liga no encontrada o sin permisos"
                )
        query = query.where(Equipo.liga_id == liga_id)
    else:
        # Si no hay liga_id, debe ser superuser
        if not current_user.is_superuser:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se requiere especificar liga_id"
            )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    equipos = result.scalars().all()
    return equipos

@router.post("/", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
async def create_equipo(
    equipo_data: EquipoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo equipo en una liga.
    """
    # Verificar que la liga pertenece al usuario
    liga = await db.get(Liga, equipo_data.liga_id)
    # Permiso: Superuser o Propietario
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
        
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear equipos en esta liga"
        )

    await _ensure_unique_team_name(
        db,
        liga_id=equipo_data.liga_id,
        nombre=equipo_data.nombre,
    )
    
    # Generar token de acceso para QR
    acceso_token = secrets.token_urlsafe(32)
    
    nuevo_equipo = Equipo(
        nombre=equipo_data.nombre.strip(),
        color_principal=equipo_data.color_principal,
        liga_id=equipo_data.liga_id,
        acceso_token=acceso_token
    )
    
    db.add(nuevo_equipo)
    await db.commit()
    await db.refresh(nuevo_equipo)
    
    return nuevo_equipo

@router.get("/{equipo_id}", response_model=EquipoResponse)
async def get_equipo(
    equipo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener un equipo específico.
    """
    equipo = await db.get(Equipo, equipo_id)
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Verificar permisos
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:  # Should not happen via FK constraints usually
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    return equipo

@router.put("/{equipo_id}", response_model=EquipoResponse)
async def update_equipo(
    equipo_id: int,
    equipo_data: EquipoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un equipo.
    """
    equipo = await db.get(Equipo, equipo_id)
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Verificar permisos
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    # Actualizar campos
    if equipo_data.nombre is not None:
        await _ensure_unique_team_name(
            db,
            liga_id=equipo.liga_id,
            nombre=equipo_data.nombre,
            exclude_equipo_id=equipo.id,
        )
        equipo.nombre = equipo_data.nombre.strip()
    if equipo_data.color_principal is not None:
        equipo.color_principal = equipo_data.color_principal
    
    await db.commit()
    await db.refresh(equipo)
    
    return equipo

@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipo(
    equipo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un equipo.
    """
    equipo = await db.get(Equipo, equipo_id)
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Verificar permisos
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    # Eliminar logo si existe — verificar que la ruta resultante está dentro de UPLOAD_DIR
    if equipo.logo_filename:
        upload_root = Path(settings.UPLOAD_DIR).resolve()
        logo_path = (upload_root / equipo.logo_filename).resolve()
        if logo_path.is_relative_to(upload_root) and logo_path.exists():
            logo_path.unlink()
    
    await db.delete(equipo)
    await db.commit()

@router.post("/{equipo_id}/logo")
async def upload_logo(
    equipo_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload team logo. Creates PendingAction for review unless user is superuser.
    Superusers can upload logos directly.
    """
    from app.services.image_service import ImageService
    from app.models import PendingAction
    import json
    
    equipo = await db.get(Equipo, equipo_id)
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Verificar permisos
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    # Save logo to uploads (temporary for pending, permanent for superuser)
    logo_url = await ImageService.save_team_logo(file, equipo_id)
    
    # Superuser can apply directly
    if current_user.is_superuser:
        # Delete old logo if exists
        if equipo.logo_url:
            ImageService.delete_team_logo(equipo.logo_url)
        
        equipo.logo_url = logo_url
        equipo.logo_filename = logo_url.replace("/static/uploads/", "") if logo_url else None
        await db.commit()
        await db.refresh(equipo)
        
        return {
            "logo_url": logo_url,
            "message": "Logo actualizado exitosamente",
            "pending": False
        }
    
    # For normal teachers: create pending action for review
    pending = PendingAction(
        action_type="logo",
        status="pending",
        liga_id=liga.id,
        target_id=equipo_id,
        data_json={
            "logo_url": logo_url,
            "logo_filename": logo_url.rsplit("/", 1)[-1] if logo_url else None,
            "equipo_nombre": equipo.nombre,
            "uploaded_by": current_user.id
        },
        description=f"Nuevo logo para {equipo.nombre}"
    )
    db.add(pending)
    await db.commit()
    
    return {
        "logo_url": logo_url,
        "message": "Logo subido. Requiere aprobación del docente.",
        "pending": True,
        "pending_id": pending.id
    }

@router.delete("/{equipo_id}/logo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_logo(
    equipo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete team logo.
    """
    from app.services.image_service import ImageService
    
    equipo = await db.get(Equipo, equipo_id)
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Verificar permisos
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
    
    # Delete logo from disk
    if equipo.logo_url:
        ImageService.delete_team_logo(equipo.logo_url)
        equipo.logo_url = None
        await db.commit()


@router.get("/{equipo_id}/stats_history")
async def get_equipo_stats_history(
    equipo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener historial de estadísticas partido a partido para gráficos de evolución.
    """
    equipo = await db.get(Equipo, equipo_id)
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
        
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )

    # Consulta de partidos finalizados donde participa el equipo
    query = select(Partido, Jornada).join(Jornada).where(
        (Partido.liga_id == liga.id) &
        (Partido.finalizado == True) &
        ((Partido.equipo_local_id == equipo_id) | 
         (Partido.equipo_visitante_id == equipo_id) |
         (Partido.arbitro_id == equipo_id) |
         (Partido.tutor_grada_local_id == equipo_id) |
         (Partido.tutor_grada_visitante_id == equipo_id))
    ).order_by(Jornada.numero)
    
    result = await db.execute(query)
    rows = result.all()
    
    history = []
    
    for partido, jornada in rows:
        stats = {
            "jornada": f"J{jornada.numero}",
            "jornada_numero": jornada.numero,
            "partido_id": partido.id,
            "juego_limpio": 0,
            "arbitraje": 0.0, # Promedio si fue árbitro, o 0 si no
            "grada": 0.0,
            "rol": "jugador"
        }
        
        if partido.equipo_local_id == equipo_id:
            stats["juego_limpio"] = partido.puntos_juego_limpio_local
            stats["grada"] = partido.puntos_grada_local
            stats["rol"] = "local"
        elif partido.equipo_visitante_id == equipo_id:
            stats["juego_limpio"] = partido.puntos_juego_limpio_visitante
            stats["grada"] = partido.puntos_grada_visitante
            stats["rol"] = "visitante"
        elif partido.arbitro_id == equipo_id:
            # Calcular promedio de arbitraje
            c = partido.arbitro_conocimiento or 0
            g = partido.arbitro_gestion or 0
            a = partido.arbitro_apoyo or 0
            stats["arbitraje"] = round((c + g + a) / 3, 2)
            stats["rol"] = "arbitro"
        elif partido.tutor_grada_local_id == equipo_id:
            stats["grada"] = partido.puntos_grada_local
            stats["rol"] = "grada_local"
        elif partido.tutor_grada_visitante_id == equipo_id:
            stats["grada"] = partido.puntos_grada_visitante
            stats["rol"] = "grada_visitante"
            
        history.append(stats)
        
    return history

@router.post("/{equipo_id}/regenerate_token")
async def regenerate_token(
    equipo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerar token de acceso para el equipo.
    """
    equipo = await db.get(Equipo, equipo_id)
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
        
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")

    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
        
    # Regenerar token
    new_token = secrets.token_urlsafe(32)
    equipo.acceso_token = new_token
    
    await db.commit()
    await db.refresh(equipo)
    
    return {"acceso_token": new_token}

@router.get("/{equipo_id}/badges")
async def get_equipo_badges(
    equipo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener medallas (badges) del equipo calculadas dinámicamente.
    """
    from app.services.badges_service import BadgesService
    
    equipo = await db.get(Equipo, equipo_id)
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
        
    liga = await db.get(Liga, equipo.liga_id)
    # Allow public access? For now restrict to authorized users as requested in general
    if not liga:
         raise HTTPException(status_code=404, detail="Liga no encontrada")
    
    if not current_user.is_superuser and liga.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos"
        )
        
    badges = await BadgesService.calculate_badges(equipo_id, db)
    return badges
