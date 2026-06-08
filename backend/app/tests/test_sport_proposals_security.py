#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User
from app.utils.security import get_password_hash
from app.tests.utils.utils import random_string


PNG_1X1_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01"
    b"\x01\x00\xc9\xfe\x92\xef\x00\x00\x00\x00IEND\xaeB`\x82"
)


async def _create_auth_headers(
    client: AsyncClient,
    session: AsyncSession,
    *,
    email: str,
    is_superuser: bool = False,
) -> dict[str, str]:
    user = User(
        codigo=f"user_{random_string(8)}",
        email=email,
        hashed_password=get_password_hash("password123"),
        is_superuser=is_superuser,
    )
    session.add(user)
    await session.commit()

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"codigo": user.codigo, "password": "password123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_proposal(client: AsyncClient, email_contacto: str) -> int:
    response = await client.post(
        "/api/v1/sport-proposals/",
        json={
            "nombre": "Deporte Test",
            "tipo_marcador": "puntos",
            "descripcion": "Propuesta de test",
            "email_contacto": email_contacto,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _cleanup_logo_file(relative_path: str | None) -> None:
    if not relative_path:
        return
    full_path = Path(settings.UPLOAD_DIR) / relative_path
    if full_path.exists():
        full_path.unlink()


@pytest.mark.asyncio
async def test_upload_proposal_logo_requires_auth(client: AsyncClient):
    proposal_id = await _create_proposal(client, email_contacto="teacher@example.com")
    response = await client.post(
        f"/api/v1/sport-proposals/{proposal_id}/logo",
        files={"file": ("logo.png", PNG_1X1_BYTES, "image/png")},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_proposal_logo_rejects_non_owner_teacher(client: AsyncClient, session: AsyncSession):
    proposal_id = await _create_proposal(client, email_contacto="owner@example.com")
    headers = await _create_auth_headers(
        client,
        session,
        email="another_teacher@example.com",
        is_superuser=False,
    )
    response = await client.post(
        f"/api/v1/sport-proposals/{proposal_id}/logo",
        headers=headers,
        files={"file": ("logo.png", PNG_1X1_BYTES, "image/png")},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_upload_proposal_logo_accepts_owner_teacher(client: AsyncClient, session: AsyncSession):
    proposal_id = await _create_proposal(client, email_contacto="owner_teacher@example.com")
    headers = await _create_auth_headers(
        client,
        session,
        email="owner_teacher@example.com",
        is_superuser=False,
    )
    response = await client.post(
        f"/api/v1/sport-proposals/{proposal_id}/logo",
        headers=headers,
        files={"file": ("logo.png", PNG_1X1_BYTES, "image/png")},
    )
    assert response.status_code == 200
    logo_filename = response.json().get("logo_filename")
    assert isinstance(logo_filename, str)
    assert logo_filename.startswith("sport_proposals/")
    assert logo_filename.endswith(".webp")
    _cleanup_logo_file(logo_filename)


@pytest.mark.asyncio
async def test_upload_proposal_logo_accepts_superuser(client: AsyncClient, session: AsyncSession):
    proposal_id = await _create_proposal(client, email_contacto="owner@example.com")
    headers = await _create_auth_headers(
        client,
        session,
        email="admin@example.com",
        is_superuser=True,
    )
    response = await client.post(
        f"/api/v1/sport-proposals/{proposal_id}/logo",
        headers=headers,
        files={"file": ("logo.png", PNG_1X1_BYTES, "image/png")},
    )
    assert response.status_code == 200
    _cleanup_logo_file(response.json().get("logo_filename"))


@pytest.mark.asyncio
async def test_upload_proposal_logo_rejects_invalid_mime(client: AsyncClient, session: AsyncSession):
    proposal_id = await _create_proposal(client, email_contacto="owner_teacher2@example.com")
    headers = await _create_auth_headers(
        client,
        session,
        email="owner_teacher2@example.com",
        is_superuser=False,
    )
    response = await client.post(
        f"/api/v1/sport-proposals/{proposal_id}/logo",
        headers=headers,
        files={"file": ("logo.txt", b"not-an-image", "text/plain")},
    )
    assert response.status_code == 400

