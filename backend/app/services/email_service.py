#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
Servicio de email de Liga EDUmind.

La API pública es `send_email`: encola el envío en arq (Redis) y devuelve
el control de inmediato, sin bloquear el event loop de la API. El envío
real lo ejecuta el worker (app/workers/email_worker.py) con reintentos
exponenciales. Si Redis no está disponible, se degrada a envío directo
con aiosmtplib (asíncrono, tampoco bloquea).
"""
import logging
import mimetypes
from email.message import EmailMessage

import aiosmtplib
from arq import create_pool
from arq.connections import RedisSettings

from app.config import settings

logger = logging.getLogger(__name__)

# Adjunto = (contenido en bytes, nombre de archivo)
Adjunto = tuple[bytes, str]


def construir_mensaje(
    to_email: str,
    subject: str,
    body: str,
    attachments: list[Adjunto] | None = None,
) -> EmailMessage:
    """Construye el mensaje con adjuntos opcionales (MIME según extensión)."""
    msg = EmailMessage()
    msg["Subject"] = subject
    # El remitente debe ser siempre una dirección válida (RFC 5321): sin
    # MAIL_FROM, un From con solo el nombre provoca un 553 y reintentos inútiles
    remitente = settings.MAIL_FROM
    if not remitente and settings.MAIL_USERNAME and "@" in settings.MAIL_USERNAME:
        remitente = settings.MAIL_USERNAME
    if not remitente:
        remitente = "no-reply@liga.local"  # último recurso (dev/SMTP fake)
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{remitente}>"
    msg["To"] = to_email
    msg.set_content(body)

    for file_content, filename in attachments or []:
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type:
            maintype, subtype = mime_type.split("/", 1)
        else:
            maintype, subtype = "application", "octet-stream"
        msg.add_attachment(
            file_content, maintype=maintype, subtype=subtype, filename=filename
        )
    return msg


async def enviar_email_smtp(
    to_email: str,
    subject: str,
    body: str,
    attachments: list[Adjunto] | None = None,
) -> None:
    """
    Envío real vía SMTP asíncrono. Lanza excepción si falla: el llamante
    (worker o modo degradado) decide si reintenta o registra el error.
    """
    msg = construir_mensaje(to_email, subject, body, attachments)
    extra: dict = {}
    # Igual que el comportamiento histórico: STARTTLS + login solo si hay
    # credenciales (en dev con un SMTP fake se envía en claro)
    if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
        extra = dict(
            start_tls=True,
            username=settings.MAIL_USERNAME,
            password=settings.MAIL_PASSWORD,
        )
    await aiosmtplib.send(
        msg,
        hostname=settings.MAIL_SERVER,
        port=settings.MAIL_PORT,
        timeout=30,
        **extra,
    )


async def registrar_resultado_envio(
    submission_id: int, exito: bool, error: str | None = None
) -> None:
    """
    Registra el resultado FINAL de un envío en la ficha (GameSubmission):
    email_enviado y email_error. Lo usan el worker (tras agotar reintentos
    o al tener éxito) y el modo degradado.
    """
    # Import local para evitar ciclos (database importa config, no servicios)
    from app.database import AsyncSessionLocal
    from app.models.game_submission import GameSubmission

    try:
        async with AsyncSessionLocal() as session:
            submission = await session.get(GameSubmission, submission_id)
            if submission:
                submission.email_enviado = exito
                submission.email_error = None if exito else (error or "")[:500]
                await session.commit()
    except Exception:
        logger.exception(
            "Error registrando resultado de email para ficha %s", submission_id
        )


# Pool de conexión a la cola arq, perezoso y compartido por proceso
_arq_pool = None


async def _get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(
            RedisSettings.from_dsn(settings.EMAIL_QUEUE_REDIS_URL)
        )
    return _arq_pool


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    attachments: list[Adjunto] | None = None,
    submission_id: int | None = None,
) -> bool:
    """
    API pública: encola el email en la cola arq y devuelve enseguida.

    - attachments: lista de (bytes, nombre de archivo).
    - submission_id: si se indica, el worker registrará el resultado final
      en la ficha (email_enviado / email_error).

    Degradación: si Redis no está disponible se envía directo con
    aiosmtplib (sin reintentos). Devuelve False solo si tampoco pudo
    enviarse en modo degradado.
    """
    global _arq_pool
    try:
        pool = await _get_arq_pool()
        await pool.enqueue_job(
            "enviar_email",
            to_email,
            subject,
            body,
            attachments=attachments,
            submission_id=submission_id,
        )
        return True
    except Exception:
        logger.exception(
            "Cola de email no disponible; enviando directo (modo degradado)"
        )
        _arq_pool = None  # forzar reconexión en el próximo envío
        try:
            await enviar_email_smtp(to_email, subject, body, attachments)
            exito, error = True, None
        except Exception as exc:
            logger.exception("Falló también el envío directo a %s", to_email)
            exito, error = False, str(exc)[:500]
        if submission_id is not None:
            await registrar_resultado_envio(submission_id, exito, error)
        return exito
