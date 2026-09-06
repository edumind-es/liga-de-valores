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
Tests del acta en un solo paso: PUT /partidos/{id}/acta
(marcador + evaluación educativa + finalización en una transacción).
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Liga, Equipo, Partido, TipoDeporte
from app.tests.utils.utils import create_random_user, authentication_token_from_email


async def _setup_partido(session: AsyncSession, user, **liga_kwargs):
    liga = Liga(nombre="Liga Acta", usuario_id=user.id, **liga_kwargs)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="Futbol Acta", codigo=f"FA{liga.id}", tipo_marcador="goles")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)

    e1 = Equipo(nombre="Local", liga_id=liga.id)
    e2 = Equipo(nombre="Visitante", liga_id=liga.id)
    session.add_all([e1, e2])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)
    return liga, partido


@pytest.mark.asyncio
async def test_acta_completa_en_un_paso(client: AsyncClient, session: AsyncSession):
    """Marcador + evaluación + finalización con una sola llamada."""
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    liga, partido = await _setup_partido(session, user)

    acta = {
        "marcador": {"goles_local": 2, "goles_visitante": 2},
        "expected_marcador_version": partido.marcador_version,
        "puntos_juego_limpio_local": 1,
        "puntos_juego_limpio_visitante": 0,
        "expected_version": partido.evaluacion_version,
    }
    response = await client.put(
        f"/api/v1/partidos/{partido.id}/acta", json=acta, headers=headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["finalizado"] is True
    assert content["marcador"]["goles_local"] == 2
    # Empate: sistema EDUmind 3-2-1 → 2 puntos cada uno
    assert content["puntos_local"] == 2
    assert content["puntos_visitante"] == 2
    assert content["puntos_juego_limpio_local"] == 1


@pytest.mark.asyncio
async def test_acta_incompleta_no_deja_nada_a_medias(client: AsyncClient, session: AsyncSession):
    """Si falta evaluación, 400 y el marcador NO queda guardado (transacción única)."""
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    liga, partido = await _setup_partido(session, user)

    # Con equipo árbitro asignado, el acta exige sus tres notas
    arbitro = Equipo(nombre="Arbitro", liga_id=liga.id)
    session.add(arbitro)
    await session.commit()
    await session.refresh(arbitro)
    partido.arbitro_id = arbitro.id
    await session.commit()
    await session.refresh(partido)

    acta = {
        "marcador": {"goles_local": 5, "goles_visitante": 0},
        "expected_marcador_version": partido.marcador_version,
        # Faltan las notas del árbitro → evaluación incompleta
        "puntos_juego_limpio_local": 1,
        "puntos_juego_limpio_visitante": 1,
        "expected_version": partido.evaluacion_version,
    }
    response = await client.put(
        f"/api/v1/partidos/{partido.id}/acta", json=acta, headers=headers
    )
    assert response.status_code == 400
    assert "incompleta" in response.json()["detail"]

    # Ni marcador ni finalización deben haberse persistido
    check = await client.get(f"/api/v1/partidos/{partido.id}", headers=headers)
    content = check.json()
    assert content["finalizado"] is False
    assert content["marcador"] in ({}, None)


@pytest.mark.asyncio
async def test_acta_conflicto_de_version(client: AsyncClient, session: AsyncSession):
    """Versiones desfasadas → 409 con el estado del servidor."""
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    liga, partido = await _setup_partido(session, user)

    acta = {
        "marcador": {"goles_local": 1, "goles_visitante": 0},
        "expected_marcador_version": "version-desfasada",
        "puntos_juego_limpio_local": 1,
        "puntos_juego_limpio_visitante": 1,
        "expected_version": partido.evaluacion_version,
    }
    response = await client.put(
        f"/api/v1/partidos/{partido.id}/acta", json=acta, headers=headers
    )
    assert response.status_code == 409
    body = response.json()
    assert "marcador" in body["message"]
    assert "marcador_version" in body["serverData"]
    assert "evaluacion_version" in body["serverData"]


@pytest.mark.asyncio
async def test_acta_rechaza_liga_personalizada(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    liga, partido = await _setup_partido(session, user, modo_evaluacion="personalizado")

    acta = {
        "marcador": {"goles_local": 1, "goles_visitante": 0},
        "expected_marcador_version": partido.marcador_version,
        "expected_version": partido.evaluacion_version,
    }
    response = await client.put(
        f"/api/v1/partidos/{partido.id}/acta", json=acta, headers=headers
    )
    assert response.status_code == 400
    assert "personalizada" in response.json()["detail"]


@pytest.mark.asyncio
async def test_acta_rechaza_partido_finalizado(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    liga, partido = await _setup_partido(session, user)

    partido.finalizado = True
    await session.commit()

    acta = {
        "marcador": {"goles_local": 1, "goles_visitante": 0},
        "expected_marcador_version": partido.marcador_version,
        "puntos_juego_limpio_local": 1,
        "puntos_juego_limpio_visitante": 1,
        "expected_version": partido.evaluacion_version,
    }
    response = await client.put(
        f"/api/v1/partidos/{partido.id}/acta", json=acta, headers=headers
    )
    assert response.status_code == 400
    assert "finalizado" in response.json()["detail"]
