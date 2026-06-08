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

# API v1 routes
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.api.v1 import (
    auth,
    criterios,
    equipos,
    fases_finales,
    game_resources,
    jornadas,
    ligas,
    partidos,
    pending_actions,
    public,
    sport_proposals,
    taxonomias,
    team_access,
    tipos_deporte,
    tools,
    users,
    users_integration,
)
from app.services import health_service

api_router = APIRouter()
ops_router = APIRouter()


@ops_router.api_route("/health", methods=["GET", "HEAD"])
async def health_check_v1():
    """Lightweight health alias under the v1 prefix."""
    return JSONResponse(
        content=health_service.build_liveness_payload(),
        headers={"Cache-Control": "no-store"},
    )


@ops_router.api_route("/ready", methods=["GET", "HEAD"])
async def readiness_check_v1():
    """Readiness alias under the v1 prefix."""
    payload, ready = await health_service.build_readiness_payload()
    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload,
        headers={"Cache-Control": "no-store"},
    )

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users_integration.router, prefix="/auth", tags=["users-integration"])
api_router.include_router(ligas.router, prefix="/ligas", tags=["ligas"])
api_router.include_router(fases_finales.router, prefix="/ligas", tags=["fases-finales"])
api_router.include_router(criterios.router, prefix="/ligas", tags=["criterios-evaluacion"])
api_router.include_router(equipos.router, prefix="/equipos", tags=["equipos"])
api_router.include_router(tipos_deporte.router, prefix="/tipos-deporte", tags=["tipos-deporte"])
api_router.include_router(jornadas.router, prefix="/jornadas", tags=["jornadas"])
api_router.include_router(partidos.router, prefix="/partidos", tags=["partidos"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(team_access.router, prefix="/public", tags=["team-access"])
api_router.include_router(sport_proposals.router, prefix="/sport-proposals", tags=["sport-proposals"])
api_router.include_router(tools.router, prefix="/tools", tags=["tools"])
api_router.include_router(game_resources.router, prefix="/game-resources", tags=["game-resources"])
api_router.include_router(taxonomias.router, prefix="/taxonomias", tags=["taxonomias"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(pending_actions.router)
api_router.include_router(ops_router)
