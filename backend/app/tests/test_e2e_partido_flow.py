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
from app.models import Liga, Equipo, Partido, TipoDeporte
from app.tests.utils.utils import create_random_user, authentication_token_from_email


@pytest.mark.asyncio
async def test_e2e_partido_flow(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga E2E", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="E2E Sport", codigo="E2E_SPORT", tipo_marcador="goles")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)

    e1 = Equipo(nombre="Local", liga_id=liga.id)
    e2 = Equipo(nombre="Visitante", liga_id=liga.id)
    session.add(e1)
    session.add(e2)
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    marcador_data = {
        "marcador": {"goles_local": 2, "goles_visitante": 1},
        "expected_version": partido.marcador_version
    }
    response = await client.put(f"/api/v1/partidos/{partido.id}/marcador", json=marcador_data, headers=headers)
    assert response.status_code == 200

    eval_data = {
        "puntos_juego_limpio_local": 1,
        "puntos_juego_limpio_visitante": 1,
        "expected_version": partido.evaluacion_version
    }
    response = await client.put(f"/api/v1/partidos/{partido.id}/evaluacion", json=eval_data, headers=headers)
    assert response.status_code == 200
    assert response.json().get("evaluacion_completa") is True

    response = await client.put(f"/api/v1/partidos/{partido.id}/finalizar", headers=headers)
    assert response.status_code == 200
    assert response.json().get("finalizado") is True

    response = await client.get(f"/api/v1/partidos/{partido.id}/export/acta", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
