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

# Import all schemas here
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, TokenData, LeagueCapacityResponse
from app.schemas.tipo_deporte import TipoDeporteResponse
from app.schemas.liga import (
    LigaCreate,
    LigaUpdate,
    LigaResponse,
    LigaPublicResponse,
    LigaWithStats,
    CalendarCreate,
    PublicLogin,
    MatchRoleSchemaInput,
    MatchRoleSchemaResponse,
    MatchRoleSlotInput,
    MatchRoleSlotResponse,
    MatchRoleRuleInput,
    MatchRoleRuleResponse,
)
from app.schemas.equipo import EquipoCreate, EquipoUpdate, EquipoResponse, EquipoWithLogo
from app.schemas.partido import (
    PartidoCreate,
    PartidoUpdateMarcador,
    PartidoUpdateEvaluacion,
    PartidoResponse,
    PartidoDetailed,
)
from app.schemas.league_teacher_membership import (
    LeagueTeacherMemberResponse,
    LeagueTeacherMemberUpsert,
    LeagueTeacherPermissions,
)
from app.schemas.jornada import JornadaCreate, JornadaUpdate, JornadaResponse, JornadaWithStats
from app.schemas.criterio_evaluacion import (
    CriterioEvaluacionCreate,
    CriterioEvaluacionUpdate,
    CriterioEvaluacionResponse,
    EvaluacionPersonalizadaCreate,
    EvaluacionPersonalizadaResponse,
    EvaluacionPersonalizadaBulkInput,
    PlantillaEvaluacion,
    PLANTILLAS_EVALUACION,
)

__all__ = [
    # User/Auth
    "UserCreate",
    "UserLogin", 
    "UserResponse",
    "Token",
    "TokenData",
    "LeagueCapacityResponse",
    # TipoDeporte
    "TipoDeporteResponse",
    # Liga
    "LigaCreate",
    "LigaUpdate",
    "LigaResponse",
    "LigaPublicResponse",
    "LigaWithStats",
    "CalendarCreate",
    "PublicLogin",
    "MatchRoleSchemaInput",
    "MatchRoleSchemaResponse",
    "MatchRoleSlotInput",
    "MatchRoleSlotResponse",
    "MatchRoleRuleInput",
    "MatchRoleRuleResponse",
    # Equipo
    "EquipoCreate",
    "EquipoUpdate",
    "EquipoResponse",
    "EquipoWithLogo",
    # Partido
    "PartidoCreate",
    "PartidoUpdateMarcador",
    "PartidoUpdateEvaluacion",
    "PartidoResponse",
    "PartidoDetailed",
    "LeagueTeacherMemberResponse",
    "LeagueTeacherMemberUpsert",
    "LeagueTeacherPermissions",
    # Jornada
    "JornadaCreate",
    "JornadaUpdate",
    "JornadaResponse",
    "JornadaWithStats",
    # Criterio Evaluación
    "CriterioEvaluacionCreate",
    "CriterioEvaluacionUpdate",
    "CriterioEvaluacionResponse",
    "EvaluacionPersonalizadaCreate",
    "EvaluacionPersonalizadaResponse",
    "EvaluacionPersonalizadaBulkInput",
    "PlantillaEvaluacion",
    "PLANTILLAS_EVALUACION",
]
