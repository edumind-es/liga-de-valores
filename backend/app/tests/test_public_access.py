#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Equipo, Liga, Partido, PendingAction, TipoDeporte
from app.tests.utils.utils import authentication_token_from_email, create_random_user


@pytest.mark.asyncio
async def test_public_login_rejects_non_numeric_pin(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    liga = Liga(nombre="Liga Publica", usuario_id=user.id, public_pin="123456", activa=True)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    response = await client.post(
        "/api/v1/public/login",
        json={"liga_id": liga.id, "pin": "ABC123"},
    )
    assert response.status_code == 400
    assert "Formato de PIN inválido" in response.json()["detail"]


@pytest.mark.asyncio
async def test_find_by_pin_rejects_non_numeric_pin(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    liga = Liga(nombre="Liga Publica 2", usuario_id=user.id, public_pin="654321", activa=True)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    response = await client.post(
        "/api/v1/public/find-by-pin",
        json={"pin": "ABC123"},
    )
    assert response.status_code == 400
    assert "PIN requerido o inválido" in response.json()["detail"]


@pytest.mark.asyncio
async def test_public_match_pin_submission_includes_educational_evaluation(
    client: AsyncClient,
    session: AsyncSession,
):
    user = await create_random_user(session)
    liga = Liga(nombre="Liga PIN Partido", usuario_id=user.id, activa=True)
    sport = TipoDeporte(nombre="Pickleball Test", codigo="PICK_TEST", tipo_marcador="sets")
    session.add_all([liga, sport])
    await session.commit()
    await session.refresh(liga)
    await session.refresh(sport)

    teams = [Equipo(nombre=f"Equipo {idx}", liga_id=liga.id) for idx in range(1, 5)]
    session.add_all(teams)
    await session.commit()
    for team in teams:
        await session.refresh(team)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=teams[0].id,
        equipo_visitante_id=teams[1].id,
        arbitro_id=teams[2].id,
        tutor_grada_local_id=teams[3].id,
        pin="123123",
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    response = await client.post(
        "/api/v1/public/partido/123123/marcador",
        json={
            "marcador": {"sets_local": 1, "sets_visitante": 0},
            "evaluacion": {
                "puntos_juego_limpio_local": 1,
                "cumple_minimos_local": 1,
                "arbitro_conocimiento": 8,
                "grada_animar_local": 3,
            },
            "observaciones": "Buen arbitraje y participación suficiente.",
        },
    )

    assert response.status_code == 202
    pending = (
        await session.execute(
            select(PendingAction).where(PendingAction.target_id == partido.id)
        )
    ).scalar_one()
    assert pending.action_type == "marcador_partido"
    assert pending.data_json["marcador"]["sets_local"] == 1
    assert pending.data_json["evaluacion"]["arbitro_conocimiento"] == 8
    assert pending.data_json["cumple_minimos"]["local"] is True


@pytest.mark.asyncio
async def test_approve_public_match_submission_applies_score_and_evaluation(
    client: AsyncClient,
    session: AsyncSession,
):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)
    liga = Liga(nombre="Liga Aprobar PIN", usuario_id=user.id, activa=True)
    sport = TipoDeporte(nombre="Futbol PIN", codigo="FUT_PIN", tipo_marcador="goles")
    session.add_all([liga, sport])
    await session.commit()
    await session.refresh(liga)
    await session.refresh(sport)

    e1 = Equipo(nombre="Local", liga_id=liga.id)
    e2 = Equipo(nombre="Visitante", liga_id=liga.id)
    e3 = Equipo(nombre="Arbitral", liga_id=liga.id)
    session.add_all([e1, e2, e3])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)
    await session.refresh(e3)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte_id=sport.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
        arbitro_id=e3.id,
        pin="321321",
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    submit_response = await client.post(
        "/api/v1/public/partido/321321/marcador",
        json={
            "marcador": {"goles_local": 2, "goles_visitante": 1},
            "evaluacion": {
                "puntos_juego_limpio_local": 1,
                "puntos_juego_limpio_visitante": 1,
                "arbitro_conocimiento": 9,
                "arbitro_gestion": 7,
                "arbitro_apoyo": 8,
            },
        },
    )
    assert submit_response.status_code == 202
    pending_id = submit_response.json()["pending_id"]

    approve_response = await client.put(
        f"/api/v1/pending-actions/{pending_id}/approve",
        json={"notes": "Validado"},
        headers=headers,
    )

    assert approve_response.status_code == 200
    await session.refresh(partido)
    assert partido.marcador["goles_local"] == 2
    assert partido.puntos_local == 3
    assert partido.puntos_juego_limpio_local == 1
    assert partido.arbitro_media == 8
    assert partido.puntos_arbitro == 2  # media 8 >= 5, arbitro_points=2
    assert partido.finalizado is True
    assert partido.evaluacion_completa is True
