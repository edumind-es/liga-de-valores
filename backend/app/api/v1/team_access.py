#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
API endpoints for Team Portal (public access via team token).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Form, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models import Equipo, Liga
from app.models.pending_action import PendingAction
from app.services.image_service import ImageService
from app.services.email_service import send_email_with_attachments
from app.services.team_contract_pdf import generate_team_contract_pdf
from app.core.rate_limit import limiter

router = APIRouter()


class TeamPublicInfo(BaseModel):
    """Public information about a team (no sensitive data)."""
    equipo_id: int
    equipo_nombre: str
    equipo_color: Optional[str]
    liga_id: int
    liga_nombre: str
    roles: List[str]
    commitments: dict
    allow_logo_editing: bool = True


class TeamJoinRequest(BaseModel):
    """Request to join a team with role and commitments."""
    nombre_estudiante: str
    rol: str
    compromisos_aceptados: List[str]


@router.post("/team/{token}/logo", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def submit_team_logo_proposal(
    request: Request,
    token: str,
    logo_data_url: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a public logo proposal without storing personal student data.
    The logo is queued for teacher review as a pending action.
    """
    result = await db.execute(
        select(Equipo).where(Equipo.acceso_token == token)
    )
    equipo = result.scalar_one_or_none()

    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )

    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )

    liga_config = liga.config if liga.config else {}
    if not liga_config.get("allow_logo_editing", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La edición de logo no está habilitada para esta liga",
        )

    logo_url = ImageService.save_team_logo_data_url(logo_data_url, equipo.id)
    pending = PendingAction(
        action_type="logo",
        status="pending",
        liga_id=liga.id,
        target_id=equipo.id,
        data_json={
            "logo_url": logo_url,
            "logo_filename": logo_url.rsplit("/", 1)[-1],
            "equipo_nombre": equipo.nombre,
            "submitted_via": "public_team_portal",
        },
        description=f"Propuesta pública de logo para {equipo.nombre}"
    )

    db.add(pending)
    await db.commit()
    await db.refresh(pending)

    return {
        "message": "Propuesta de logo enviada correctamente. El profesorado la revisará.",
        "equipo": equipo.nombre,
        "pending_id": pending.id,
        "logo_included": True,
    }


@router.get("/team/{token}", response_model=TeamPublicInfo)
async def get_team_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get public team information by access token.
    Returns team name, league name, available roles and commitments.
    """
    result = await db.execute(
        select(Equipo).where(Equipo.acceso_token == token)
    )
    equipo = result.scalar_one_or_none()
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Get liga for roles and commitments
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )
    
    # Default roles and commitments if not configured
    default_roles = ["Capitán/a", "Entrenador/a", "Árbitro/a", "Tutor/a de grada", "Preparador/a físico/a"]
    default_commitments = {
        "Capitán/a": ["Liderar con respeto", "Dar ejemplo", "Comunicar con el profesorado"],
        "Entrenador/a": ["Gestionar alineaciones", "Decidir cambios", "Organizar táctica"],
        "Árbitro/a": ["Ser imparcial", "Conocer las reglas", "Gestionar conflictos con calma"],
        "Tutor/a de grada": ["Asegurar que el equipo anime con respeto y deportividad", "Evitar insultos", "Celebrar sin humillar"],
        "Preparador/a físico/a": ["Ayudar en calentamiento", "Prevenir lesiones", "Motivar al equipo"]
    }
    
    roles = liga.team_roles if liga.team_roles else default_roles
    commitments = liga.team_commitments if liga.team_commitments else default_commitments
    
    # Check config for logo editing permission (default to True)
    liga_config = liga.config if liga.config else {}
    allow_logo = liga_config.get("allow_logo_editing", True)
    
    return TeamPublicInfo(
        equipo_id=equipo.id,
        equipo_nombre=equipo.nombre,
        equipo_color=equipo.color_principal,
        liga_id=liga.id,
        liga_nombre=liga.nombre,
        roles=roles,
        commitments=commitments,
        allow_logo_editing=allow_logo
    )


@router.post("/team/{token}/join", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def join_team(
    request: Request,
    token: str,
    background_tasks: BackgroundTasks,
    nombre_estudiante: str = Form(...),
    rol: str = Form(...),
    compromisos_aceptados: str = Form(...),  # JSON string of accepted commitments
    logo_data_url: Optional[str] = Form(None),  # Base64 PNG data URL
    db: AsyncSession = Depends(get_db)
):
    """
    Submit team join request with role and commitments.
    Generates a PDF and sends it to the teacher's email.
    Optionally includes a proposed logo.
    NO personal data is stored in the database.
    """
    import json
    import base64
    
    # Validate team exists
    result = await db.execute(
        select(Equipo).where(Equipo.acceso_token == token)
    )
    equipo = result.scalar_one_or_none()
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    # Get liga
    liga = await db.get(Liga, equipo.liga_id)
    if not liga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liga no encontrada"
        )
    
    if not liga.email_fichas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta liga no tiene email de docente configurado"
        )
    
    # Parse commitments
    try:
        compromisos = json.loads(compromisos_aceptados)
    except json.JSONDecodeError:
        compromisos = compromisos_aceptados.split(",")

    default_roles = ["Capitán/a", "Entrenador/a", "Árbitro/a", "Tutor/a de grada", "Preparador/a físico/a"]
    roles_disponibles = liga.team_roles if liga.team_roles else default_roles
    if rol not in roles_disponibles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rol no valido para esta liga",
        )

    commitments_catalog = liga.team_commitments if liga.team_commitments else {}
    compromisos_validos = commitments_catalog.get(rol, [])
    if compromisos_validos:
        compromisos_filtrados = [item for item in compromisos if item in compromisos_validos]
        if len(compromisos_filtrados) != len(compromisos):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Compromisos invalidos para el rol seleccionado",
            )
        compromisos = compromisos_filtrados
    
    # Process logo if provided
    logo_content = None
    logo_filename = None
    if logo_data_url and logo_data_url.startswith('data:image/png;base64,'):
        try:
            base64_data = logo_data_url.split(',')[1]
            logo_content = base64.b64decode(base64_data)
            logo_filename = f"Logo_{equipo.nombre.replace(' ', '_')}.png"
        except Exception:
            pass  # Ignore invalid logo data
    
    # Generate PDF
    pdf_content = await generate_team_contract_pdf(
        nombre_estudiante=nombre_estudiante,
        equipo_nombre=equipo.nombre,
        liga_nombre=liga.nombre,
        rol=rol,
        compromisos=compromisos
    )
    
    # Prepare email
    logo_note = "\n    🎨 PROPUESTA DE LOGO: Se adjunta una propuesta de logo creada por el equipo." if logo_content else ""
    subject = f"📋 Contrato de Equipo: {nombre_estudiante} - {equipo.nombre}"
    body = f"""
    Hola,
    
    Un/a estudiante ha firmado el contrato de compromiso para su equipo.
    
    📝 DATOS:
    • Estudiante: {nombre_estudiante}
    • Equipo: {equipo.nombre}
    • Liga: {liga.nombre}
    • Rol: {rol}
    
    📄 COMPROMISOS ACEPTADOS:
    {chr(10).join(f'    ✓ {c}' for c in compromisos)}
    {logo_note}
    
    Adjunto encontrarás el PDF con el contrato firmado.
    
    ---
    Liga EDUmind
    """
    
    filename = f"Contrato_{equipo.nombre}_{nombre_estudiante.replace(' ', '_')}.pdf"
    
    # Prepare attachments
    attachments = [(pdf_content, filename)]
    if logo_content and logo_filename:
        attachments.append((logo_content, logo_filename))
    
    # Send email in background with multiple attachments
    background_tasks.add_task(
        send_email_with_attachments,
        to_email=liga.email_fichas,
        subject=subject,
        body=body,
        attachments=attachments
    )
    
    return {
        "message": "Contrato enviado correctamente. El/la docente recibirá tu solicitud.",
        "equipo": equipo.nombre,
        "rol": rol,
        "logo_included": logo_content is not None
    }
