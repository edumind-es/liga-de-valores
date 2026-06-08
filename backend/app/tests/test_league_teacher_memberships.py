import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.security import get_password_hash
from app.models import Equipo, Liga, Partido, TipoDeporte
from app.models import User
from app.tests.utils.utils import authentication_token_from_email


async def create_teacher(session: AsyncSession, code: str) -> User:
    user = User(
        email=f"{code}@example.com",
        codigo=code,
        hashed_password=get_password_hash("password123"),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_owner_can_share_liga_and_collaborator_can_open_and_validate_matches(
    client: AsyncClient,
    session: AsyncSession,
):
    owner = await create_teacher(session, "owner-share")
    collaborator = await create_teacher(session, "collab-share")
    owner_headers = await authentication_token_from_email(client, owner.email, session)
    collaborator_headers = await authentication_token_from_email(client, collaborator.email, session)

    liga = Liga(nombre="Liga compartida", usuario_id=owner.id)
    sport = TipoDeporte(nombre="Colaborativo", codigo="COLAB", tipo_marcador="goles")
    session.add_all([liga, sport])
    await session.commit()
    await session.refresh(liga)
    await session.refresh(sport)

    response = await client.post(
        f"/api/v1/ligas/{liga.id}/docentes",
        json={
            "user_id": collaborator.id,
            "role": "collaborator_teacher",
            "permissions": {
                "can_view_league": True,
                "can_view_matches": True,
                "can_open_matches": True,
                "can_validate_matches": True,
                "can_view_results": True,
            },
        },
        headers=owner_headers,
    )
    assert response.status_code == 201
    assert response.json()["user_id"] == collaborator.id

    shared_ligas = await client.get("/api/v1/ligas/", headers=collaborator_headers)
    assert shared_ligas.status_code == 200
    assert [item["id"] for item in shared_ligas.json()] == [liga.id]

    e1 = Equipo(nombre="Local", liga_id=liga.id)
    e2 = Equipo(nombre="Visitante", liga_id=liga.id)
    session.add_all([e1, e2])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)

    create_response = await client.post(
        "/api/v1/partidos/",
        json={
            "liga_id": liga.id,
            "tipo_deporte_id": sport.id,
            "equipo_local_id": e1.id,
            "equipo_visitante_id": e2.id,
        },
        headers=collaborator_headers,
    )
    assert create_response.status_code == 201
    created_partido = create_response.json()
    partido_id = created_partido["id"]

    marcador_response = await client.put(
        f"/api/v1/partidos/{partido_id}/marcador",
        json={"marcador": {"local": 2, "visitante": 1}, "expected_version": created_partido["marcador_version"]},
        headers=collaborator_headers,
    )
    assert marcador_response.status_code == 200
    scored_partido = marcador_response.json()

    evaluacion_response = await client.put(
        f"/api/v1/partidos/{partido_id}/evaluacion",
        json={
            "puntos_juego_limpio_local": 1,
            "puntos_juego_limpio_visitante": 1,
            "expected_version": scored_partido["evaluacion_version"],
        },
        headers=collaborator_headers,
    )
    assert evaluacion_response.status_code == 200

    finalizar_response = await client.put(f"/api/v1/partidos/{partido_id}/finalizar", headers=collaborator_headers)
    assert finalizar_response.status_code == 200


@pytest.mark.asyncio
async def test_viewer_membership_cannot_open_or_validate_matches(
    client: AsyncClient,
    session: AsyncSession,
):
    owner = await create_teacher(session, "owner-viewer")
    viewer = await create_teacher(session, "viewer-only")
    owner_headers = await authentication_token_from_email(client, owner.email, session)
    viewer_headers = await authentication_token_from_email(client, viewer.email, session)

    liga = Liga(nombre="Liga solo lectura", usuario_id=owner.id)
    sport = TipoDeporte(nombre="Lectura", codigo="LECT", tipo_marcador="goles")
    session.add_all([liga, sport])
    await session.commit()
    await session.refresh(liga)
    await session.refresh(sport)

    response = await client.post(
        f"/api/v1/ligas/{liga.id}/docentes",
        json={"user_id": viewer.id, "role": "viewer_teacher"},
        headers=owner_headers,
    )
    assert response.status_code == 201

    e1 = Equipo(nombre="A", liga_id=liga.id)
    e2 = Equipo(nombre="B", liga_id=liga.id)
    session.add_all([e1, e2])
    await session.commit()
    await session.refresh(e1)
    await session.refresh(e2)
    partido = Partido(liga_id=liga.id, tipo_deporte_id=sport.id, equipo_local_id=e1.id, equipo_visitante_id=e2.id)
    session.add(partido)
    await session.commit()
    await session.refresh(partido)

    read_response = await client.get(f"/api/v1/partidos/{partido.id}", headers=viewer_headers)
    assert read_response.status_code == 200

    create_response = await client.post(
        "/api/v1/partidos/",
        json={
            "liga_id": liga.id,
            "tipo_deporte_id": sport.id,
            "equipo_local_id": e1.id,
            "equipo_visitante_id": e2.id,
        },
        headers=viewer_headers,
    )
    assert create_response.status_code == 403

    eval_response = await client.put(
        f"/api/v1/partidos/{partido.id}/evaluacion",
        json={
            "puntos_juego_limpio_local": 1,
            "puntos_juego_limpio_visitante": 1,
            "expected_version": partido.evaluacion_version,
        },
        headers=viewer_headers,
    )
    assert eval_response.status_code == 403


@pytest.mark.asyncio
async def test_revoked_membership_loses_shared_liga_access(
    client: AsyncClient,
    session: AsyncSession,
):
    owner = await create_teacher(session, "owner-revoke")
    collaborator = await create_teacher(session, "collab-revoke")
    owner_headers = await authentication_token_from_email(client, owner.email, session)
    collaborator_headers = await authentication_token_from_email(client, collaborator.email, session)

    liga = Liga(nombre="Liga revocable", usuario_id=owner.id)
    session.add(liga)
    await session.commit()
    await session.refresh(liga)

    add_response = await client.post(
        f"/api/v1/ligas/{liga.id}/docentes",
        json={"user_id": collaborator.id, "role": "collaborator_teacher"},
        headers=owner_headers,
    )
    assert add_response.status_code == 201

    revoke_response = await client.delete(
        f"/api/v1/ligas/{liga.id}/docentes/{collaborator.id}",
        headers=owner_headers,
    )
    assert revoke_response.status_code == 204

    detail_response = await client.get(f"/api/v1/ligas/{liga.id}", headers=collaborator_headers)
    assert detail_response.status_code == 403

    list_response = await client.get("/api/v1/ligas/", headers=collaborator_headers)
    assert list_response.status_code == 200
    assert list_response.json() == []
