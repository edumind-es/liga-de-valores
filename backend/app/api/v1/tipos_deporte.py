#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

"""
API endpoints for TiposDeporte (Sports catalog).
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pathlib import Path
import os
import shutil
import json

from app.database import get_db
from app.config import settings
from app.utils.text import slugify
from app.models import TipoDeporte
from app.models.user import User
from app.schemas import TipoDeporteResponse
from app.schemas.tipo_deporte import TipoDeporteCreate
from app.api.deps import get_current_superuser
from app.utils.upload_validation import validate_upload_file
router = APIRouter()

MAX_SPORT_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_VT_MIME_TYPES = {"application/pdf"}
ALLOWED_LOGO_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
LOGO_MIME_EXTENSION_MAP = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}

@router.get("/", response_model=List[TipoDeporteResponse])
async def list_tipos_deporte(
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todos los tipos de deporte disponibles.
    Endpoint público (no requiere autenticación).
    """
    result = await db.execute(select(TipoDeporte))
    tipos = result.scalars().all()
    return tipos

@router.get("/{tipo_id}", response_model=TipoDeporteResponse)
async def get_tipo_deporte(
    tipo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener un tipo de deporte específico.
    """
    tipo = await db.get(TipoDeporte, tipo_id)
    
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tipo de deporte no encontrado"
        )
    
    return tipo

@router.post("/", response_model=TipoDeporteResponse, status_code=201)
async def create_tipo_deporte(
    data: TipoDeporteCreate,
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo tipo de deporte.
    Solo superusuarios.
    """
    # Slugify code
    safe_code = slugify(data.codigo)
    
    # Check if codigo already exists
    existing = await db.execute(select(TipoDeporte).where(TipoDeporte.codigo == safe_code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un deporte con el código '{safe_code}'"
        )
    
    new_tipo = TipoDeporte(
        nombre=data.nombre,
        codigo=safe_code,
        tipo_marcador=data.tipo_marcador,
        permite_empate=data.permite_empate,
        config=data.config,
        descripcion=data.descripcion,
        icono=data.icono,
        vt_file=data.vt_file,
        logo_file=data.logo_file
    )
    
    db.add(new_tipo)
    await db.commit()
    await db.refresh(new_tipo)
    
    return new_tipo

@router.put("/{tipo_id}", response_model=TipoDeporteResponse)
async def update_tipo_deporte(
    tipo_id: int,
    nombre: Optional[str] = Form(None),
    config: Optional[str] = Form(None), # JSON string
    descripcion: Optional[str] = Form(None),
    vt_file: Optional[UploadFile] = File(None),
    logo_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un tipo de deporte (incluyendo archivos).
    Solo superusuarios.
    """
    tipo = await db.get(TipoDeporte, tipo_id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de deporte no encontrado")
    
    if nombre:
        tipo.nombre = nombre
    if descripcion:
        tipo.descripcion = descripcion
    if config:
        try:
            tipo.config = json.loads(config)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuración JSON inválida: {exc}"
            )

    # File uploads
    upload_dir = os.path.join(settings.UPLOAD_DIR, "sports")
    os.makedirs(upload_dir, exist_ok=True)

    safe_code = slugify(tipo.codigo)

    if vt_file:
        validate_upload_file(
            vt_file,
            allowed_mime_types=ALLOWED_VT_MIME_TYPES,
            max_bytes=MAX_SPORT_UPLOAD_BYTES,
            field_name="vt_file",
        )
        file_path = os.path.join(upload_dir, f"{safe_code}_vt.pdf")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(vt_file.file, buffer)
        # Store relative path for frontend access via /static/uploads/sports/...
        tipo.vt_file = f"/static/uploads/sports/{safe_code}_vt.pdf"

    if logo_file:
        validate_upload_file(
            logo_file,
            allowed_mime_types=ALLOWED_LOGO_MIME_TYPES,
            max_bytes=MAX_SPORT_UPLOAD_BYTES,
            field_name="logo_file",
        )
        ext = LOGO_MIME_EXTENSION_MAP.get(logo_file.content_type or "")
        if not ext:
            fallback_ext = Path(logo_file.filename or "").suffix.lower().lstrip(".")
            ext = fallback_ext or "png"
        file_path = os.path.join(upload_dir, f"{safe_code}_logo.{ext}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(logo_file.file, buffer)
        tipo.logo_file = f"/static/uploads/sports/{safe_code}_logo.{ext}"

    await db.commit()
    await db.refresh(tipo)
    return tipo

@router.delete("/{tipo_id}", status_code=204)
async def delete_tipo_deporte(
    tipo_id: int,
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un tipo de deporte.
    Solo superusuarios.
    """
    tipo = await db.get(TipoDeporte, tipo_id)
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tipo de deporte no encontrado"
        )
    
    await db.delete(tipo)
    await db.commit()
    return None
