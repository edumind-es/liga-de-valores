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
from app.services.calendar_generator import generar_calendario_jornada
from app.models import Partido
from sqlalchemy import select

async def verify():
    async with AsyncSessionLocal() as db:
        print("Calling generar_calendario_jornada...")
        try:
            partidos = await generar_calendario_jornada(
                db=db,
                jornada_id=7, # Jornada ID from setup
                liga_id=9,    # Liga ID from setup
                tipo_deporte_id=1
            )
            await db.commit()
            
            print(f"Generated {len(partidos)} matches.")
            for p in partidos:
                print(f"Match: Local={p.equipo_local_id} vs Visitante={p.equipo_visitante_id} | Arbitro={p.arbitro_id}")
            
            if len(partidos) == 3:
                print("SUCCESS: 3 matches generated as expected for 6 teams.")
            else:
                print(f"FAILURE: Expected 3 matches, got {len(partidos)}.")
                
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
