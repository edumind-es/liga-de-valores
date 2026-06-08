import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import partidos as partidos_api
from app.models import Equipo, Liga, Partido, TipoDeporte
from app.models.criterio_evaluacion import CriterioEvaluacion
from app.tests.utils.utils import authentication_token_from_email, create_random_user


@pytest.mark.asyncio
async def test_update_evaluacion_personalizada_refreshes_all_role_teams(
    client: AsyncClient,
    session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Eval Roles", usuario_id=user.id, modo_evaluacion="personalizado")
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="Deporte Eval", codigo="DEP_ROLE", tipo_marcador="puntos")
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
        tutor_grada_visitante_id=grada_visitante.id,
    )
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    criterios = [
        CriterioEvaluacion(
            liga_id=liga.id,
            nombre="Grada Local",
            codigo="grada_local",
            categoria="grada_local",
            umbral_alto=7,
            umbral_medio=4,
            puntos_alto=1,
            puntos_medio=0.5,
        ),
        CriterioEvaluacion(
            liga_id=liga.id,
            nombre="Grada Visitante",
            codigo="grada_visitante",
            categoria="grada_visitante",
            umbral_alto=7,
            umbral_medio=4,
            puntos_alto=1,
            puntos_medio=0.5,
        ),
        CriterioEvaluacion(
            liga_id=liga.id,
            nombre="Arbitro",
            codigo="arbitro",
            categoria="arbitro",
            umbral_alto=7,
            umbral_medio=4,
            puntos_alto=2,
            puntos_medio=1,
        ),
        CriterioEvaluacion(
            liga_id=liga.id,
            nombre="Juego Limpio",
            codigo="juego_limpio",
            categoria="general",
            umbral_alto=7,
            umbral_medio=4,
            puntos_alto=1,
            puntos_medio=0.5,
        ),
    ]
    session.add_all(criterios)
    await session.commit()
    for criterio in criterios:
        await session.refresh(criterio)

    captured_calls: list[tuple[list[int | None], int, bool]] = []

    async def fake_schedule_stats_updates(equipo_ids, throttle_seconds=5, force=False):
        captured_calls.append((list(equipo_ids), throttle_seconds, force))

    monkeypatch.setattr(partidos_api.ClasificacionService, "schedule_stats_updates", fake_schedule_stats_updates)

    eval_response = await client.get(f"/api/v1/partidos/{partido.id}/evaluacion-personalizada", headers=headers)
    assert eval_response.status_code == 200
    expected_version = eval_response.json()["evaluacion_version"]

    payload = [
        {"criterio_id": criterios[0].id, "equipo_id": local.id, "valor": 8},
        {"criterio_id": criterios[1].id, "equipo_id": visitante.id, "valor": 8},
        {"criterio_id": criterios[2].id, "equipo_id": None, "valor": 8},
        {"criterio_id": criterios[3].id, "equipo_id": None, "valor": 8},
    ]

    response = await client.put(
        f"/api/v1/partidos/{partido.id}/evaluacion-personalizada?expected_version={expected_version}",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 200
    assert captured_calls == [
        (
            [local.id, visitante.id, arbitro.id, grada_local.id, grada_visitante.id],
            5,
            False,
        )
    ]
