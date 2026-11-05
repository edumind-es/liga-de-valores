#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#

"""
Validación de JWT con PyJWT: id_token OIDC y tokens de sesión propios.
"""
import base64
import hashlib
import hmac
import json
import time
from datetime import timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from fastapi import HTTPException

from app.api.v1.public import get_public_token_payload
from app.config import settings
from app.services import oidc_service
from app.utils.security import create_access_token, create_refresh_token, verify_token

KID = "clave-1"
ISSUER = "https://idp.example/"
CLIENT_ID = "liga-client"
NONCE = "nonce-1"

CLAVE_IDP = rsa.generate_private_key(public_exponent=65537, key_size=2048)
CLAVE_ATACANTE = rsa.generate_private_key(public_exponent=65537, key_size=2048)
CLAVE_EC_ATACANTE = ec.generate_private_key(ec.SECP256R1())


def _b64(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode()


def _claims(**cambios) -> dict:
    claims = {
        "sub": "usuario",
        "aud": CLIENT_ID,
        "iss": ISSUER,
        "exp": int(time.time()) + 300,
        "nonce": NONCE,
    }
    claims.update(cambios)
    return claims


def _firmado(**cambios) -> str:
    return jwt.encode(_claims(**cambios), CLAVE_IDP, algorithm="RS256", headers={"kid": KID})


def _manual(alg: str, secreto: bytes | None) -> str:
    """Construye a mano un token que PyJWT se negaría a emitir."""
    cabecera = _b64(json.dumps({"alg": alg, "kid": KID}).encode())
    cuerpo = _b64(json.dumps(_claims()).encode())
    entrada = f"{cabecera}.{cuerpo}"
    firma = hmac.new(secreto, entrada.encode(), hashlib.sha256).digest() if secreto else b""
    return f"{entrada}.{_b64(firma)}"


@pytest.fixture(autouse=True)
def idp_falso(monkeypatch: pytest.MonkeyPatch):
    jwk = jwt.algorithms.RSAAlgorithm.to_jwk(CLAVE_IDP.public_key(), as_dict=True)
    jwk.update({"kid": KID, "use": "sig"})

    async def metadatos(force_refresh: bool = False):
        return {"issuer": ISSUER}

    async def jwks(force_refresh: bool = False):
        return {"keys": [jwk]}

    monkeypatch.setattr(oidc_service, "get_provider_metadata", metadatos)
    monkeypatch.setattr(oidc_service, "_get_jwks", jwks)
    monkeypatch.setattr(settings, "AUTHENTIK_CLIENT_ID", CLIENT_ID)


@pytest.mark.asyncio
async def test_id_token_valido():
    claims = await oidc_service.validate_id_token(_firmado(), nonce=NONCE)
    assert claims["sub"] == "usuario"


@pytest.mark.asyncio
async def test_id_token_con_at_hash_se_acepta():
    # El flujo es de código con el token directo del IdP: at_hash es opcional.
    claims = await oidc_service.validate_id_token(_firmado(at_hash="abc"), nonce=NONCE)
    assert claims["at_hash"] == "abc"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "cambios",
    [
        {"aud": "otro-cliente"},
        {"iss": "https://otro-idp.example/"},
        {"exp": int(time.time()) - 300},
        {"nonce": "otro-nonce"},
    ],
    ids=["audiencia", "emisor", "caducado", "nonce"],
)
async def test_id_token_con_claims_invalidos(cambios):
    with pytest.raises(HTTPException) as exc:
        await oidc_service.validate_id_token(_firmado(**cambios), nonce=NONCE)
    assert exc.value.status_code == 401


def _hs256_con_clave_publica() -> str:
    der = CLAVE_IDP.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return _manual("HS256", der)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "fabrica",
    [
        _hs256_con_clave_publica,
        lambda: _manual("none", None),
        lambda: _manual("None", None),
        lambda: jwt.encode(_claims(), CLAVE_ATACANTE, algorithm="RS256", headers={"kid": KID}),
        lambda: jwt.encode(_claims(), CLAVE_EC_ATACANTE, algorithm="ES256", headers={"kid": KID}),
        lambda: jwt.encode(_claims(), CLAVE_IDP, algorithm="RS256", headers={"kid": "desconocida"}),
        lambda: "esto-no-es-un-jwt",
    ],
    ids=[
        "confusion-hs256",
        "alg-none",
        "alg-None",
        "otra-clave-rsa",
        "ec-contra-clave-rsa",
        "kid-desconocido",
        "malformado",
    ],
)
async def test_id_token_falsificado_da_401(fabrica):
    with pytest.raises(HTTPException) as exc:
        await oidc_service.validate_id_token(fabrica(), nonce=NONCE)
    assert exc.value.status_code == 401


def test_token_de_sesion_ida_y_vuelta():
    payload = verify_token(create_access_token({"sub": "codigo"}))
    assert payload["sub"] == "codigo"
    assert payload["token_type"] == "access"


def test_token_de_sesion_comprueba_tipo():
    refresh = create_refresh_token({"sub": "codigo"})
    assert verify_token(refresh) is None
    assert verify_token(refresh, expected_token_type="refresh")["sub"] == "codigo"


@pytest.mark.parametrize(
    "fabrica",
    [
        lambda: create_access_token({"sub": "codigo"}, expires_delta=timedelta(seconds=-5)),
        lambda: jwt.encode({"sub": "codigo"}, "x" * 64, algorithm="HS256"),
        lambda: jwt.encode({"sub": "codigo"}, CLAVE_ATACANTE, algorithm="RS256"),
        lambda: _manual("none", None),
        lambda: "esto-no-es-un-jwt",
    ],
    ids=["caducado", "otro-secreto", "rs256", "alg-none", "malformado"],
)
def test_token_de_sesion_invalido_devuelve_none(fabrica):
    assert verify_token(fabrica()) is None


@pytest.mark.asyncio
async def test_token_publico_exige_scope():
    token = create_access_token({"sub": "public", "scope": "public"})
    assert (await get_public_token_payload(token))["scope"] == "public"

    with pytest.raises(HTTPException) as exc:
        await get_public_token_payload(create_access_token({"sub": "codigo"}))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_token_publico_invalido_da_401():
    with pytest.raises(HTTPException) as exc:
        await get_public_token_payload("esto-no-es-un-jwt")
    assert exc.value.status_code == 401
