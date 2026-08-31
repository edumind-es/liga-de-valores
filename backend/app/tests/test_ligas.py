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

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.models import Liga, User, Equipo
from app.tests.utils.utils import create_random_user, authentication_token_from_email
from app.utils.security import get_password_hash
from app.config import settings
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_create_liga(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    data = {
        "nombre": "Liga Test",
        "descripcion": "Descripción de prueba",
        "temporada": "2024-2025"
    }
    
    response = await client.post("/api/v1/ligas/", json=data, headers=headers)
    assert response.status_code == 201
    content = response.json()
    assert content["nombre"] == data["nombre"]
    assert content["usuario_id"] == user.id
    assert content["activa"] is True

@pytest.mark.asyncio
async def test_read_ligas(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    # Create 2 leagues
    liga1 = Liga(nombre="Liga 1", usuario_id=user.id)
    liga2 = Liga(nombre="Liga 2", usuario_id=user.id)
    session.add(liga1)
    session.add(liga2)
    await session.commit()
    
    response = await client.get("/api/v1/ligas/", headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert len(content) == 2

@pytest.mark.asyncio
async def test_read_liga_detail(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Detalle", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    response = await client.get(f"/api/v1/ligas/{liga.id}", headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["nombre"] == "Liga Detalle"
    assert "total_equipos" in content

@pytest.mark.asyncio
async def test_update_liga(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Original", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    data = {"nombre": "Liga Actualizada"}
    response = await client.put(f"/api/v1/ligas/{liga.id}", json=data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["nombre"] == "Liga Actualizada"

@pytest.mark.asyncio
async def test_generate_public_pin(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga PIN", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    response = await client.post(f"/api/v1/ligas/{liga.id}/public-pin", headers=headers)
    assert response.status_code == 200
    pin = response.json()["public_pin"]
    assert isinstance(pin, str)
    assert len(pin) == 6

    # Verify persisted
    await session.refresh(liga)
    assert liga.public_pin == pin


@pytest.mark.asyncio
async def test_public_pin_uniqueness_on_update(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga1 = Liga(nombre="Liga PIN 1", usuario_id=user.id, public_pin="123456")
    liga2 = Liga(nombre="Liga PIN 2", usuario_id=user.id)
    session.add(liga1)
    session.add(liga2)
    await session.commit()
    await session.refresh(liga2)

    response = await client.put(
        f"/api/v1/ligas/{liga2.id}",
        json={"public_pin": "123456"},
        headers=headers,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_public_pin_uniqueness_enforced_in_db(session: AsyncSession):
    user1 = User(
        codigo="pin-db-user-1",
        email="pin-db-user-1@example.com",
        hashed_password=get_password_hash("password123"),
    )
    user2 = User(
        codigo="pin-db-user-2",
        email="pin-db-user-2@example.com",
        hashed_password=get_password_hash("password123"),
    )
    session.add(user1)
    session.add(user2)
    await session.commit()
    await session.refresh(user1)
    await session.refresh(user2)

    liga1 = Liga(nombre="Liga PIN DB 1", usuario_id=user1.id, public_pin="222222")
    liga2 = Liga(nombre="Liga PIN DB 2", usuario_id=user2.id, public_pin="222222")
    session.add(liga1)
    session.add(liga2)

    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()


@pytest.mark.asyncio
async def test_disable_public_pin(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga PIN Off", usuario_id=user.id, public_pin="654321")
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    response = await client.delete(f"/api/v1/ligas/{liga.id}/public-pin", headers=headers)
    assert response.status_code == 204

    await session.refresh(liga)
    assert liga.public_pin is None

@pytest.mark.asyncio
async def test_delete_liga(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Borrar", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    response = await client.delete(f"/api/v1/ligas/{liga.id}", headers=headers)
    assert response.status_code == 204
    
    # Verify it's gone
    response = await client.get(f"/api/v1/ligas/{liga.id}", headers=headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_liga_capacity_grandfathered_unlimited(client: AsyncClient, session: AsyncSession):
    user = User(
        codigo="founder_user",
        email="founder@example.com",
        hashed_password=get_password_hash("password123"),
        plan_code="founding_teacher",
        grandfathered_unlimited=True,
        grandfathered_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    headers = await authentication_token_from_email(client, user.email, session)
    response = await client.get("/api/v1/ligas/capacity", headers=headers)
    assert response.status_code == 200

    content = response.json()
    assert content["grandfathered_unlimited"] is True
    assert content["leagues_limit"] is None
    assert content["can_create_league"] is True
    assert content["plan_code"] == "founding_teacher"


@pytest.mark.asyncio
async def test_create_liga_respects_free_plan_limit(client: AsyncClient, session: AsyncSession):
    user = User(
        codigo="free_capped_user",
        email="free_capped@example.com",
        hashed_password=get_password_hash("password123"),
        plan_code="free",
        grandfathered_unlimited=False,
        created_at=datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    headers = await authentication_token_from_email(client, user.email, session)

    for idx in range(settings.FREE_PLAN_MAX_LEAGUES):
        response = await client.post(
            "/api/v1/ligas/",
            json={"nombre": f"Liga Free {idx + 1}", "descripcion": "Prueba", "temporada": "2026-2027"},
            headers=headers,
        )
        assert response.status_code == 201

    blocked_response = await client.post(
        "/api/v1/ligas/",
        json={"nombre": "Liga Excedida", "descripcion": "Prueba", "temporada": "2026-2027"},
        headers=headers,
    )
    assert blocked_response.status_code == 403
    assert "limite" in blocked_response.json()["detail"].lower()

    capacity_response = await client.get("/api/v1/ligas/capacity", headers=headers)
    assert capacity_response.status_code == 200
    capacity = capacity_response.json()
    assert capacity["plan_code"] == "free"
    assert capacity["leagues_limit"] == settings.FREE_PLAN_MAX_LEAGUES
    assert capacity["leagues_used"] == settings.FREE_PLAN_MAX_LEAGUES
    assert capacity["leagues_remaining"] == 0
    assert capacity["can_create_league"] is False


@pytest.mark.asyncio
async def test_create_liga_with_match_role_schema(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    payload = {
        "nombre": "Liga Roles Custom",
        "descripcion": "Liga con formato de 5 roles",
        "temporada": "2026-2027",
        "match_role_schema": {
            "roles_per_match": 5,
            "slots": [
                {
                    "slot_key": "home_team",
                    "slot_order": 1,
                    "role_code": "equipo_local",
                    "role_label": "Equipo local",
                    "scoring_category": "competitive",
                    "is_required": True,
                    "evaluation_enabled": True,
                },
                {
                    "slot_key": "away_team",
                    "slot_order": 2,
                    "role_code": "equipo_visitante",
                    "role_label": "Equipo visitante",
                    "scoring_category": "competitive",
                    "is_required": True,
                    "evaluation_enabled": True,
                },
                {
                    "slot_key": "slot_3",
                    "slot_order": 3,
                    "role_code": "arbitro",
                    "role_label": "Arbitro",
                    "scoring_category": "arbitraje",
                    "is_required": True,
                    "evaluation_enabled": True,
                },
                {
                    "slot_key": "slot_4",
                    "slot_order": 4,
                    "role_code": "grada_local",
                    "role_label": "Grada local",
                    "scoring_category": "grada",
                    "is_required": True,
                    "evaluation_enabled": True,
                },
                {
                    "slot_key": "slot_5",
                    "slot_order": 5,
                    "role_code": "staff_tecnico",
                    "role_label": "Staff tecnico",
                    "scoring_category": "staff",
                    "is_required": True,
                    "evaluation_enabled": True,
                },
            ],
            "rules": [],
        },
    }
    response = await client.post("/api/v1/ligas/", json=payload, headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["match_role_schema"]["roles_per_match"] == 5
    slot_5 = next(slot for slot in body["match_role_schema"]["slots"] if slot["slot_key"] == "slot_5")
    assert slot_5["role_code"] == "staff_tecnico"


@pytest.mark.asyncio
async def test_match_role_schema_can_be_locked(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    create_response = await client.post(
        "/api/v1/ligas/",
        json={"nombre": "Liga Lock Roles", "descripcion": "Test", "temporada": "2026-2027"},
        headers=headers,
    )
    assert create_response.status_code == 201
    liga_id = create_response.json()["id"]

    update_payload = {
        "roles_per_match": 4,
        "slots": [
            {"slot_key": "home_team", "slot_order": 1, "role_code": "equipo_local", "role_label": "Equipo local", "scoring_category": "competitive", "is_required": True, "evaluation_enabled": True},
            {"slot_key": "away_team", "slot_order": 2, "role_code": "equipo_visitante", "role_label": "Equipo visitante", "scoring_category": "competitive", "is_required": True, "evaluation_enabled": True},
            {"slot_key": "slot_3", "slot_order": 3, "role_code": "arbitro", "role_label": "Arbitro", "scoring_category": "arbitraje", "is_required": True, "evaluation_enabled": True},
            {"slot_key": "slot_4", "slot_order": 4, "role_code": "staff_tecnico", "role_label": "Staff tecnico", "scoring_category": "staff", "is_required": True, "evaluation_enabled": True},
        ],
        "rules": [],
    }
    update_response = await client.put(
        f"/api/v1/ligas/{liga_id}/match-role-schema",
        json=update_payload,
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "draft"

    lock_response = await client.post(
        f"/api/v1/ligas/{liga_id}/match-role-schema/lock",
        headers=headers,
    )
    assert lock_response.status_code == 200
    assert lock_response.json()["status"] == "locked"
    assert lock_response.json()["locked_at"] is not None

    blocked_response = await client.put(
        f"/api/v1/ligas/{liga_id}/match-role-schema",
        json=update_payload,
        headers=headers,
    )
    assert blocked_response.status_code == 409
    assert blocked_response.json()["detail"] == "schema_locked"


@pytest.mark.asyncio
async def test_export_estadisticas_seleccion_multiple(client: AsyncClient, session: AsyncSession):
    """El export de estadísticas admite varias jornadas o partidos concretos."""
    from sqlalchemy import select
    from app.models import TipoDeporte, Jornada, Partido

    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Export", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    e1 = Equipo(nombre="Rojo", liga_id=liga.id)
    e2 = Equipo(nombre="Azul", liga_id=liga.id)
    session.add_all([e1, e2])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)

    sport = (await session.execute(select(TipoDeporte))).scalars().first()

    j1 = Jornada(nombre="Jornada 1", liga_id=liga.id, numero=1)
    j2 = Jornada(nombre="Jornada 2", liga_id=liga.id, numero=2)
    j3 = Jornada(nombre="Jornada 3", liga_id=liga.id, numero=3)
    session.add_all([j1, j2, j3])
    await session.commit()

    partidos = []
    for jornada in (j1, j2, j3):
        p = Partido(
            liga_id=liga.id,
            jornada_id=jornada.id,
            tipo_deporte_id=sport.id,
            equipo_local_id=e1.id,
            equipo_visitante_id=e2.id,
        )
        session.add(p)
        partidos.append(p)
    await session.commit()
    for p in partidos:
        await session.refresh(p)

    # Sin filtros: exporta los 3 partidos
    response = await client.get(f"/api/v1/ligas/{liga.id}/export/estadisticas", headers=headers)
    assert response.status_code == 200
    filas = [l for l in response.text.strip().splitlines() if l.strip()]
    assert len(filas) == 1 + 3  # cabecera + 3 partidos

    # Selección de dos jornadas (parámetro repetido)
    response = await client.get(
        f"/api/v1/ligas/{liga.id}/export/estadisticas",
        params=[("jornada_id", j1.id), ("jornada_id", j3.id)],
        headers=headers,
    )
    assert response.status_code == 200
    filas = [l for l in response.text.strip().splitlines() if l.strip()]
    assert len(filas) == 1 + 2
    assert "Jornada 1" in response.text
    assert "Jornada 2" not in response.text
    assert "Jornada 3" in response.text

    # Selección de partidos concretos
    response = await client.get(
        f"/api/v1/ligas/{liga.id}/export/estadisticas",
        params=[("partido_id", partidos[1].id)],
        headers=headers,
    )
    assert response.status_code == 200
    filas = [l for l in response.text.strip().splitlines() if l.strip()]
    assert len(filas) == 1 + 1
    assert "Jornada 2" in response.text
