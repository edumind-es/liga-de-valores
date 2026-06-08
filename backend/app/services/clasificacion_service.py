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
Servicio de clasificación para ligas.
Acumula puntos deportivos + puntos educativos (MRPS, arbitraje, grada).
"""
import asyncio
import os
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Iterable
from app.models import Liga, Equipo, Partido
from app.database import AsyncSessionLocal, redis_pool
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

class ClasificacionService:
    """Servicio para calcular clasificaciones de ligas."""
    _stats_update_semaphore = asyncio.Semaphore(
        max(1, int(os.getenv("STATS_UPDATE_MAX_CONCURRENCY", "8")))
    )
    
    @staticmethod
    async def calcular_clasificacion(liga_id: int, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Calcula la clasificación completa de una liga.
        
        Incluye:
        - Puntos deportivos (3-2-1 sistema EDUmind)
        - Puntos educativos: MRPS + Arbitraje + Grada
        
        Returns:
            Lista de equipos ordenados por puntos totales
        """
        # Obtener todos los equipos de la liga
        result = await db.execute(
            select(Equipo).where(Equipo.liga_id == liga_id)
        )
        equipos = result.scalars().all()
        
        # Obtener todos los partidos finalizados
        result = await db.execute(
            select(Partido).where(
                Partido.liga_id == liga_id,
                Partido.finalizado == True
            )
        )
        partidos = result.scalars().all()
        
        # Inicializar clasificación
        clasificacion = {}
        for equipo in equipos:
            clasificacion[equipo.id] = {
                "equipo_id": equipo.id,
                "equipo_nombre": equipo.nombre,
                "logo_filename": equipo.logo_filename,
                # Puntos deportivos
                "puntos_deportivos": 0,
                "partidos_jugados": 0,
                "ganados": 0,
                "empatados": 0,
                "perdidos": 0,
                # Puntos educativos
                "puntos_juego_limpio": 0,
                "puntos_arbitro": 0,
                "puntos_grada": 0,
                "puntos_educativos_total": 0,
                # Total
                "puntos_totales": 0,
            }
        
        # Procesar partidos
        for partido in partidos:
            # Equipo local - puntos deportivos y juego limpio
            if partido.equipo_local_id in clasificacion:
                cl = clasificacion[partido.equipo_local_id]
                cl["puntos_deportivos"] += partido.puntos_local
                cl["partidos_jugados"] += 1

                if partido.resultado == "V":
                    cl["ganados"] += 1
                elif partido.resultado == "E":
                    cl["empatados"] += 1
                elif partido.resultado == "D":
                    cl["perdidos"] += 1

                cl["puntos_juego_limpio"] += partido.puntos_juego_limpio_local

            # Equipo visitante - puntos deportivos y juego limpio
            if partido.equipo_visitante_id in clasificacion:
                cv = clasificacion[partido.equipo_visitante_id]
                cv["puntos_deportivos"] += partido.puntos_visitante
                cv["partidos_jugados"] += 1

                if partido.resultado == "D":
                    cv["ganados"] += 1
                elif partido.resultado == "E":
                    cv["empatados"] += 1
                elif partido.resultado == "V":
                    cv["perdidos"] += 1

                cv["puntos_juego_limpio"] += partido.puntos_juego_limpio_visitante

            # Roles educativos independientes (por equipo asignado al rol)
            if partido.arbitro_id and partido.arbitro_id in clasificacion:
                clasificacion[partido.arbitro_id]["puntos_arbitro"] += partido.puntos_arbitro or 0
            if partido.tutor_grada_local_id and partido.tutor_grada_local_id in clasificacion:
                clasificacion[partido.tutor_grada_local_id]["puntos_grada"] += partido.puntos_grada_local or 0
            if partido.tutor_grada_visitante_id and partido.tutor_grada_visitante_id in clasificacion:
                clasificacion[partido.tutor_grada_visitante_id]["puntos_grada"] += partido.puntos_grada_visitante or 0
        
        # Calcular totales
        for equipo_id, datos in clasificacion.items():
            datos["puntos_educativos_total"] = (
                datos["puntos_juego_limpio"] +
                datos["puntos_arbitro"] +
                datos["puntos_grada"]
            )
            datos["puntos_totales"] = (
                datos["puntos_deportivos"] +
                datos["puntos_educativos_total"]
            )
        
        # Ordenar por:
        # 1. Puntos totales (desc)
        # 2. Puntos deportivos (desc)
        # 3. Diferencia ganados-perdidos (desc)
        # 4. Puntos educativos (desc)
        clasificacion_ordenada = sorted(
            clasificacion.values(),
            key=lambda x: (
                x["puntos_totales"],
                x["puntos_deportivos"],
                x["ganados"] - x["perdidos"],
                x["puntos_educativos_total"]
            ),
            reverse=True
        )
        
        # Añadir posición
        for i, equipo in enumerate(clasificacion_ordenada, start=1):
            equipo["posicion"] = i
        
        return clasificacion_ordenada
    
    @staticmethod
    async def actualizar_stats_equipo(equipo_id: int, db: AsyncSession):
        """
        Actualiza las estadísticas denormalizadas de un equipo.
        Se llama después de finalizar un partido.
        """
        equipo = await db.get(Equipo, equipo_id)
        if not equipo:
            return
        
        # Obtener TODOS los partidos finalizados donde el equipo participó en CUALQUIER rol
        result = await db.execute(
            select(Partido).where(
                Partido.finalizado == True,
                (
                    (Partido.equipo_local_id == equipo_id) |
                    (Partido.equipo_visitante_id == equipo_id) |
                    (Partido.arbitro_id == equipo_id) |
                    (Partido.tutor_grada_local_id == equipo_id) |
                    (Partido.tutor_grada_visitante_id == equipo_id)
                )
            )
        )
        partidos = result.scalars().all()
        
        # Resetear stats
        equipo.puntos_totales = 0
        equipo.ganados = 0
        equipo.empatados = 0
        equipo.perdidos = 0
        equipo.puntos_juego_limpio = 0
        equipo.puntos_arbitro = 0
        equipo.puntos_grada = 0
        
        # Acumular puntos de TODOS los roles
        for partido in partidos:
            # ROL 1: Equipo Local
            if partido.equipo_local_id == equipo_id:
                equipo.puntos_totales += partido.puntos_local
                if partido.resultado == "V":
                    equipo.ganados += 1
                elif partido.resultado == "E":
                    equipo.empatados += 1
                elif partido.resultado == "D":
                    equipo.perdidos += 1
                
                equipo.puntos_juego_limpio += partido.puntos_juego_limpio_local
            
            # ROL 2: Equipo Visitante
            elif partido.equipo_visitante_id == equipo_id:
                equipo.puntos_totales += partido.puntos_visitante
                if partido.resultado == "D":
                    equipo.ganados += 1
                elif partido.resultado == "E":
                    equipo.empatados += 1
                elif partido.resultado == "V":
                    equipo.perdidos += 1
                
                equipo.puntos_juego_limpio += partido.puntos_juego_limpio_visitante
            
            # ROL 3: Árbitro
            if partido.arbitro_id == equipo_id:
                equipo.puntos_arbitro += partido.puntos_arbitro or 0
            
            # ROL 4: Grada Local
            if partido.tutor_grada_local_id == equipo_id:
                equipo.puntos_grada += partido.puntos_grada_local or 0
            
            # ROL 5: Grada Visitante
            if partido.tutor_grada_visitante_id == equipo_id:
                equipo.puntos_grada += partido.puntos_grada_visitante or 0
        
        # Sumar puntos educativos al total
        equipo.puntos_totales += (
            equipo.puntos_juego_limpio +
            equipo.puntos_arbitro +
            equipo.puntos_grada
        )
        
        await db.commit()

    @staticmethod
    async def _run_update(equipo_id: int) -> None:
        async with ClasificacionService._stats_update_semaphore:
            try:
                async with AsyncSessionLocal() as session:
                    await ClasificacionService.actualizar_stats_equipo(equipo_id, session)
            except Exception:
                logger.exception("Error actualizando estadisticas de equipo", extra={"equipo_id": equipo_id})

    @staticmethod
    async def schedule_stats_updates(
        equipo_ids: Iterable[int],
        throttle_seconds: int = 5,
        force: bool = False
    ) -> None:
        """
        Schedule stats updates for teams with optional throttling using Redis.
        This avoids recalculating on every single marcador/evaluacion change.
        """
        if os.getenv("DISABLE_STATS_UPDATES") == "1":
            return
        ids = {eid for eid in equipo_ids if eid is not None}
        if not ids:
            return

        if force:
            for equipo_id in ids:
                asyncio.create_task(ClasificacionService._run_update(equipo_id))
            return

        redis = aioredis.Redis(connection_pool=redis_pool)
        try:
            for equipo_id in ids:
                key = f"clasificacion:update:{equipo_id}"
                should_run = await redis.set(key, "1", ex=throttle_seconds, nx=True)
                if should_run:
                    asyncio.create_task(ClasificacionService._run_update(equipo_id))
        except Exception:
            logger.warning("Fallo Redis en throttle de clasificacion; se ejecuta fallback local")
            for equipo_id in ids:
                asyncio.create_task(ClasificacionService._run_update(equipo_id))
        finally:
            await redis.close()
