from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def _trusted_proxy_set() -> frozenset[str]:
    return frozenset(ip.strip() for ip in settings.TRUSTED_PROXIES.split(",") if ip.strip())


def _rate_limit_key(request: Request) -> str:
    """
    Resolve client identity for rate limiting.
    X-Forwarded-For solo se respeta si la conexión viene de un proxy de confianza
    (nginx en este servidor conecta desde 127.0.0.1). Esto previene IP spoofing
    por inyección de header desde clientes externos.
    """
    peer = request.client.host if request.client else ""
    if peer in _trusted_proxy_set():
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            first_hop = forwarded_for.split(",")[0].strip()
            if first_hop:
                return first_hop
    return peer or get_remote_address(request)


limiter_options = {
    "key_func": _rate_limit_key,
    "enabled": settings.RATE_LIMIT_ENABLED,
}

if settings.RATE_LIMIT_ENABLED:
    storage_uri = settings.RATE_LIMIT_STORAGE_URL or settings.REDIS_URL
    if storage_uri:
        limiter_options["storage_uri"] = storage_uri

limiter = Limiter(**limiter_options)
