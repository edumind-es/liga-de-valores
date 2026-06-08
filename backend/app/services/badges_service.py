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

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Partido, Jornada, Equipo

class BadgesService:
    @staticmethod
    async def calculate_badges(equipo_id: int, db: AsyncSession):
        badges = []
        
        # Obtener todos los partidos finalizados
        query = select(Partido).where(
            (Partido.finalizado == True) &
            ((Partido.equipo_local_id == equipo_id) | 
             (Partido.equipo_visitante_id == equipo_id) |
             (Partido.arbitro_id == equipo_id))
        )
        result = await db.execute(query)
        partidos = result.scalars().all()
        
        if not partidos:
            return []

        # Stats
        juego_limpio_vals = []
        grada_vals = []
        arbitraje_vals = []
        
        for p in partidos:
            if p.equipo_local_id == equipo_id:
                juego_limpio_vals.append(p.puntos_juego_limpio_local)
                grada_vals.append(p.puntos_grada_local)
            elif p.equipo_visitante_id == equipo_id:
                juego_limpio_vals.append(p.puntos_juego_limpio_visitante)
                grada_vals.append(p.puntos_grada_visitante)
            elif p.arbitro_id == equipo_id:
                # Promedio arbitraje
                c = p.arbitro_conocimiento or 0
                g = p.arbitro_gestion or 0
                a = p.arbitro_apoyo or 0
                arbitraje_vals.append((c + g + a) / 3)

        # 1. Escudo de Oro (Juego Limpio > 4.5 en promedio)
        if juego_limpio_vals:
            avg_jl = sum(juego_limpio_vals) / len(juego_limpio_vals)
            if avg_jl >= 4.5:
                badges.append({
                    "id": "fair_play_gold",
                    "name": "Escudo de Oro",
                    "description": "Excelencia en Juego Limpio (>4.5)",
                    "icon": "ShieldCheck",
                    "color": "text-yellow-500"
                })

        # 2. Hinchada Ejemplar (Grada > 3.5 en promedio)
        if grada_vals:
            avg_grada = sum(grada_vals) / len(grada_vals)
            if avg_grada >= 3.5:
                badges.append({
                    "id": "best_fans",
                    "name": "Hinchada Ejemplar",
                    "description": "Grada siempre respetuosa y animada (>3.5)",
                    "icon": "Megaphone",
                    "color": "text-green-500"
                })

        # 3. Silbato Maestro (Arbitraje > 8.0 en promedio)
        if arbitraje_vals:
            avg_arb = sum(arbitraje_vals) / len(arbitraje_vals)
            if avg_arb >= 8.0:
                badges.append({
                    "id": "master_referee",
                    "name": "Silbato Maestro",
                    "description": "Excelente desempeño arbitral (>8.0)",
                    "icon": "Whistle", # Lucide icon name, might need mapping in frontend
                    "color": "text-blue-500"
                })
        
        # 4. Espíritu Deportivo (Nunca menos de 3 en JL)
        if juego_limpio_vals and all(v >= 3 for v in juego_limpio_vals) and len(juego_limpio_vals) >= 3:
             badges.append({
                "id": "sportsmanship",
                "name": "Espíritu Deportivo",
                "description": "Regularidad inquebrantable en valores",
                "icon": "HeartHandshake",
                "color": "text-pink-500"
            })
            
        return badges
