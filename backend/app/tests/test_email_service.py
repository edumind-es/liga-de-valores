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
Tests del servicio de email: construcción de mensajes, envío SMTP
(aiosmtplib mockeado), encolado en arq y modo degradado.
"""
from unittest.mock import AsyncMock

import pytest

from app.services import email_service
# Referencia directa a la función real: el fixture autouse _email_sin_red
# sustituye el atributo del módulo, pero este nombre conserva la original.
from app.services.email_service import construir_mensaje, enviar_email_smtp


def test_construir_mensaje_simple():
    msg = construir_mensaje("docente@example.com", "Asunto", "Cuerpo del mensaje")
    assert msg["To"] == "docente@example.com"
    assert msg["Subject"] == "Asunto"
    assert "Cuerpo del mensaje" in msg.get_content()
    assert not msg.is_multipart()
    # El From debe contener siempre una dirección válida, aun sin MAIL_FROM
    assert "@" in msg["From"]


def test_construir_mensaje_con_adjuntos():
    adjuntos = [
        (b"%PDF-1.4 test", "Ficha_Juego.pdf"),
        (b"\x89PNG", "logo.png"),
        (b"binario", "datos.sin-extension-conocida"),
    ]
    msg = construir_mensaje("docente@example.com", "Asunto", "Cuerpo", adjuntos)

    partes = [p for p in msg.iter_attachments()]
    assert len(partes) == 3
    assert partes[0].get_content_type() == "application/pdf"
    assert partes[0].get_filename() == "Ficha_Juego.pdf"
    assert partes[1].get_content_type() == "image/png"
    # Extensión desconocida → genérico
    assert partes[2].get_content_type() == "application/octet-stream"


@pytest.mark.asyncio
async def test_enviar_email_smtp_sin_credenciales(monkeypatch):
    """Sin MAIL_USERNAME/PASSWORD se envía en claro (SMTP fake de dev)."""
    enviado = AsyncMock()
    monkeypatch.setattr(email_service.aiosmtplib, "send", enviado)
    monkeypatch.setattr(email_service.settings, "MAIL_USERNAME", None)
    monkeypatch.setattr(email_service.settings, "MAIL_PASSWORD", None)

    await enviar_email_smtp("a@example.com", "Asunto", "Cuerpo")

    enviado.assert_awaited_once()
    kwargs = enviado.await_args.kwargs
    assert kwargs["hostname"] == email_service.settings.MAIL_SERVER
    assert kwargs["port"] == email_service.settings.MAIL_PORT
    assert "start_tls" not in kwargs


@pytest.mark.asyncio
async def test_enviar_email_smtp_con_credenciales(monkeypatch):
    """Con credenciales se usa STARTTLS + login (SMTP2GO)."""
    enviado = AsyncMock()
    monkeypatch.setattr(email_service.aiosmtplib, "send", enviado)
    monkeypatch.setattr(email_service.settings, "MAIL_USERNAME", "usuario")
    monkeypatch.setattr(email_service.settings, "MAIL_PASSWORD", "clave")

    await enviar_email_smtp("a@example.com", "Asunto", "Cuerpo")

    kwargs = enviado.await_args.kwargs
    assert kwargs["start_tls"] is True
    assert kwargs["username"] == "usuario"
    assert kwargs["password"] == "clave"


@pytest.mark.asyncio
async def test_enviar_email_smtp_propaga_errores(monkeypatch):
    """El fallo SMTP se propaga: el worker decide reintentar."""
    monkeypatch.setattr(
        email_service.aiosmtplib,
        "send",
        AsyncMock(side_effect=ConnectionError("SMTP caído")),
    )
    with pytest.raises(ConnectionError):
        await enviar_email_smtp("a@example.com", "Asunto", "Cuerpo")


@pytest.mark.asyncio
async def test_send_email_encola_en_arq(monkeypatch):
    """El camino normal encola el job 'enviar_email' con sus argumentos."""
    pool = AsyncMock()

    async def pool_disponible():
        return pool

    monkeypatch.setattr(email_service, "_get_arq_pool", pool_disponible)

    adjuntos = [(b"%PDF", "ficha.pdf")]
    resultado = await email_service.send_email(
        "docente@example.com", "Asunto", "Cuerpo",
        attachments=adjuntos, submission_id=42,
    )

    assert resultado is True
    pool.enqueue_job.assert_awaited_once_with(
        "enviar_email",
        "docente@example.com",
        "Asunto",
        "Cuerpo",
        attachments=adjuntos,
        submission_id=42,
    )


@pytest.mark.asyncio
async def test_send_email_degradado_envia_directo(monkeypatch):
    """Con Redis caído (fixture autouse) se envía directo con aiosmtplib."""
    directo = AsyncMock()
    monkeypatch.setattr(email_service, "enviar_email_smtp", directo)

    resultado = await email_service.send_email("a@example.com", "Asunto", "Cuerpo")

    assert resultado is True
    directo.assert_awaited_once_with("a@example.com", "Asunto", "Cuerpo", None)


@pytest.mark.asyncio
async def test_send_email_degradado_registra_fallo(monkeypatch):
    """Si también falla el envío directo, se registra en la ficha y devuelve False."""
    monkeypatch.setattr(
        email_service,
        "enviar_email_smtp",
        AsyncMock(side_effect=ConnectionError("sin red")),
    )
    registro = AsyncMock()
    monkeypatch.setattr(email_service, "registrar_resultado_envio", registro)

    resultado = await email_service.send_email(
        "a@example.com", "Asunto", "Cuerpo", submission_id=7
    )

    assert resultado is False
    registro.assert_awaited_once()
    args = registro.await_args.args
    assert args[0] == 7
    assert args[1] is False
    assert "sin red" in args[2]


@pytest.mark.asyncio
async def test_registrar_resultado_envio_actualiza_ficha(db, monkeypatch):
    """Escribe email_enviado/email_error en la ficha (error truncado a 500)."""
    import app.database
    from app.models.game_submission import GameSubmission

    async with db() as session:
        ficha = GameSubmission(token_hash="a" * 64, title="Juego test")
        session.add(ficha)
        await session.commit()
        await session.refresh(ficha)
        ficha_id = ficha.id

    # La función usa AsyncSessionLocal; se apunta a la BD de test
    monkeypatch.setattr(app.database, "AsyncSessionLocal", db)

    await email_service.registrar_resultado_envio(ficha_id, False, "x" * 900)

    async with db() as session:
        ficha = await session.get(GameSubmission, ficha_id)
        assert ficha.email_enviado is False
        assert len(ficha.email_error) == 500

    await email_service.registrar_resultado_envio(ficha_id, True)

    async with db() as session:
        ficha = await session.get(GameSubmission, ficha_id)
        assert ficha.email_enviado is True
        assert ficha.email_error is None
