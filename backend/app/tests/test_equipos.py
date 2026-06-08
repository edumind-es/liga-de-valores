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
from app.models import Liga, Equipo
from app.tests.utils.utils import create_random_user, authentication_token_from_email

@pytest.mark.asyncio
async def test_create_equipo(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    # Create liga first
    liga = Liga(nombre="Liga Equipos", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    data = {
        "nombre": "Equipo Test",
        "color_principal": "#FF0000",
        "liga_id": liga.id
    }
    
    response = await client.post("/api/v1/equipos/", json=data, headers=headers)
    assert response.status_code == 201
    content = response.json()
    assert content["nombre"] == "Equipo Test"
    assert content["liga_id"] == liga.id
    assert content["acceso_token"] is not None

@pytest.mark.asyncio
async def test_read_equipos_by_liga(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Lista", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    equipo1 = Equipo(nombre="E1", liga_id=liga.id)
    equipo2 = Equipo(nombre="E2", liga_id=liga.id)
    session.add(equipo1)
    session.add(equipo2)
    await session.commit()
    
    response = await client.get(f"/api/v1/equipos/?liga_id={liga.id}", headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert len(content) == 2

@pytest.mark.asyncio
async def test_update_equipo(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Update", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    equipo = Equipo(nombre="Equipo Old", liga_id=liga.id)
    session.add(equipo)
    await session.commit()
    await session.refresh(equipo)
    
    data = {"nombre": "Equipo New", "color_principal": "#00FF00"}
    response = await client.put(f"/api/v1/equipos/{equipo.id}", json=data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["nombre"] == "Equipo New"
    assert content["color_principal"] == "#00FF00"

@pytest.mark.asyncio
async def test_delete_equipo(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Delete", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    equipo = Equipo(nombre="Equipo Delete", liga_id=liga.id)
    session.add(equipo)
    await session.commit()
    await session.refresh(equipo)
    
    response = await client.delete(f"/api/v1/equipos/{equipo.id}", headers=headers)
    assert response.status_code == 204
    
    # Verify gone
    response = await client.get(f"/api/v1/equipos/{equipo.id}", headers=headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_equipo_rejects_duplicate_name_same_liga(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Duplicados", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    existing = Equipo(nombre="Halcones", liga_id=liga.id)
    session.add(existing)
    await session.commit()

    response = await client.post(
        "/api/v1/equipos/",
        json={
            "nombre": "  halcones  ",
            "color_principal": "#123456",
            "liga_id": liga.id,
        },
        headers=headers,
    )
    assert response.status_code == 409
    assert "Ya existe un equipo" in response.json()["detail"]


@pytest.mark.asyncio
async def test_update_equipo_rejects_duplicate_name_same_liga(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Duplicados Update", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    equipo_a = Equipo(nombre="Lobos", liga_id=liga.id)
    equipo_b = Equipo(nombre="Tigres", liga_id=liga.id)
    session.add_all([equipo_a, equipo_b])
    await session.commit()
    await session.refresh(equipo_a)
    await session.refresh(equipo_b)

    response = await client.put(
        f"/api/v1/equipos/{equipo_b.id}",
        json={"nombre": " lobos "},
        headers=headers,
    )
    assert response.status_code == 409
    assert "Ya existe un equipo" in response.json()["detail"]
