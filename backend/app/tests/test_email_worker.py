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
Tests del worker arq de emails: reintentos exponenciales y registro
del resultado final en la ficha.
"""
from unittest.mock import AsyncMock

import pytest
from arq import Retry

from app.workers import email_worker


@pytest.mark.asyncio
async def test_job_exito_registra_en_ficha(monkeypatch):
    monkeypatch.setattr(email_worker, "enviar_email_smtp", AsyncMock())
    registro = AsyncMock()
    monkeypatch.setattr(email_worker, "registrar_resultado_envio", registro)

    resultado = await email_worker.enviar_email(
        {"job_try": 1}, "a@example.com", "Asunto", "Cuerpo", submission_id=42
    )

    assert resultado is True
    registro.assert_awaited_once_with(42, True, None)


@pytest.mark.asyncio
async def test_job_sin_ficha_no_toca_bd(monkeypatch):
    monkeypatch.setattr(email_worker, "enviar_email_smtp", AsyncMock())
    registro = AsyncMock()
    monkeypatch.setattr(email_worker, "registrar_resultado_envio", registro)

    resultado = await email_worker.enviar_email(
        {"job_try": 1}, "a@example.com", "Asunto", "Cuerpo"
    )

    assert resultado is True
    registro.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "intento,defer_esperado_ms",
    [(1, 30_000), (2, 60_000), (3, 120_000), (4, 240_000)],
)
async def test_job_reintenta_con_backoff_exponencial(
    monkeypatch, intento, defer_esperado_ms
):
    monkeypatch.setattr(
        email_worker,
        "enviar_email_smtp",
        AsyncMock(side_effect=ConnectionError("SMTP caído")),
    )
    registro = AsyncMock()
    monkeypatch.setattr(email_worker, "registrar_resultado_envio", registro)

    with pytest.raises(Retry) as exc_info:
        await email_worker.enviar_email(
            {"job_try": intento}, "a@example.com", "Asunto", "Cuerpo", submission_id=42
        )

    assert exc_info.value.defer_score == defer_esperado_ms
    # Durante los reintentos no se escribe nada en BD (solo el resultado final)
    registro.assert_not_awaited()


@pytest.mark.asyncio
async def test_job_ultimo_intento_registra_fallo(monkeypatch):
    monkeypatch.setattr(
        email_worker,
        "enviar_email_smtp",
        AsyncMock(side_effect=ValueError("boom " + "x" * 900)),
    )
    registro = AsyncMock()
    monkeypatch.setattr(email_worker, "registrar_resultado_envio", registro)

    resultado = await email_worker.enviar_email(
        {"job_try": email_worker.MAX_INTENTOS},
        "a@example.com", "Asunto", "Cuerpo", submission_id=42,
    )

    # No lanza: registra el fallo definitivo con el error truncado
    assert resultado is False
    registro.assert_awaited_once()
    args = registro.await_args.args
    assert args[0] == 42
    assert args[1] is False
    assert args[2].startswith("boom")
    assert len(args[2]) == 500
