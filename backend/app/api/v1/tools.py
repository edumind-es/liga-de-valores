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
API de herramientas auxiliares - Generador de Fichas de Juegos
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Request, BackgroundTasks
from typing import Optional
import secrets
import os
import json
import logging

_tools_logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select
from app.database import get_db
from app.models.liga import Liga
from app.models.game_submission import GameSubmission
from app.models.tipo_deporte import TipoDeporte
from app.services.email_service import send_email_with_attachment
from app.services.pdf_generator import generate_game_sheet_pdf
from app.services.nextcloud_service import nextcloud_service, NextcloudService
from app.services.submission_policy_service import (
    analyze_drawing_for_policy,
    analyze_text_for_policy,
    build_daily_fingerprint,
    resolve_client_ip,
)
from app.core.cryptography import crypto
from app.core.rate_limit import limiter
from app.config import settings
from app.utils.upload_validation import validate_upload_file

router = APIRouter()


async def _send_email_and_log(
    submission_id: int,
    to_email: str,
    subject: str,
    body: str,
    file_content: bytes,
    filename: str,
) -> None:
    """
    Envía el email de la ficha y registra el resultado (éxito o error) en BD.
    Se ejecuta como background task para no bloquear la respuesta al alumno.
    """
    from app.services.email_service import send_email_with_attachment

    success = False
    error_msg = None
    try:
        success = send_email_with_attachment(
            to_email=to_email,
            subject=subject,
            body=body,
            file_content=file_content,
            filename=filename,
        )
        if not success:
            error_msg = "send_email_with_attachment devolvió False (sin excepción)"
    except Exception as exc:
        error_msg = str(exc)[:500]

    # Abrir sesión independiente para actualizar el registro
    db_url = os.getenv("DATABASE_URL", "")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with async_session() as session:
            submission = await session.get(GameSubmission, submission_id)
            if submission:
                submission.email_enviado = success
                submission.email_error = None if success else error_msg
                await session.commit()
    except Exception as db_exc:
        print(f"[email_log] Error actualizando submission {submission_id}: {db_exc}")
    finally:
        await engine.dispose()

    if not success:
        print(f"[email_log] FALLO enviando email para submission {submission_id}: {error_msg}")


# Paths de almacenamiento
SUBMISSIONS_PATH = "/app/static/submissions"
GRAPHICS_PATH = "/app/static/submissions/graphics"
MAX_GRAPHICS_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_GRAPHICS_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
GRAPHICS_EXTENSION_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


def _normalize_identity(value: str | None) -> str:
    return (value or "").strip().lower()


def _load_allowed_nextcloud_identities() -> set[str]:
    allowed: set[str] = set()

    # `NEXTCLOUD_ALLOWED_EMAIL` is kept for backward compatibility.
    raw_values = [
        settings.NEXTCLOUD_ALLOWED_IDENTITIES,
        settings.NEXTCLOUD_ALLOWED_EMAIL,
        settings.NEXTCLOUD_USERNAME,  # Useful when owner code matches legacy admin username.
    ]

    for raw in raw_values:
        if not raw:
            continue
        for token in raw.split(","):
            normalized = _normalize_identity(token)
            if normalized:
                allowed.add(normalized)

    return allowed


def _can_use_global_nextcloud(liga: Liga) -> bool:
    allowed_identities = _load_allowed_nextcloud_identities()
    if not allowed_identities:
        return False

    owner = liga.usuario
    candidate_identities = {
        _normalize_identity(liga.email_fichas),
        _normalize_identity(getattr(owner, "email", None)),
        _normalize_identity(getattr(owner, "codigo", None)),
    }

    return any(candidate and candidate in allowed_identities for candidate in candidate_identities)


@router.post("/send-game-sheet", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")  # Maximum 5 requests per minute per IP
async def send_game_sheet(
    request: Request,
    background_tasks: BackgroundTasks,
    # Datos estructurados
    liga_id: int = Form(...),
    student_name: str = Form(...),      # Solo para PDF del docente, NO se almacena
    game_name: str = Form(...),
    materiales: str = Form(""),
    reglas: str = Form(""),
    sport_id: Optional[int] = Form(None),
    pictogramas_materiales: Optional[str] = Form(None),  # JSON string de IDs
    pictogramas_reglas: Optional[str] = Form(None),      # JSON string de IDs
    # Archivo opcional (representación gráfica del alumno)
    representacion_grafica: Optional[UploadFile] = File(None),
    # Flag para forzar envío en idioma incorrecto (segundo intento)
    force_language: bool = Form(False),
    # Confirmaciones legales mínimas (privacy-first, sin identidad personal)
    policy_notice_accepted: bool = Form(False),
    community_guidelines_accepted: bool = Form(False),
    policy_notice_version: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    # ═══════════════════════════════════════════════════════════════════
    # 1. VALIDACIÓN
    # ═══════════════════════════════════════════════════════════════════
    if not game_name or len(game_name) < 2:
        raise HTTPException(status_code=400, detail="El nombre del juego es obligatorio.")

    if not policy_notice_accepted or not community_guidelines_accepted:
        raise HTTPException(
            status_code=400,
            detail=(
                "POLICY_ACK_REQUIRED: Debes aceptar el aviso legal y las normas de convivencia "
                "antes de enviar la ficha."
            ),
        )
    
    # Obtener liga (cargando usuario propietario) y validar email configurado
    result = await db.execute(
        select(Liga).options(selectinload(Liga.usuario)).where(Liga.id == liga_id)
    )
    liga = result.scalar_one_or_none()
    
    if not liga or not liga.email_fichas:
        raise HTTPException(status_code=400, detail="Liga no encontrada o sin email configurado.")

    # Moderación de texto (bloqueo estricto para lenguaje ofensivo)
    text_policy = analyze_text_for_policy(
        game_name,
        materiales,
        reglas,
        custom_blocklist=settings.SUBMISSION_BLOCKLIST_TERMS,
    )
    if text_policy.blocked:
        raise HTTPException(
            status_code=400,
            detail=(
                "POLICY_BLOCKED_LANGUAGE: El texto contiene lenguaje no permitido para un entorno "
                "educativo. Revísalo y vuelve a intentarlo."
            ),
        )

    # Obtener nombre del deporte si existe
    sport_name = None
    if sport_id:
        sport = await db.get(TipoDeporte, sport_id)
        if sport:
            sport_name = sport.nombre

    # ═══════════════════════════════════════════════════════════════════
    # 1.5 VERIFICAR IDIOMA (si aplica)
    # ═══════════════════════════════════════════════════════════════════
    required_lang = "all"
    if isinstance(liga.config, dict):
        required_lang = liga.config.get("submission_language", "all")
    if isinstance(liga.config, str):
        try:
            conf_dict = json.loads(liga.config)
            required_lang = conf_dict.get("submission_language", "all")
        except json.JSONDecodeError:
            _tools_logger.warning(
                "liga.config de liga_id=%s no es JSON válido; se ignora restricción de idioma.",
                liga_id,
            )

    if required_lang and required_lang != "all":
        try:
            from langdetect import detect
            
            # Combinar texto para mejor detección
            text_to_analyze = f"{game_name} {reglas} {materiales}"
            
            # Solo verificar si hay suficiente texto para ser fiable (> 50 chars)
            if len(text_to_analyze) > 50:
                detected = detect(text_to_analyze)
                
                # Mapeo de códigos de idioma si es necesario
                # langdetect usa ISO 639-1 (en, es, gl, etc.)
                
                lang_names = {
                    "es": "Castellano",
                    "gl": "Galego",
                    "en": "Inglés"
                }

                if detected != required_lang:
                    # Permitir margen de error entre Gallego y Portugués/Español dada similitud
                    allow_pass = False
                    if required_lang == "gl" and detected in ["pt", "es"]:
                        allow_pass = True # Similitud alta, dejar pasar con warning? No, por ahora clean
                    
                    if not allow_pass and detected != required_lang:
                        # Si fuerza el idioma, permitimos pasar aunque sea incorrecto
                        if not force_language:
                            # Para este MVP, somos estrictos salvo la excepción GL/PT
                            req_name = lang_names.get(required_lang, required_lang)
                            # Usamos prefijo LANGUAGE_MISMATCH para que el frontend lo detecte
                            raise HTTPException(
                                status_code=400, 
                                detail=f"LANGUAGE_MISMATCH: El idioma detectado no coincide con el requerido ({req_name})."
                            )
            else:
                pass
        except HTTPException:
            raise
        except ImportError:
            pass # Si no está instalado, no bloqueamos
        except Exception as e:
            # LangDetectException o cualquier otro error no debe bloquear el envío
            print(f"Error detectando idioma: {e}")
            pass
    
    # ═══════════════════════════════════════════════════════════════════
    # 2. PROCESAR REPRESENTACIÓN GRÁFICA (imagen del canvas)
    # ═══════════════════════════════════════════════════════════════════
    graphics_path = None
    graphics_content = None
    moderation_required = False
    moderation_flags: dict[str, object] = {}
    
    if representacion_grafica:
        validate_upload_file(
            representacion_grafica,
            allowed_mime_types=ALLOWED_GRAPHICS_MIME_TYPES,
            max_bytes=MAX_GRAPHICS_UPLOAD_BYTES,
            field_name="representacion_grafica",
        )
        content = await representacion_grafica.read()

        # Crear directorio si no existe
        os.makedirs(GRAPHICS_PATH, exist_ok=True)
        
        # Generar nombre único
        token_graphics = secrets.token_urlsafe(16)
        ext = GRAPHICS_EXTENSION_MAP.get(representacion_grafica.content_type or "", "png")
        graphics_filename = f"{token_graphics}.{ext}"
        graphics_path = os.path.join(GRAPHICS_PATH, graphics_filename)
        
        # Guardar imagen
        with open(graphics_path, "wb") as f:
            f.write(content)
        
        graphics_content = content  # Para incluir en PDF

        drawing_policy = analyze_drawing_for_policy(content)
        if drawing_policy.flagged:
            if "image_decode_error" in drawing_policy.reasons:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "El archivo de dibujo no pudo procesarse. Intenta crear de nuevo el dibujo "
                        "y vuelve a enviarlo."
                    ),
                )
            moderation_required = True
            moderation_flags["drawing"] = {
                "reasons": drawing_policy.reasons,
                "metrics": drawing_policy.metrics,
            }
    
    # ═══════════════════════════════════════════════════════════════════
    # 3. PARSEAR PICTOGRAMAS
    # ═══════════════════════════════════════════════════════════════════
    pictos_materiales = None
    pictos_reglas = None
    
    try:
        if pictogramas_materiales:
            pictos_materiales = json.loads(pictogramas_materiales)
        if pictogramas_reglas:
            pictos_reglas = json.loads(pictogramas_reglas)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Los pictogramas recibidos no tienen formato válido: {exc}",
        )

    # Fingerprint diario irreversible para trazabilidad mínima sin almacenar IP en claro
    client_ip = resolve_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    content_fingerprint = build_daily_fingerprint(
        client_ip=client_ip,
        user_agent=user_agent,
        secret=settings.SUBMISSION_FINGERPRINT_SECRET,
    )
    notice_version = (policy_notice_version or settings.SUBMISSION_POLICY_NOTICE_VERSION or "").strip()
    if not notice_version:
        notice_version = "unknown"
    
    # ═══════════════════════════════════════════════════════════════════
    # 4. CREAR REGISTRO EN BD (ANÓNIMO - sin nombre del alumno)
    # ═══════════════════════════════════════════════════════════════════
    token_hash = secrets.token_urlsafe(32)
    
    new_submission = GameSubmission(
        token_hash=token_hash,
        title=game_name,
        sport_id=sport_id,
        liga_id=liga_id,
        materiales=materiales,
        reglas=reglas,
        representacion_grafica=graphics_path,
        pictogramas_materiales=pictos_materiales,
        pictogramas_reglas=pictos_reglas,
        docente_email=liga.email_fichas,  # Para avisos de limpieza
        policy_notice_version=notice_version,
        policy_notice_accepted=policy_notice_accepted,
        community_guidelines_accepted=community_guidelines_accepted,
        moderation_required=moderation_required,
        moderation_flags=moderation_flags or None,
        content_fingerprint=content_fingerprint,
        is_public=False,
        aviso_enviado=False
    )
    
    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)
    
    # ═══════════════════════════════════════════════════════════════════
    # 5. GENERAR PDF FIRMADO (para el docente, con nombre alumno)
    # ═══════════════════════════════════════════════════════════════════
    # Determinar idioma del PDF basado en configuración de la liga
    pdf_language = required_lang if required_lang and required_lang != "all" else "es"

    pdf_content = await generate_game_sheet_pdf(
        title=game_name,
        student_name=student_name,  # Solo en versión del docente
        sport_name=sport_name,
        liga_name=liga.nombre,
        materiales=materiales,
        reglas=reglas,
        graphics_content=graphics_content,
        pictos_materiales=pictos_materiales,
        pictos_reglas=pictos_reglas,
        is_anonymous=False,
        language=pdf_language
    )
    
    # ═══════════════════════════════════════════════════════════════════
    # 6. PREPARAR Y ENVIAR EMAIL
    # ═══════════════════════════════════════════════════════════════════
    api_url = os.getenv("API_URL", "https://liga.edumind.es/api/v1")
    publish_link = f"{api_url}/game-resources/publish/{token_hash}"
    
    subject = f"🎮 Ficha de Juego: {game_name} - {student_name}"
    moderation_note = ""
    if moderation_required:
        drawing_reasons = moderation_flags.get("drawing", {})
        reasons_text = ", ".join(drawing_reasons.get("reasons", [])) if isinstance(drawing_reasons, dict) else ""
        moderation_note = (
            "\n"
            "⚠️ REVISIÓN AUTOMÁTICA:\n"
            "Se ha detectado contenido visual potencialmente sensible. "
            f"Motivos: {reasons_text or 'revisión manual recomendada'}.\n"
        )

    body = f"""
    Hola Docente,
    
    Un alumno/a ha creado una ficha de juego a través de Liga EDUmind.
    
    📝 DATOS DE LA FICHA:
    • Alumno/a: {student_name}
    • Juego: {game_name}
    • Liga: {liga.nombre}
    {f'• Deporte: {sport_name}' if sport_name else ''}
    {moderation_note}
    
    Adjunto encontrarás el PDF con la ficha completa.
    
    ════════════════════════════════════════════════════
    🌐 WIKI DE JUEGOS (OPCIÓN PÚBLICA)
    
    Si consideras que este juego es de calidad y quieres compartirlo
    en la Wiki de Juegos de Liga EDUmind, haz clic en el siguiente enlace.
    
    La versión publicada será completamente ANÓNIMA (sin datos del alumno).
    Podrás elegir si incluir tu nombre como docente contribuidor.
    
    👉 PUBLICAR EN WIKI: {publish_link}
    
    ⚠️ Este enlace caducará en 45 días si no se activa.
    ════════════════════════════════════════════════════
    
    Gracias por usar Liga EDUmind.
    """
    
    filename = f"Ficha_{game_name.replace(' ', '_')}.pdf"

    # Enviar email en background con registro del resultado en BD
    background_tasks.add_task(
        _send_email_and_log,
        submission_id=new_submission.id,
        to_email=liga.email_fichas,
        subject=subject,
        body=body,
        file_content=pdf_content,
        filename=filename,
    )
    
    # Subir a Nextcloud Xunta (evidencias) en background
    # Subir a Nextcloud Xunta (evidencias) en background
    # Lógica de soporte Multi-usuario
    nextcloud_target = None
    
    # 1. Intentar usar configuración PERSONAL del docente
    if liga.usuario and liga.usuario.nextcloud_url:
        try:
            plain_pass = crypto.decrypt(liga.usuario.nextcloud_password_enc)
            if plain_pass:
                # Instanciar cliente específico
                personal_service = NextcloudService(
                    username=liga.usuario.nextcloud_user,
                    password=plain_pass,
                    url=liga.usuario.nextcloud_url
                )
                if personal_service.is_configured:
                    nextcloud_target = personal_service
                    # print(f"Using Personal Nextcloud for User {liga.usuario.id}")
        except Exception as e:
            print(f"Error preparing Personal Nextcloud: {e}")

    # 2. Si no hay personal, intentar GLOBAL (Legacy/Admin) - Solo si cumple restricción de seguridad
    if not nextcloud_target and nextcloud_service.is_configured:
        if _can_use_global_nextcloud(liga):
            nextcloud_target = nextcloud_service
            # print("Using Global Nextcloud (Email match)")

    # 3. Ejecutar subida
    if nextcloud_target:
        background_tasks.add_task(
            nextcloud_target.upload_evidence,
            pdf_content=pdf_content,
            liga_name=liga.nombre,
            student_name=student_name,
            game_name=game_name
        )
    
    base_message = "Ficha enviada correctamente. El docente recibirá el enlace para publicarla en la Wiki."
    if moderation_required:
        base_message += " La ficha quedó marcada para revisión preventiva del profesorado."

    return {
        "message": base_message,
        "submission_id": new_submission.id,
        "moderation_required": moderation_required,
    }
