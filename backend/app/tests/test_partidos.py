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
from app.models import Liga, Equipo, Partido, TipoDeporte, Jornada, CriterioEvaluacion
from app.tests.utils.utils import create_random_user, authentication_token_from_email

@pytest.mark.asyncio
async def test_create_partido(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    # Setup data
    liga = Liga(nombre="Liga Partidos", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    # Get a sport type (seeded in conftest)
    sport = await session.get(TipoDeporte, 1) # Assuming ID 1 exists (Fútbol Sala)
    if not sport:
        # Fallback if seeding failed or ID changed
        sport = TipoDeporte(nombre="Test Sport", codigo="TEST", tipo_marcador="goles")
        session.add(sport)
        await session.commit()
        await session.refresh(sport)
    
    equipo1 = Equipo(nombre="Local", liga_id=liga.id)
    equipo2 = Equipo(nombre="Visitante", liga_id=liga.id)
    session.add(equipo1)
    session.add(equipo2)
    await session.commit()
    await session.refresh(equipo1)
    await session.refresh(equipo2)
    
    data = {
        "liga_id": liga.id,
        "tipo_deporte_id": sport.id,
        "equipo_local_id": equipo1.id,
        "equipo_visitante_id": equipo2.id
    }
    
    response = await client.post("/api/v1/partidos/", json=data, headers=headers)
    assert response.status_code == 201
    content = response.json()
    assert content["equipo_local_id"] == equipo1.id
    assert content["equipo_visitante_id"] == equipo2.id
    assert content["finalizado"] is False

@pytest.mark.asyncio
async def test_update_marcador(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    # Setup
    liga = Liga(nombre="Liga Marcador", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    sport = TipoDeporte(nombre="Futbol Test", codigo="FUT_TEST", tipo_marcador="goles")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)
    
    e1 = Equipo(nombre="L", liga_id=liga.id)
    e2 = Equipo(nombre="V", liga_id=liga.id)
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
    
    # Update marcador (Local wins 3-1)
    marcador_data = {
        "marcador": {
            "goles_local": 3,
            "goles_visitante": 1
        },
        "expected_version": partido.marcador_version
    }
    
    response = await client.put(f"/api/v1/partidos/{partido.id}/marcador", json=marcador_data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["marcador"]["goles_local"] == 3
    assert content["puntos_local"] == 3
    assert content["puntos_visitante"] == 1
    assert content["resultado"] == "V"
    assert content["finalizado"] is False

@pytest.mark.asyncio
async def test_update_evaluacion(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    # Setup
    liga = Liga(nombre="Liga Eval", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    sport = TipoDeporte(nombre="Basket", codigo="BAS", tipo_marcador="puntos")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)
    
    e1 = Equipo(nombre="L", liga_id=liga.id)
    e2 = Equipo(nombre="V", liga_id=liga.id)
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
    
    eval_data = {
        "puntos_juego_limpio_local": 1,
        "arbitro_conocimiento": 8,
        "arbitro_gestion": 7,
        "arbitro_apoyo": 9,
        "expected_version": partido.evaluacion_version
    }
    
    response = await client.put(f"/api/v1/partidos/{partido.id}/evaluacion", json=eval_data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["puntos_juego_limpio_local"] == 1
    assert content["arbitro_media"] == 8.0 # (8+7+9)/3

@pytest.mark.asyncio
async def test_update_marcador_tries_uses_config(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Rugby", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(
        nombre="Rugby Config",
        codigo="RUG_CFG",
        tipo_marcador="tries",
        config={"valor_try": 7, "valor_conversion": 3}
    )
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
        "marcador": {
            "tries_local": 1,
            "conversiones_local": 1,
            "tries_visitante": 1,
            "conversiones_visitante": 0
        },
        "expected_version": partido.marcador_version
    }

    response = await client.put(f"/api/v1/partidos/{partido.id}/marcador", json=marcador_data, headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["puntos_local"] == 3
    assert content["puntos_visitante"] == 1
    assert content["resultado"] == "V"

@pytest.mark.asyncio
async def test_update_evaluacion_personalizada_roles(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Eval Personalizada", usuario_id=user.id, modo_evaluacion="personalizado")
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="Deporte Eval", codigo="DEP_EVAL", tipo_marcador="puntos")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)

    local = Equipo(nombre="Local", liga_id=liga.id)
    visitante = Equipo(nombre="Visitante", liga_id=liga.id)
    arbitro = Equipo(nombre="Arbitro", liga_id=liga.id)
    grada_local = Equipo(nombre="Grada Local", liga_id=liga.id)
    grada_visitante = Equipo(nombre="Grada Visitante", liga_id=liga.id)
    session.add_all([local, visitante, arbitro, grada_local, grada_visitante])
    await session.commit()
    await session.refresh(local)
    await session.refresh(visitante)
    await session.refresh(arbitro)
    await session.refresh(grada_local)
    await session.refresh(grada_visitante)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=local.id,
        equipo_visitante_id=visitante.id,
        arbitro_id=arbitro.id,
        tutor_grada_local_id=grada_local.id,
        tutor_grada_visitante_id=grada_visitante.id
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    criterio_grada_local = CriterioEvaluacion(
        liga_id=liga.id,
        nombre="Grada Local",
        codigo="grada_local",
        categoria="grada_local",
        umbral_alto=7,
        umbral_medio=4,
        puntos_alto=1,
        puntos_medio=0.5
    )
    criterio_grada_visitante = CriterioEvaluacion(
        liga_id=liga.id,
        nombre="Grada Visitante",
        codigo="grada_visitante",
        categoria="grada_visitante",
        umbral_alto=7,
        umbral_medio=4,
        puntos_alto=1,
        puntos_medio=0.5
    )
    criterio_arbitro = CriterioEvaluacion(
        liga_id=liga.id,
        nombre="Arbitro",
        codigo="arbitro",
        categoria="arbitro",
        umbral_alto=7,
        umbral_medio=4,
        puntos_alto=2,
        puntos_medio=1
    )
    criterio_general = CriterioEvaluacion(
        liga_id=liga.id,
        nombre="Juego Limpio",
        codigo="juego_limpio",
        categoria="general",
        umbral_alto=7,
        umbral_medio=4,
        puntos_alto=1,
        puntos_medio=0.5
    )
    session.add_all([criterio_grada_local, criterio_grada_visitante, criterio_arbitro, criterio_general])
    await session.commit()
    await session.refresh(criterio_grada_local)
    await session.refresh(criterio_grada_visitante)
    await session.refresh(criterio_arbitro)
    await session.refresh(criterio_general)

    eval_response = await client.get(f"/api/v1/partidos/{partido.id}/evaluacion-personalizada", headers=headers)
    assert eval_response.status_code == 200
    expected_version = eval_response.json().get("evaluacion_version")
    assert expected_version

    evaluaciones_payload = [
        {"criterio_id": criterio_grada_local.id, "equipo_id": local.id, "valor": 8},
        {"criterio_id": criterio_grada_visitante.id, "equipo_id": visitante.id, "valor": 8},
        {"criterio_id": criterio_arbitro.id, "equipo_id": None, "valor": 8},
        {"criterio_id": criterio_general.id, "equipo_id": None, "valor": 8},
    ]
    response = await client.put(
        f"/api/v1/partidos/{partido.id}/evaluacion-personalizada?expected_version={expected_version}",
        json=evaluaciones_payload,
        headers=headers
    )
    assert response.status_code == 200

    await session.refresh(partido)
    assert partido.puntos_grada_local == 1
    assert partido.puntos_grada_visitante == 1
    assert partido.puntos_arbitro == 2
    assert partido.puntos_juego_limpio_local == 1
    assert partido.puntos_juego_limpio_visitante == 1

@pytest.mark.asyncio
async def test_read_partidos_filter(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    
    liga = Liga(nombre="Liga Filter", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)
    
    sport = TipoDeporte(nombre="Sport Filter", codigo="S_FILT", tipo_marcador="goles")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)
    
    e1 = Equipo(nombre="E1", liga_id=liga.id)
    e2 = Equipo(nombre="E2", liga_id=liga.id)
    session.add(e1)
    session.add(e2)
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)
    
    p1 = Partido(liga_id=liga.id, tipo_deporte_id=sport.id, equipo_local_id=e1.id, equipo_visitante_id=e2.id)
    session.add(p1)
    await session.commit()
    
    # Filter by liga
    response = await client.get(f"/api/v1/partidos/?liga_id={liga.id}", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    
    # Filter by equipo
    response = await client.get(f"/api/v1/partidos/?equipo_id={e1.id}", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    
    # Filter by wrong liga
    response = await client.get(f"/api/v1/partidos/?liga_id={liga.id + 999}", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 0


@pytest.mark.asyncio
async def test_read_partido_refresh_evaluacion_without_missing_greenlet(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Read Partido", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="Read Sport", codigo="READ_SPORT", tipo_marcador="goles")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)

    e1 = Equipo(nombre="Read Local", liga_id=liga.id)
    e2 = Equipo(nombre="Read Visitante", liga_id=liga.id)
    session.add_all([e1, e2])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
        finalizado=False,
        evaluacion_completa=False,
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    response = await client.get(f"/api/v1/partidos/{partido.id}", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == partido.id
    assert payload["liga_id"] == liga.id


@pytest.mark.asyncio
async def test_read_partido_refresh_personalizada_without_missing_greenlet(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Read Personalizada", usuario_id=user.id, modo_evaluacion="personalizado")
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="Read Personalizado Sport", codigo="READ_PERS", tipo_marcador="puntos")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)

    e1 = Equipo(nombre="Read Pers Local", liga_id=liga.id)
    e2 = Equipo(nombre="Read Pers Visitante", liga_id=liga.id)
    session.add_all([e1, e2])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)

    criterio = CriterioEvaluacion(
        liga_id=liga.id,
        nombre="Criterio General",
        codigo="criterio_general",
        categoria="general",
        umbral_alto=7,
        umbral_medio=4,
        puntos_alto=1,
        puntos_medio=0.5
    )
    session.add(criterio)
    await session.commit()

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
        finalizado=False,
        evaluacion_completa=False,
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    response = await client.get(f"/api/v1/partidos/{partido.id}", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == partido.id
    assert payload["liga_id"] == liga.id
