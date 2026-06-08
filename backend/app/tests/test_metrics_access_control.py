#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

import pytest
from httpx import AsyncClient

from app.config import settings


@pytest.mark.asyncio
async def test_metrics_rejects_non_allowlisted_without_token(client: AsyncClient):
    original_ips = settings.METRICS_ALLOWED_IPS
    original_token = settings.METRICS_TOKEN
    try:
        settings.METRICS_ALLOWED_IPS = "10.10.10.10"
        settings.METRICS_TOKEN = None
        response = await client.get("/api/metrics")
        assert response.status_code == 403
    finally:
        settings.METRICS_ALLOWED_IPS = original_ips
        settings.METRICS_TOKEN = original_token


@pytest.mark.asyncio
async def test_metrics_accepts_valid_token(client: AsyncClient):
    original_ips = settings.METRICS_ALLOWED_IPS
    original_token = settings.METRICS_TOKEN
    try:
        settings.METRICS_ALLOWED_IPS = "10.10.10.10"
        settings.METRICS_TOKEN = "metrics-secret"
        response = await client.get(
            "/api/metrics",
            headers={"X-Metrics-Token": "metrics-secret"},
        )
        assert response.status_code == 200
    finally:
        settings.METRICS_ALLOWED_IPS = original_ips
        settings.METRICS_TOKEN = original_token


@pytest.mark.asyncio
async def test_prometheus_metrics_accepts_bearer_token(client: AsyncClient):
    original_ips = settings.METRICS_ALLOWED_IPS
    original_token = settings.METRICS_TOKEN
    try:
        settings.METRICS_ALLOWED_IPS = "10.10.10.10"
        settings.METRICS_TOKEN = "metrics-secret"
        response = await client.get(
            "/api/metrics/prometheus",
            headers={"Authorization": "Bearer metrics-secret"},
        )
        assert response.status_code == 200
        assert "liga_uptime_seconds" in response.text
    finally:
        settings.METRICS_ALLOWED_IPS = original_ips
        settings.METRICS_TOKEN = original_token
