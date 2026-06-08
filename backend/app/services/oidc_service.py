#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuna
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
OIDC integration service for Authentik.
"""
from __future__ import annotations

import re
import secrets
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.services.league_entitlement_service import should_grant_grandfathering
from app.utils.security import get_password_hash


_DISCOVERY_TTL_SECONDS = 600
_JWKS_TTL_SECONDS = 600
_discovery_cache: tuple[float, dict[str, Any]] | None = None
_jwks_cache: tuple[float, dict[str, Any]] | None = None


def _oidc_disabled_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="El acceso EDUmind SSO no está disponible en este entorno.",
    )


def _assert_oidc_enabled() -> None:
    if not settings.AUTHENTIK_ENABLED:
        raise _oidc_disabled_exception()

    required = {
        "AUTHENTIK_ISSUER_URL": settings.AUTHENTIK_ISSUER_URL,
        "AUTHENTIK_CLIENT_ID": settings.AUTHENTIK_CLIENT_ID,
        "AUTHENTIK_CLIENT_SECRET": settings.AUTHENTIK_CLIENT_SECRET,
        "AUTHENTIK_REDIRECT_URI": settings.AUTHENTIK_REDIRECT_URI,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Configuración OIDC incompleta: {', '.join(missing)}",
        )


def _issuer_well_known_url() -> str:
    issuer = (settings.AUTHENTIK_ISSUER_URL or "").rstrip("/")
    return f"{issuer}/.well-known/openid-configuration"


async def _fetch_json(method: str, url: str, **kwargs: Any) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El proveedor de identidad no respondió correctamente.",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo contactar con el proveedor de identidad.",
        ) from exc


async def get_provider_metadata(force_refresh: bool = False) -> dict[str, Any]:
    _assert_oidc_enabled()
    global _discovery_cache

    now = time.time()
    if not force_refresh and _discovery_cache and _discovery_cache[0] > now:
        return _discovery_cache[1]

    metadata = await _fetch_json("GET", _issuer_well_known_url())
    _discovery_cache = (now + _DISCOVERY_TTL_SECONDS, metadata)
    return metadata


async def _get_jwks(force_refresh: bool = False) -> dict[str, Any]:
    global _jwks_cache
    now = time.time()
    if not force_refresh and _jwks_cache and _jwks_cache[0] > now:
        return _jwks_cache[1]

    metadata = await get_provider_metadata(force_refresh=force_refresh)
    jwks_uri = metadata.get("jwks_uri")
    if not jwks_uri:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configuración OIDC inválida: jwks_uri ausente.",
        )

    jwks = await _fetch_json("GET", jwks_uri)
    _jwks_cache = (now + _JWKS_TTL_SECONDS, jwks)
    return jwks


async def build_authorization_url(state: str, nonce: str) -> str:
    metadata = await get_provider_metadata()
    authorization_endpoint = metadata.get("authorization_endpoint")
    if not authorization_endpoint:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configuración OIDC inválida: authorization_endpoint ausente.",
        )

    params = urlencode(
        {
            "client_id": settings.AUTHENTIK_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": settings.AUTHENTIK_REDIRECT_URI,
            "scope": settings.AUTHENTIK_SCOPES,
            "state": state,
            "nonce": nonce,
        }
    )
    return f"{authorization_endpoint}?{params}"


async def build_end_session_url(post_logout_redirect_uri: str) -> str | None:
    metadata = await get_provider_metadata()
    end_session_endpoint = metadata.get("end_session_endpoint")
    if not end_session_endpoint:
        return None

    params = urlencode(
        {
            "post_logout_redirect_uri": post_logout_redirect_uri,
            "client_id": settings.AUTHENTIK_CLIENT_ID,
        }
    )
    return f"{end_session_endpoint}?{params}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    metadata = await get_provider_metadata()
    token_endpoint = metadata.get("token_endpoint")
    if not token_endpoint:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configuración OIDC inválida: token_endpoint ausente.",
        )

    return await _fetch_json(
        "POST",
        token_endpoint,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.AUTHENTIK_REDIRECT_URI,
            "client_id": settings.AUTHENTIK_CLIENT_ID,
            "client_secret": settings.AUTHENTIK_CLIENT_SECRET,
        },
    )


async def fetch_userinfo(access_token: str) -> dict[str, Any]:
    metadata = await get_provider_metadata()
    userinfo_endpoint = metadata.get("userinfo_endpoint")
    if not userinfo_endpoint:
        return {}

    return await _fetch_json(
        "GET",
        userinfo_endpoint,
        headers={"Authorization": f"Bearer {access_token}"},
    )


async def validate_id_token(id_token: str, *, nonce: str | None = None) -> dict[str, Any]:
    metadata = await get_provider_metadata()
    issuer = metadata.get("issuer")
    if not issuer:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configuración OIDC inválida: issuer ausente.",
        )

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Respuesta OIDC inválida.",
        ) from exc

    alg = str(header.get("alg") or "").strip()
    kid = header.get("kid")
    if not alg or alg.lower() == "none":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Respuesta OIDC inválida.",
        )

    jwks = await _get_jwks()
    keys = jwks.get("keys") or []
    signing_key = None
    for candidate in keys:
        if kid is None or candidate.get("kid") == kid:
            signing_key = candidate
            break

    if signing_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar la identidad EDUmind.",
        )

    try:
        claims = jwt.decode(
            id_token,
            signing_key,
            algorithms=[alg],
            audience=settings.AUTHENTIK_CLIENT_ID,
            issuer=issuer,
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar la identidad EDUmind.",
        ) from exc

    if nonce and claims.get("nonce") != nonce:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Respuesta OIDC inválida.",
        )

    return claims


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    email = value.strip().lower()
    return email or None


def _extract_email(claims: dict[str, Any], userinfo: dict[str, Any]) -> str | None:
    for source in (claims, userinfo):
        email = _normalize_email(source.get("email"))
        if email:
            return email
    return None


def _allowed_email_domains() -> set[str]:
    raw = settings.AUTHENTIK_ALLOWED_EMAIL_DOMAINS
    if not raw:
        return set()
    return {
        domain.strip().lower()
        for domain in raw.split(",")
        if domain.strip()
    }


def _assert_allowed_email(email: str | None) -> None:
    allowed = _allowed_email_domains()
    if not allowed or not email:
        return

    domain = email.split("@")[-1].lower()
    if domain not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta EDUmind no pertenece a un dominio autorizado.",
        )


def _normalize_codigo_candidate(raw_value: str | None) -> str | None:
    if not raw_value:
        return None

    normalized = re.sub(r"[^a-zA-Z0-9._-]+", "_", raw_value.strip())
    normalized = normalized.strip("._-")
    if len(normalized) < 3:
        return None
    return normalized[:20]


async def _generate_unique_codigo(db: AsyncSession, preferred: str | None, email: str) -> str:
    base = _normalize_codigo_candidate(preferred) or _normalize_codigo_candidate(email.split("@")[0]) or "docente"
    candidate = base[:20]
    suffix = 1

    while True:
        result = await db.execute(select(User.id).where(User.codigo == candidate))
        if result.scalar_one_or_none() is None:
            return candidate

        suffix += 1
        suffix_text = str(suffix)
        candidate = f"{base[: max(3, 20 - len(suffix_text))]}{suffix_text}"


async def _resolve_existing_user(
    db: AsyncSession,
    *,
    email: str | None,
    preferred_username: str | None,
) -> User | None:
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            return user

    normalized_codigo = _normalize_codigo_candidate(preferred_username)
    if normalized_codigo:
        result = await db.execute(select(User).where(User.codigo == normalized_codigo))
        candidate = result.scalar_one_or_none()
        if candidate and (not email or candidate.email is None or candidate.email.lower() == email):
            return candidate

    return None


async def resolve_or_provision_user(
    db: AsyncSession,
    *,
    claims: dict[str, Any],
    userinfo: dict[str, Any],
    client_ip: str | None,
) -> User:
    email = _extract_email(claims, userinfo)
    _assert_allowed_email(email)

    preferred_username = (
        claims.get("preferred_username")
        or userinfo.get("preferred_username")
        or claims.get("nickname")
        or userinfo.get("nickname")
        or email
    )

    user = await _resolve_existing_user(
        db,
        email=email,
        preferred_username=preferred_username,
    )

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta EDUmind está inactiva.",
            )
        if email and not user.email:
            user.email = email
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    if not settings.AUTHENTIK_AUTO_PROVISION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta EDUmind todavía no está autorizada para acceso SSO.",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El proveedor EDUmind no ha enviado un correo válido.",
        )

    now_utc = datetime.now(timezone.utc)
    is_grandfathered = should_grant_grandfathering(now_utc)
    codigo = await _generate_unique_codigo(db, preferred_username, email)
    user = User(
        codigo=codigo,
        email=email,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        acepta_privacidad=True,
        fecha_consentimiento=now_utc,
        ip_consentimiento=client_ip,
        plan_code="founding_teacher" if is_grandfathered else "free",
        grandfathered_unlimited=is_grandfathered,
        grandfathered_at=now_utc if is_grandfathered else None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_oidc_code(
    db: AsyncSession,
    *,
    code: str,
    nonce: str,
    client_ip: str | None,
) -> User:
    tokens = await exchange_code_for_tokens(code)
    id_token = tokens.get("id_token")
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El proveedor EDUmind no devolvió un token de identidad válido.",
        )

    claims = await validate_id_token(id_token, nonce=nonce)

    userinfo: dict[str, Any] = {}
    access_token = tokens.get("access_token")
    if access_token:
        try:
            userinfo = await fetch_userinfo(access_token)
        except HTTPException:
            userinfo = {}

    return await resolve_or_provision_user(
        db,
        claims=claims,
        userinfo=userinfo,
        client_ip=client_ip,
    )
