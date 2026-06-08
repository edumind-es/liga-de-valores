import pytest
from httpx import AsyncClient

import app.main as main


@pytest.mark.asyncio
async def test_liveness_returns_ok_and_security_headers(client: AsyncClient):
    response = await client.get("/api/live")

    assert response.status_code == 200
    assert response.json()["service"] == "live"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "permissions-policy" in response.headers
    assert "cross-origin-opener-policy" in response.headers
    assert "content-security-policy" in response.headers


@pytest.mark.asyncio
async def test_readiness_returns_ok_when_dependencies_are_available(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def fake_build_readiness_payload():
        return (
            {
                "status": "healthy",
                "service": "ready",
                "checks": {
                    "postgres": {"status": "ok"},
                    "redis": {"status": "ok"},
                },
            },
            True,
        )

    monkeypatch.setattr(main.health_service, "build_readiness_payload", fake_build_readiness_payload)

    response = await client.get("/api/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_returns_503_when_dependency_fails(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def fake_build_readiness_payload():
        return (
            {
                "status": "degraded",
                "service": "ready",
                "checks": {
                    "postgres": {"status": "ok"},
                    "redis": {"status": "error", "detail": "ConnectionError"},
                },
            },
            False,
        )

    monkeypatch.setattr(main.health_service, "build_readiness_payload", fake_build_readiness_payload)

    response = await client.get("/api/health")

    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
    assert response.json()["checks"]["redis"]["status"] == "error"
