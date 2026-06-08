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

import secrets
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.core.rate_limit import limiter
from app.services import health_service
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Comprobaciones de mantenimiento al arrancar
    from app.core.cryptography import is_using_fallback_encryption
    from app.services.discord_service import notify_discord

    if is_using_fallback_encryption():
        await notify_discord(
            "Servidor arrancado en modo **cifrado fallback**: "
            "ENCRYPTION_KEY no configurada en .env. "
            "Genera una clave dedicada con `python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\"` y añádela a .env para independizar "
            "el ciclo de vida del cifrado del secreto JWT.",
            level="warning",
        )
    yield


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="API para gestión de ligas escolares con evaluación MRPS de valores",
    version="3.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _parse_metrics_allowed_ips() -> set[str]:
    return {
        ip.strip()
        for ip in settings.METRICS_ALLOWED_IPS.split(",")
        if ip.strip()
    }


def _extract_metrics_token(request: Request) -> str | None:
    header_token = request.headers.get("x-metrics-token")
    if header_token:
        return header_token.strip()

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


def _parse_trusted_proxies() -> frozenset[str]:
    return frozenset(ip.strip() for ip in settings.TRUSTED_PROXIES.split(",") if ip.strip())


def _resolve_client_ip(request: Request) -> str:
    """
    Resolve effective client IP.
    X-Forwarded-For y X-Real-IP solo se respetan cuando la conexión viene de un
    proxy de confianza (nginx → 127.0.0.1). Los clientes externos no pueden
    suplantar IPs mediante estos headers.
    """
    peer = request.client.host if request.client else ""
    if peer in _parse_trusted_proxies():
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            first_hop = forwarded_for.split(",")[0].strip()
            if first_hop:
                return first_hop
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip
    return peer


def _assert_metrics_access(request: Request) -> None:
    client_ip = _resolve_client_ip(request)
    if client_ip in _parse_metrics_allowed_ips():
        return

    expected_token = settings.METRICS_TOKEN
    provided_token = _extract_metrics_token(request)
    if expected_token and provided_token and secrets.compare_digest(provided_token, expected_token):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden",
    )


def _build_hsts_header() -> str:
    value = f"max-age={settings.SECURITY_HSTS_SECONDS}"
    if settings.SECURITY_HSTS_INCLUDE_SUBDOMAINS:
        value += "; includeSubDomains"
    if settings.SECURITY_HSTS_PRELOAD:
        value += "; preload"
    return value


@app.middleware("http")
async def enforce_request_size_limit(request: Request, call_next):
    # Enforce bounded payloads for mutating operations.
    if request.method in {"POST", "PUT", "PATCH"}:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
            except ValueError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Content-Length inválido."},
                )

            max_bytes = settings.MAX_REQUEST_SIZE_MB * 1024 * 1024
            if length > max_bytes:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": f"Payload demasiado grande. Máximo {settings.MAX_REQUEST_SIZE_MB}MB."},
                )

    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    if not settings.SECURITY_HEADERS_ENABLED:
        return response

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", settings.SECURITY_REFERRER_POLICY)
    response.headers.setdefault("X-Frame-Options", settings.SECURITY_FRAME_OPTIONS)
    response.headers.setdefault(
        "Cross-Origin-Opener-Policy",
        settings.SECURITY_CROSS_ORIGIN_OPENER_POLICY,
    )
    response.headers.setdefault("Permissions-Policy", settings.SECURITY_PERMISSIONS_POLICY)
    response.headers.setdefault("Strict-Transport-Security", _build_hsts_header())

    if settings.SECURITY_CSP and not settings.DEBUG:
        response.headers.setdefault("Content-Security-Policy", settings.SECURITY_CSP)

    return response

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Ensure upload directory exists
print(f"DEBUG: UPLOAD_DIR is {settings.UPLOAD_DIR}")
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# API Routes
from app.api.v1 import api_router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "operational"
    }

@app.api_route("/api/live", methods=["GET", "HEAD"])
async def liveness_check():
    """Lightweight liveness probe for clients and reverse proxies."""
    return JSONResponse(
        content=health_service.build_liveness_payload(),
        headers={"Cache-Control": "no-store"},
    )


@app.api_route("/api/ready", methods=["GET", "HEAD"])
async def readiness_check():
    """Readiness probe that validates critical runtime dependencies."""
    payload, ready = await health_service.build_readiness_payload()
    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload,
        headers={"Cache-Control": "no-store"},
    )


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check():
    """Compatibility alias for readiness-based health checks."""
    return await readiness_check()

@app.get("/api/metrics")
async def get_metrics(request: Request):
    """Get application metrics."""
    _assert_metrics_access(request)
    from app.services.metrics_service import metrics
    return metrics.get_metrics()

@app.get("/api/metrics/prometheus")
async def get_prometheus_metrics(request: Request):
    """Get Prometheus metrics."""
    _assert_metrics_access(request)
    from app.services.metrics_service import metrics
    return PlainTextResponse(metrics.get_prometheus_metrics())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
