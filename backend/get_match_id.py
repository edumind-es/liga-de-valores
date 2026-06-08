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


import asyncio
from app.utils.db_guard import get_database_url
get_database_url()
from app.database import AsyncSessionLocal
from app.models import Partido
from sqlalchemy import select

async def get_ids():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Partido).where(Partido.jornada_id == 7))
        partidos = result.scalars().all()
        if partidos:
            print(f"Partido ID: {partidos[0].id}")
        else:
            print("No matches found")

if __name__ == "__main__":
    asyncio.run(get_ids())
