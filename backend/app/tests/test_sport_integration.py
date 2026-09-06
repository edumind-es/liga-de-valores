#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""Integración de una propuesta de deporte en el catálogo (solo admin)."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tipo_deporte import TipoDeporte
from app.models.user import User
from app.utils.security import get_password_hash
from app.tests.utils.utils import random_string


async def _admin_headers(client: AsyncClient, session: AsyncSession) -> dict[str, str]:
    user = User(
        codigo=f"admin_{random_string(6)}",
        email=f"{random_string(6)}@example.com",
        hashed_password=get_password_hash("password123"),
        is_superuser=True,
    )
    session.add(user)
    await session.commit()
    r = await client.post("/api/v1/auth/login", json={"codigo": user.codigo, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _crear_propuesta(client: AsyncClient, nombre: str = "Colpbol Test") -> int:
    r = await client.post("/api/v1/sport-proposals/", json={
        "nombre": nombre,
        "tipo_marcador": "goles",
        "descripcion": "Deporte cooperativo sin contacto",
        "config_sugerida": {"tiempo_regulacion": 30, "puntos_para_ganar": 10, "permite_empate": False},
        "email_contacto": "proponente@example.com",
    })
    assert r.status_code == 201
    return r.json()["id"]


@pytest.mark.asyncio
async def test_integrar_crea_deporte_y_aprueba(client: AsyncClient, session: AsyncSession):
    pid = await _crear_propuesta(client)
    headers = await _admin_headers(client, session)

    r = await client.post(f"/api/v1/sport-proposals/{pid}/integrate", headers=headers, json={})
    assert r.status_code == 201, r.text
    deporte = r.json()
    assert deporte["nombre"] == "Colpbol Test"
    assert deporte["tipo_marcador"] == "goles"
    assert deporte["codigo"] == "colpbol-test"
    # La config del marcador (reglas) se transfiere
    assert deporte["config"]["tiempo_regulacion"] == 30
    assert deporte["permite_empate"] is False

    # El deporte existe en el catálogo
    existe = await session.execute(select(TipoDeporte).where(TipoDeporte.codigo == "colpbol-test"))
    assert existe.scalar_one_or_none() is not None

    # La propuesta queda aprobada
    prop = await client.get("/api/v1/sport-proposals/", headers=headers)
    p = next(x for x in prop.json() if x["id"] == pid)
    assert p["status"] == "approved"


@pytest.mark.asyncio
async def test_integrar_dos_veces_da_conflicto(client: AsyncClient, session: AsyncSession):
    pid = await _crear_propuesta(client, nombre="Datchball Test")
    headers = await _admin_headers(client, session)
    r1 = await client.post(f"/api/v1/sport-proposals/{pid}/integrate", headers=headers, json={})
    assert r1.status_code == 201
    r2 = await client.post(f"/api/v1/sport-proposals/{pid}/integrate", headers=headers, json={})
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_integrar_requiere_admin(client: AsyncClient, session: AsyncSession):
    pid = await _crear_propuesta(client, nombre="Kickball Test")
    r = await client.post(f"/api/v1/sport-proposals/{pid}/integrate", json={})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_integrar_codigo_unico_ante_colision(client: AsyncClient, session: AsyncSession):
    # Dos nombres distintos que slugifican al mismo código base
    headers = await _admin_headers(client, session)
    p1 = await _crear_propuesta(client, nombre="Balón mano playa")
    p2 = await _crear_propuesta(client, nombre="Balon mano playa")
    r1 = await client.post(f"/api/v1/sport-proposals/{p1}/integrate", headers=headers, json={})
    r2 = await client.post(f"/api/v1/sport-proposals/{p2}/integrate", headers=headers, json={})
    assert r1.json()["codigo"] == "balon-mano-playa"
    assert r2.json()["codigo"] == "balon-mano-playa-2"


@pytest.mark.asyncio
async def test_integrar_nombre_duplicado_da_conflicto(client: AsyncClient, session: AsyncSession):
    headers = await _admin_headers(client, session)
    p1 = await _crear_propuesta(client, nombre="Pichi")
    p2 = await _crear_propuesta(client, nombre="Pichi")
    r1 = await client.post(f"/api/v1/sport-proposals/{p1}/integrate", headers=headers, json={})
    assert r1.status_code == 201
    r2 = await client.post(f"/api/v1/sport-proposals/{p2}/integrate", headers=headers, json={})
    assert r2.status_code == 409
