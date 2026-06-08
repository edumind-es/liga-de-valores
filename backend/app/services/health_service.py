from __future__ import annotations

import time
from datetime import datetime, timezone
from uuid import uuid4

import redis.asyncio as aioredis
from sqlalchemy import text

from app.database import engine, redis_pool


def _iso_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _latency_ms(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1000, 2)


def _error_payload(name: str, started_at: float, exc: Exception) -> dict[str, object]:
    return {
        "name": name,
        "status": "error",
        "latency_ms": _latency_ms(started_at),
        "detail": exc.__class__.__name__,
    }


async def check_database() -> dict[str, object]:
    started_at = time.perf_counter()

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))

        return {
            "name": "postgres",
            "status": "ok",
            "latency_ms": _latency_ms(started_at),
        }
    except Exception as exc:
        return _error_payload("postgres", started_at, exc)


async def check_redis() -> dict[str, object]:
    started_at = time.perf_counter()
    redis = aioredis.Redis(connection_pool=redis_pool)
    probe_key = f"health:{uuid4().hex}"

    try:
        pong = await redis.ping()
        if pong not in (True, "PONG"):
            raise RuntimeError("Unexpected Redis PING response")

        await redis.set(probe_key, "1", ex=15)
        value = await redis.get(probe_key)
        if value != "1":
            raise RuntimeError("Redis readback failed")
        await redis.delete(probe_key)

        return {
            "name": "redis",
            "status": "ok",
            "latency_ms": _latency_ms(started_at),
        }
    except Exception as exc:
        return _error_payload("redis", started_at, exc)
    finally:
        await redis.close()


def build_liveness_payload() -> dict[str, object]:
    return {
        "status": "healthy",
        "service": "live",
        "timestamp": _iso_timestamp(),
    }


async def build_readiness_payload() -> tuple[dict[str, object], bool]:
    started_at = time.perf_counter()
    db_check = await check_database()
    redis_check = await check_redis()
    ready = db_check["status"] == "ok" and redis_check["status"] == "ok"

    payload = {
        "status": "healthy" if ready else "degraded",
        "service": "ready",
        "timestamp": _iso_timestamp(),
        "latency_ms": _latency_ms(started_at),
        "checks": {
            "postgres": db_check,
            "redis": redis_check,
        },
    }

    return payload, ready
