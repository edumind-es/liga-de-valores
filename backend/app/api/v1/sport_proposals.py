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

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.sport_proposal import SportProposal
from app.schemas.sport_proposal import SportProposalCreate, SportProposalUpdate, SportProposal as SportProposalSchema
from app.api.deps import get_current_superuser, get_current_user
from app.models.user import User
from app.config import settings
from app.core.rate_limit import limiter
import httpx
import uuid
from pathlib import Path
from PIL import Image
import io

router = APIRouter()

MAX_LOGO_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_LOGO_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _mask_email(value: str | None) -> str:
    if not value:
        return "N/A"
    local, separator, domain = value.partition("@")
    if not separator:
        return "***"
    if len(local) <= 2:
        local_masked = "*" * len(local)
    else:
        local_masked = f"{local[0]}***{local[-1]}"
    return f"{local_masked}@{domain}"

async def send_discord_notification(proposal: SportProposal):
    if not settings.DISCORD_WEBHOOK_URL:
        return

    contacto = "N/A"
    if proposal.email_contacto:
        contacto = proposal.email_contacto if settings.DISCORD_INCLUDE_CONTACT_EMAIL else _mask_email(proposal.email_contacto)

    extra = f"\n**Características del marcador:** {proposal.caracteristicas_adicionales}" if proposal.caracteristicas_adicionales else ""
    config_hint = f"\n**Config sugerida:** {proposal.config_sugerida}" if proposal.config_sugerida else ""
    content = (
        "🚀 **Nueva Propuesta de Deporte**\n\n"
        f"**Deporte:** {proposal.nombre}\n"
        f"**Marcador:** {proposal.tipo_marcador}\n"
        f"**Descripción:** {proposal.descripcion}"
        f"{extra}"
        f"{config_hint}\n"
        f"**Web:** {proposal.web_url or 'N/A'}\n"
        f"**Contacto:** {contacto}"
    )

    async with httpx.AsyncClient() as client:
        try:
            await client.post(settings.DISCORD_WEBHOOK_URL, json={"content": content})
        except Exception as e:
            print(f"Failed to send Discord notification: {e}")

@router.post("/", response_model=SportProposalSchema, status_code=status.HTTP_201_CREATED)
async def create_sport_proposal(
    proposal: SportProposalCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a new sport proposal.
    """
    db_proposal = SportProposal(
        nombre=proposal.nombre,
        tipo_marcador=proposal.tipo_marcador,
        descripcion=proposal.descripcion,
        caracteristicas_adicionales=proposal.caracteristicas_adicionales,
        config_sugerida=proposal.config_sugerida,
        web_url=proposal.web_url,
        email_contacto=proposal.email_contacto
    )
    db.add(db_proposal)
    await db.commit()
    await db.refresh(db_proposal)

    background_tasks.add_task(send_discord_notification, db_proposal)

    return db_proposal

@router.post("/{proposal_id}/logo", response_model=SportProposalSchema)
@limiter.limit("10/minute")
async def upload_proposal_logo(
    request: Request,
    proposal_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a logo for a sport proposal.
    Allowed only for superusers or authenticated users whose email matches
    the proposal contact email.
    """
    from sqlalchemy import select
    
    result = await db.execute(
        select(SportProposal).where(SportProposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )

    if not current_user.is_superuser:
        user_email = (current_user.email or "").strip().lower()
        proposal_email = (proposal.email_contacto or "").strip().lower()
        if not user_email or user_email != proposal_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para subir logo a esta propuesta"
            )

    if file.content_type not in ALLOWED_LOGO_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de archivo no permitido. Usa JPEG, PNG o WebP."
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo vacío."
        )
    if len(content) > MAX_LOGO_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo es demasiado grande. Máximo {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        image = Image.open(io.BytesIO(content))
        image.verify()
        image = Image.open(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo de imagen inválido."
        ) from exc

    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)
    
    # Create uploads directory if needed
    upload_dir = Path(settings.UPLOAD_DIR) / "sport_proposals"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Remove prior logo file if present (same proposal).
    if proposal.logo_filename:
        previous_name = Path(proposal.logo_filename).name
        previous_path = upload_dir / previous_name
        if previous_path.exists():
            previous_path.unlink()

    # Generate unique filename (normalized to webp for safer handling)
    filename = f"{uuid.uuid4().hex}.webp"
    filepath = upload_dir / filename
    
    image.save(filepath, format="WEBP", quality=85, method=6)
    
    # Update proposal
    proposal.logo_filename = f"sport_proposals/{filename}"
    await db.commit()
    await db.refresh(proposal)
    
    return proposal

@router.get("/", response_model=list[SportProposalSchema])
async def get_sport_proposals(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all sport proposals (Admin only).
    """
    # Import select here to avoid circular imports or issues
    from sqlalchemy import select
    
    result = await db.execute(
        select(SportProposal).offset(skip).limit(limit).order_by(SportProposal.created_at.desc())
    )
    proposals = result.scalars().all()
    return proposals

@router.patch("/{proposal_id}", response_model=SportProposalSchema)
async def update_sport_proposal_status(
    proposal_id: int,
    proposal_update: SportProposalUpdate,
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """
    Update sport proposal status (Admin only).
    """
    from sqlalchemy import select
    
    result = await db.execute(
        select(SportProposal).where(SportProposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )
    
    if proposal_update.status:
        proposal.status = proposal_update.status
    
    await db.commit()
    await db.refresh(proposal)
    return proposal
