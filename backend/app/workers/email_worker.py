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
Worker arq para el envío de emails en background.

Arranque (mismo contenedor/imagen que el backend):

    arq app.workers.email_worker.WorkerSettings

Consume la cola de Redis (EMAIL_QUEUE_REDIS_URL) y envía con aiosmtplib.
Reintentos exponenciales: 30s, 60s, 120s, 240s (5 intentos en total).
Si la ficha (submission_id) está asociada, registra el resultado final
en BD: email_enviado / email_error.
"""
import logging

from arq import Retry
from arq.connections import RedisSettings

from app.config import settings
from app.services.email_service import (
    Adjunto,
    enviar_email_smtp,
    registrar_resultado_envio,
)

logger = logging.getLogger(__name__)

MAX_INTENTOS = 5


async def enviar_email(
    ctx: dict,
    to_email: str,
    subject: str,
    body: str,
    attachments: list[Adjunto] | None = None,
    submission_id: int | None = None,
) -> bool:
    """Job de envío. Reintenta con backoff exponencial hasta MAX_INTENTOS."""
    intento = ctx.get("job_try", 1)
    try:
        await enviar_email_smtp(to_email, subject, body, attachments)
        exito, error = True, None
        logger.info("Email enviado a %s (intento %s)", to_email, intento)
    except Exception as exc:
        if intento < MAX_INTENTOS:
            defer = 30 * 2 ** (intento - 1)
            logger.warning(
                "Fallo enviando email a %s (intento %s/%s), reintento en %ss: %s",
                to_email, intento, MAX_INTENTOS, defer, exc,
            )
            raise Retry(defer=defer)
        # Último intento: registrar el fallo definitivo, sin volver a lanzar
        exito, error = False, str(exc)[:500]
        logger.error(
            "Email a %s descartado tras %s intentos: %s",
            to_email, MAX_INTENTOS, error,
        )

    if submission_id is not None:
        await registrar_resultado_envio(submission_id, exito, error)
    return exito


async def on_shutdown(ctx: dict) -> None:
    """Libera el pool de BD del proceso worker al parar."""
    from app.database import engine

    await engine.dispose()


class WorkerSettings:
    """Configuración del worker (comando: arq app.workers.email_worker.WorkerSettings)."""

    functions = [enviar_email]
    redis_settings = RedisSettings.from_dsn(settings.EMAIL_QUEUE_REDIS_URL)
    max_jobs = 5                # concurrencia limitada (cortesía con SMTP2GO)
    max_tries = MAX_INTENTOS
    job_timeout = 90
    health_check_interval = 30  # habilita `arq --check` para el healthcheck
    on_shutdown = on_shutdown
