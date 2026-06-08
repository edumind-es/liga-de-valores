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

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.tests.utils.utils import create_random_user, authentication_token_from_email

@pytest.mark.asyncio
async def test_read_tipos_deporte(client: AsyncClient, session: AsyncSession):
    # Public endpoint, no auth needed
    response = await client.get("/api/v1/tipos-deporte/")
    assert response.status_code == 200
    content = response.json()
    assert len(content) >= 8  # We seeded 8 sports
    
    # Check structure
    sport = content[0]
    assert "nombre" in sport
    assert "codigo" in sport
    assert "tipo_marcador" in sport

@pytest.mark.asyncio
async def test_read_tipo_deporte_detail(client: AsyncClient, session: AsyncSession):
    # Get ID from list first
    response = await client.get("/api/v1/tipos-deporte/")
    content = response.json()
    sport_id = content[0]["id"]
    
    response = await client.get(f"/api/v1/tipos-deporte/{sport_id}")
    assert response.status_code == 200
    content = response.json()
    assert content["id"] == sport_id
