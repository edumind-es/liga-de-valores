#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import tools as tools_api
from app.models import GameSubmission, Liga
from app.tests.utils.utils import create_random_user


@pytest.mark.asyncio
async def test_send_game_sheet_requires_policy_ack(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/tools/send-game-sheet",
        data={
            "liga_id": "1",
            "student_name": "Alumno Test",
            "game_name": "Juego cooperativo",
            "materiales": "Conos",
            "reglas": "Jugar respetando turnos",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"].startswith("POLICY_ACK_REQUIRED:")


@pytest.mark.asyncio
async def test_send_game_sheet_blocks_offensive_text(client: AsyncClient, session: AsyncSession) -> None:
    user = await create_random_user(session)
    liga = Liga(
        nombre="Quinto A",
        usuario_id=user.id,
        activa=True,
        email_fichas="docente@example.com",
        config={},
    )
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    response = await client.post(
        "/api/v1/tools/send-game-sheet",
        data={
            "liga_id": str(liga.id),
            "student_name": "Alumno Test",
            "game_name": "Juego libre",
            "materiales": "Balon",
            "reglas": "Eres un gilipollas",
            "policy_notice_accepted": "true",
            "community_guidelines_accepted": "true",
            "policy_notice_version": "2026-04-02",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"].startswith("POLICY_BLOCKED_LANGUAGE:")


@pytest.mark.asyncio
async def test_send_game_sheet_persists_policy_metadata(
    client: AsyncClient,
    session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = await create_random_user(session)
    liga = Liga(
        nombre="Quinto A",
        usuario_id=user.id,
        activa=True,
        email_fichas="docente@example.com",
        config={},
    )
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    async def fake_pdf(**kwargs) -> bytes:
        return b"%PDF-1.4 test"

    def fake_email(**kwargs) -> None:
        return None

    monkeypatch.setattr(tools_api, "generate_game_sheet_pdf", fake_pdf)
    monkeypatch.setattr(tools_api, "send_email_with_attachment", fake_email)
    monkeypatch.setattr(
        tools_api.settings,
        "SUBMISSION_FINGERPRINT_SECRET",
        "fingerprint-secret-for-tests",
    )

    response = await client.post(
        "/api/v1/tools/send-game-sheet",
        data={
            "liga_id": str(liga.id),
            "student_name": "Alumno Test",
            "game_name": "Juego cooperativo limpio",
            "materiales": "Balon y petos",
            "reglas": "Todos participan y respetan turnos",
            "policy_notice_accepted": "true",
            "community_guidelines_accepted": "true",
            "policy_notice_version": "2026-04-02",
        },
        headers={"User-Agent": "pytest-agent"},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["moderation_required"] is False

    result = await session.execute(
        select(GameSubmission).where(GameSubmission.id == payload["submission_id"])
    )
    submission = result.scalar_one()

    assert submission.policy_notice_accepted is True
    assert submission.community_guidelines_accepted is True
    assert submission.policy_notice_version == "2026-04-02"
    assert submission.content_fingerprint is not None
    assert len(submission.content_fingerprint) == 64
