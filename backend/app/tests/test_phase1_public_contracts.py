#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

import base64
import io
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import game_resources as game_resources_api
from app.models import Equipo, GameSubmission, Liga, PendingAction, TipoDeporte
from app.tests.utils.utils import authentication_token_from_email, create_random_user


def _build_test_logo_data_url() -> str:
    buffer = io.BytesIO()
    Image.new("RGBA", (16, 16), (59, 130, 246, 255)).save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


TINY_PNG_DATA_URL = _build_test_logo_data_url()


@pytest.mark.asyncio
async def test_taxonomias_route_is_mounted(client: AsyncClient) -> None:
    response = await client.get("/api/v1/taxonomias/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_nextcloud_route_is_mounted_for_authenticated_user(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    response = await client.get("/api/v1/auth/me/integration/nextcloud", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["is_configured"] is False
    assert payload["nextcloud_url"] is None


@pytest.mark.asyncio
async def test_repository_compatibility_endpoints(
    client: AsyncClient,
    session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = await create_random_user(session)
    sport = (await session.execute(select(TipoDeporte).limit(1))).scalar_one()
    liga = Liga(nombre="Liga Repositorio", usuario_id=user.id, activa=True)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    submission = GameSubmission(
        token_hash="repo-token",
        title="Juego del repositorio",
        sport_id=sport.id,
        liga_id=liga.id,
        materiales="Conos",
        reglas="Normas simples",
        is_public=True,
        published_at=datetime.now(timezone.utc),
    )
    session.add(submission)
    await session.commit()
    await session.refresh(submission)

    async def fake_pdf(_submission) -> bytes:
        return b"%PDF-1.4 repository-test"

    monkeypatch.setattr(game_resources_api, "generate_wiki_pdf", fake_pdf)

    list_response = await client.get("/api/v1/game-resources/repository")
    assert list_response.status_code == 200
    items = list_response.json()
    assert any(item["id"] == submission.id for item in items)

    download_response = await client.get(f"/api/v1/game-resources/download-anonymous/{submission.id}")
    assert download_response.status_code == 200
    assert download_response.headers["content-type"].startswith("application/pdf")


@pytest.mark.asyncio
async def test_public_logo_proposal_creates_pending_action(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    user = await create_random_user(session)
    liga = Liga(
        nombre="Liga Logo",
        usuario_id=user.id,
        activa=True,
        config={"allow_logo_editing": True},
    )
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    equipo = Equipo(
        nombre="Equipo Brisa",
        liga_id=liga.id,
        acceso_token="token-logo-publico",
    )
    session.add(equipo)
    await session.commit()
    await session.refresh(equipo)

    response = await client.post(
        f"/api/v1/public/team/{equipo.acceso_token}/logo",
        data={"logo_data_url": TINY_PNG_DATA_URL},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["equipo"] == equipo.nombre

    result = await session.execute(
        select(PendingAction).where(
            PendingAction.action_type == "logo",
            PendingAction.target_id == equipo.id,
        )
    )
    pending = result.scalar_one()
    assert pending.status == "pending"
    assert pending.data_json["submitted_via"] == "public_team_portal"
    assert pending.data_json["logo_filename"].endswith(".webp")


@pytest.mark.asyncio
async def test_export_games_csv_requires_superuser(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    normal_user = await create_random_user(session)
    normal_headers = await authentication_token_from_email(client, normal_user.email, session)

    forbidden_response = await client.get(
        "/api/v1/game-resources/export/csv",
        headers=normal_headers,
    )
    assert forbidden_response.status_code == 403

    normal_user.is_superuser = True
    session.add(normal_user)
    await session.commit()

    super_headers = await authentication_token_from_email(client, normal_user.email, session)
    allowed_response = await client.get(
        "/api/v1/game-resources/export/csv",
        headers=super_headers,
    )
    assert allowed_response.status_code == 200
    assert allowed_response.headers["content-type"].startswith("text/csv")
