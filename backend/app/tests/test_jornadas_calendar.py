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
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Liga, Equipo, TipoDeporte, Jornada, Partido
from app.tests.utils.utils import create_random_user, authentication_token_from_email


@pytest.mark.asyncio
async def test_generate_calendar_autosets_jornada_numero(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Jornadas Calendar", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    # Ensure we have a sport type
    sport = await session.get(TipoDeporte, 1)
    if not sport:
        sport = TipoDeporte(nombre="Test Sport", codigo="TEST", tipo_marcador="goles")
        session.add(sport)
        await session.commit()
        await session.refresh(sport)

    # Need at least 5 teams
    equipos = [Equipo(nombre=f"Equipo {i}", liga_id=liga.id) for i in range(1, 6)]
    session.add_all(equipos)
    await session.commit()

    jornada = Jornada(nombre="Jornada sin numero", liga_id=liga.id, numero=None)
    session.add(jornada)
    await session.commit()
    await session.refresh(jornada)
    assert jornada.numero is None

    response = await client.post(
        f"/api/v1/jornadas/{jornada.id}/generar-calendario?tipo_deporte_id={sport.id}",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["jornada_id"] == jornada.id
    assert data["partidos_creados"] > 0

    await session.refresh(jornada)
    assert isinstance(jornada.numero, int)
    assert jornada.numero >= 1


@pytest.mark.asyncio
async def test_multideporte_all_vs_all_with_4_teams(client: AsyncClient, session: AsyncSession):
    """
    Test that multi-deporte leagues generate all possible combinations (C(4,2) = 6 matches)
    and distribute roles equitably.
    """
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    # Create a multi-deporte league
    liga = Liga(nombre="Liga Multideporte Test", usuario_id=user.id, modo_competicion='multi_deporte')
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    # Ensure we have a sport type
    sport = await session.get(TipoDeporte, 1)
    if not sport:
        sport = TipoDeporte(nombre="Test Sport", codigo="TEST", tipo_marcador="goles")
        session.add(sport)
        await session.commit()
        await session.refresh(sport)

    # Create exactly 4 teams
    equipos = [Equipo(nombre=f"Team {chr(65+i)}", liga_id=liga.id) for i in range(4)]  # A, B, C, D
    session.add_all(equipos)
    await session.commit()

    jornada = Jornada(nombre="Jornada Multideporte", liga_id=liga.id, numero=1)
    session.add(jornada)
    await session.commit()
    await session.refresh(jornada)

    response = await client.post(
        f"/api/v1/jornadas/{jornada.id}/generar-calendario?tipo_deporte_id={sport.id}",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    
    # With 4 teams, should generate C(4,2) = 6 matches
    assert data["partidos_creados"] == 6
    assert "multi-deporte" in data["modo"].lower() or "combinaciones" in data["modo"].lower()


@pytest.mark.asyncio
async def test_generate_calendar_with_3_role_schema(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    create_response = await client.post(
        "/api/v1/ligas/",
        json={
            "nombre": "Liga Formato 3",
            "descripcion": "Test formato 3",
            "temporada": "2026-2027",
            "match_role_schema": {
                "roles_per_match": 3,
                "slots": [
                    {"slot_key": "home_team", "slot_order": 1, "role_code": "equipo_local", "role_label": "Equipo local", "scoring_category": "competitive", "is_required": True, "evaluation_enabled": True},
                    {"slot_key": "away_team", "slot_order": 2, "role_code": "equipo_visitante", "role_label": "Equipo visitante", "scoring_category": "competitive", "is_required": True, "evaluation_enabled": True},
                    {"slot_key": "slot_3", "slot_order": 3, "role_code": "staff_tecnico", "role_label": "Staff tecnico", "scoring_category": "staff", "is_required": True, "evaluation_enabled": True},
                ],
                "rules": [],
            },
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    liga_id = create_response.json()["id"]

    sport = await session.get(TipoDeporte, 1)
    if not sport:
        sport = TipoDeporte(nombre="Test Sport", codigo="TEST", tipo_marcador="goles")
        session.add(sport)
        await session.commit()
        await session.refresh(sport)

    equipos = [Equipo(nombre=f"Equipo R3-{i}", liga_id=liga_id) for i in range(1, 4)]
    session.add_all(equipos)
    await session.commit()

    jornada = Jornada(nombre="Jornada Formato 3", liga_id=liga_id, numero=1)
    session.add(jornada)
    await session.commit()
    await session.refresh(jornada)

    response = await client.post(
        f"/api/v1/jornadas/{jornada.id}/generar-calendario?tipo_deporte_id={sport.id}",
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["equipos_por_partido"] == 3

    partidos_result = await session.execute(select(Partido).where(Partido.jornada_id == jornada.id))
    partidos = partidos_result.scalars().all()
    assert len(partidos) > 0
    assert all(partido.arbitro_id is not None for partido in partidos)
    assert all(partido.tutor_grada_local_id is None for partido in partidos)
    assert all(partido.tutor_grada_visitante_id is None for partido in partidos)
