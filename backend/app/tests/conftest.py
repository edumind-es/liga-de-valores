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

"""
Pytest configuration and fixtures.
"""
import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Test database URL (override via PYTEST_DATABASE_URL when needed)
TEST_DATABASE_URL = os.getenv("PYTEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

# Ensure required settings exist for tests.
if not os.getenv("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "test-secret-key"
debug_value = os.getenv("DEBUG", "").strip().lower()
if debug_value not in {"", "0", "1", "true", "false", "yes", "no", "on", "off"}:
    os.environ["DEBUG"] = "false"
else:
    os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("DISABLE_STATS_UPDATES", "1")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("AUTH_COOKIE_SECURE", "false")

# Safety guard: avoid running tests against non-test databases unless explicitly allowed.
existing_db_url = os.getenv("DATABASE_URL", "").strip()
if not existing_db_url:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
elif not existing_db_url.startswith("sqlite"):
    if os.getenv("PYTEST_ALLOW_REAL_DB") != "1":
        raise RuntimeError(
            "Refusing to run tests with a non-test DATABASE_URL. "
            "Set PYTEST_ALLOW_REAL_DB=1 only if you intend to run against a dedicated test DB."
        )

from app.main import app
from app.database import Base, get_db
# Import all models to ensure they are registered in Base.metadata
from app.models import User, Liga, Equipo, TipoDeporte, Jornada, Partido

@pytest_asyncio.fixture
async def db():
    """Create test database."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    # Seed initial data (TiposDeporte)
    from app.models import TipoDeporte
    async with async_session() as session:
        sports = [
            TipoDeporte(nombre="Fútbol Sala", codigo="FUT", tipo_marcador="goles"),
            TipoDeporte(nombre="Baloncesto", codigo="BAL", tipo_marcador="puntos"),
            TipoDeporte(nombre="Voleibol", codigo="VOL", tipo_marcador="sets"),
            TipoDeporte(nombre="Balonmano", codigo="BM", tipo_marcador="goles"),
            TipoDeporte(nombre="Badminton", codigo="BAD", tipo_marcador="sets"),
            TipoDeporte(nombre="Colpball", codigo="COL", tipo_marcador="goles"),
            TipoDeporte(nombre="Rugby Tag", codigo="RUG", tipo_marcador="ensayos"),
            TipoDeporte(nombre="Ultimate", codigo="ULT", tipo_marcador="puntos"),
        ]
        session.add_all(sports)
        await session.commit()
    
    yield async_session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest_asyncio.fixture
async def session(db):
    """Create test session."""
    async with db() as session:
        yield session

@pytest_asyncio.fixture
async def client(db):
    """Create test client with test database."""
    async def override_get_db():
        async with db() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
