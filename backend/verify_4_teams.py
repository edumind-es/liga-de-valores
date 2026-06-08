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
from app.services.calendar_generator import generar_calendario_jornada, generar_calendario_all_vs_all
from app.models import Partido, Equipo, Jornada, Liga
from sqlalchemy import select, func, delete

async def verify_4_teams():
    async with AsyncSessionLocal() as db:
        print("🔍 Starting verification for 4 teams...")

        # 1. Find or Create a League with exactly 4 teams
        # We'll try to find one first to avoid pollution, otherwise create dummy data
        # For this test script, let's look for a league with 4 teams
        
        # Simplified: We will mock the logic by calling the service directly 
        # mimicking the API controller logic
        
        # Checking existing leagues with 4 teams
        leagues = await db.execute(select(Liga))
        leagues = leagues.scalars().all()
        
        target_liga = None
        for liga in leagues:
            count = await db.scalar(select(func.count()).select_from(Equipo).where(Equipo.liga_id == liga.id))
            if count == 4:
                target_liga = liga
                print(f"✅ Found existing league with 4 teams: {liga.nombre} (ID: {liga.id})")
                break
        
        if not target_liga:
            print("⚠️ No 4-team league found. Cannot reproduce without data. Please ensure a 4-team league exists.")
            return

        # 2. Get a Jornada
        jornada = await db.scalar(select(Jornada).where(Jornada.liga_id == target_liga.id))
        if not jornada:
            print("⚠️ No jornada found for this league.")
            return
            
        print(f"Testing with Jornada ID: {jornada.id}, League ID: {target_liga.id}")
        
        # 3. Simulate API Logic
        num_equipos = 4
        print(f"Detected {num_equipos} teams.")
        
        # Logic from jornadas.py
        if target_liga.modo_competicion == 'multi_deporte' or num_equipos <= 4:
            print("👉 Decision: All-vs-All (Correct Path)")
            method = generar_calendario_all_vs_all
        else:
            print("👉 Decision: Round-Robin (Incorrect Path for 4 teams)")
            method = generar_calendario_jornada

        # 4. Execute Generation
        try:
             # Clean previous matches
            await db.execute(delete(Partido).where(Partido.jornada_id == jornada.id))
            
            partidos = await method(
                db=db,
                jornada_id=jornada.id,
                liga_id=target_liga.id,
                tipo_deporte_id=1
            )
            print(f"🎉 Generated {len(partidos)} matches.")
            
            if len(partidos) == 6:
                print("✅ TEST PASSED: 6 Matches generated.")
            elif len(partidos) == 2:
                print("❌ TEST FAILED: Only 2 Matches generated (Standard Round Robin used).")
            else:
                print(f"❌ TEST FAILED: Unexpected count {len(partidos)}.")

            for p in partidos:
                print(f"   Match: {p.equipo_local_id} vs {p.equipo_visitante_id}")
                
        except Exception as e:
            print(f"❌ Error during generation: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_4_teams())
