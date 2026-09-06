#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import redis.asyncio as aioredis

# SQLAlchemy Base
class Base(DeclarativeBase):
    pass

# Motor de BD con pool dimensionado para 4 workers uvicorn + worker arq.
# Presupuesto de conexiones (Postgres max_connections=100):
#   4 procesos uvicorn × (pool 5 + overflow 5) = 40 máx.
#   worker arq (pool propio pequeño)           ≈  5
#   cron de limpieza + alembic                 ≈  5
#   margen para psql/backups                   = resto
# Los parámetros de pool solo aplican a Postgres: SQLite (tests) usa
# StaticPool y no los admite.
_pool_opts = {}
if settings.DATABASE_URL.startswith("postgresql"):
    _pool_opts = dict(
        pool_size=5,           # conexiones persistentes por proceso
        max_overflow=5,        # picos puntuales por proceso
        pool_pre_ping=True,    # detecta conexiones muertas tras reinicios de Postgres
        pool_recycle=1800,     # recicla conexiones cada 30 min (evita cierres por idle)
        pool_timeout=30,
    )

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    **_pool_opts,
)

# Session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Redis connection pool
# Timeouts cortos: si Redis cae, los usos (caché, throttle) degradan
# rápido a su camino sin caché en lugar de colgar la petición
redis_pool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
)

async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_redis():
    """Dependency to get Redis connection."""
    redis = aioredis.Redis(connection_pool=redis_pool)
    try:
        yield redis
    finally:
        await redis.close()
