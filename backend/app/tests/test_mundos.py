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
Tests de Los Cinco Mundos como dominio: etiquetado de criterios y
perfil por mundos en la clasificación.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.mundos import MUNDOS
from app.models import Liga, Equipo, Partido, TipoDeporte
from app.services.clasificacion_service import ClasificacionService
from app.tests.utils.utils import create_random_user, authentication_token_from_email


@pytest.mark.asyncio
async def test_plantillas_no_queda_sombreada(client: AsyncClient, session: AsyncSession):
    """
    Regresión: GET /ligas/plantillas quedaba capturada por GET /ligas/{liga_id}
    (orden de registro de routers) y devolvía 422 en producción.
    """
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    response = await client.get("/api/v1/ligas/plantillas", headers=headers)
    assert response.status_code == 200, response.text
    nombres = [p["nombre"] for p in response.json()]
    assert "EDUmind Clásico" in nombres


@pytest.mark.asyncio
async def test_criterio_acepta_mundo(client: AsyncClient, session: AsyncSession):
    """Un criterio puede etiquetarse con un mundo válido."""
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Mundos", usuario_id=user.id, modo_evaluacion="personalizado")
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    data = {
        "nombre": "Empatía",
        "codigo": "empatia",
        "categoria": "general",
        "mundo": "emocional",
    }
    response = await client.post(
        f"/api/v1/ligas/{liga.id}/criterios", json=data, headers=headers
    )
    assert response.status_code == 201, response.text
    assert response.json()["mundo"] == "emocional"


@pytest.mark.asyncio
async def test_criterio_rechaza_mundo_invalido(client: AsyncClient, session: AsyncSession):
    user = await create_random_user(session)
    headers = await authentication_token_from_email(client, user.email, session)

    liga = Liga(nombre="Liga Mundos 2", usuario_id=user.id, modo_evaluacion="personalizado")
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    data = {
        "nombre": "Cualquiera",
        "codigo": "cualquiera",
        "categoria": "general",
        "mundo": "galactico",
    }
    response = await client.post(
        f"/api/v1/ligas/{liga.id}/criterios", json=data, headers=headers
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_clasificacion_incluye_perfil_por_mundos(session: AsyncSession):
    """La clasificación agrega los puntos en el perfil de Los Cinco Mundos."""
    user = await create_random_user(session)

    liga = Liga(nombre="Liga Perfil", usuario_id=user.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    sport = TipoDeporte(nombre="Futbol Mundos", codigo="FM", tipo_marcador="goles")
    session.add(sport)
    await session.commit()
    await session.refresh(sport)

    e1 = Equipo(nombre="A", liga_id=liga.id)
    e2 = Equipo(nombre="B", liga_id=liga.id)
    e3 = Equipo(nombre="C-arbitro", liga_id=liga.id)
    session.add_all([e1, e2, e3])
    await session.commit()
    for e in (e1, e2, e3):
        await session.refresh(e)

    partido = Partido(
        liga_id=liga.id,
        tipo_deporte=sport,  # relación cargada para calcular_puntos_desde_marcador
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
        arbitro_id=e3.id,
        finalizado=True,
        marcador={"goles_local": 2, "goles_visitante": 0},
        puntos_juego_limpio_local=1,
        puntos_juego_limpio_visitante=0,
        puntos_arbitro=2,
    )
    partido.calcular_puntos_desde_marcador()
    session.add(partido)
    await session.commit()

    clasificacion = await ClasificacionService.calcular_clasificacion(liga.id, session)
    por_equipo = {c["equipo_id"]: c for c in clasificacion}

    # Todos los equipos llevan el perfil completo de los 5 mundos
    for datos in clasificacion:
        assert set(datos["mundos"].keys()) == set(MUNDOS)

    # A: ganó (3 deportivos → físico) y juego limpio 1 (→ interior)
    assert por_equipo[e1.id]["mundos"]["fisico"] == 3
    assert por_equipo[e1.id]["mundos"]["interior"] == 1
    # C: arbitró con éxito (2 puntos → mental)
    assert por_equipo[e3.id]["mundos"]["mental"] == 2
    assert por_equipo[e3.id]["mundos"]["fisico"] == 0
    # El perfil no altera los totales existentes
    assert por_equipo[e1.id]["puntos_totales"] == 4
