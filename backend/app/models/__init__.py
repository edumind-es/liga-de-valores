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

# Import all models here for Alembic autogenerate
from app.models.user import User
from app.models.tipo_deporte import TipoDeporte
from app.models.liga import Liga
from app.models.equipo import Equipo
from app.models.jornada import Jornada
from app.models.partido import Partido
from app.models.game_submission import GameSubmission
from app.models.criterio_evaluacion import CriterioEvaluacion
from app.models.evaluacion_personalizada import EvaluacionPersonalizada
from app.models.taxonomia_pedagogica import TaxonomiaPedagogica, GameSubmissionTaxonomia
from app.models.pending_action import PendingAction
from app.models.league_match_role_schema import (
    LeagueMatchRoleSchema,
    LeagueMatchRoleSlot,
    LeagueMatchRoleRule,
)
from app.models.fase_final import FaseFinal, CruceFase
from app.models.audit_log import AuditLog
from app.models.league_teacher_membership import LeagueTeacherMembership
from app.models.partido_nota import PartidoNota

__all__ = [
    "User",
    "TipoDeporte",
    "Liga",
    "Equipo",
    "Jornada",
    "Partido",
    "GameSubmission",
    "CriterioEvaluacion",
    "EvaluacionPersonalizada",
    "TaxonomiaPedagogica",
    "GameSubmissionTaxonomia",
    "PendingAction",
    "LeagueMatchRoleSchema",
    "LeagueMatchRoleSlot",
    "LeagueMatchRoleRule",
    "FaseFinal",
    "CruceFase",
    "AuditLog",
    "LeagueTeacherMembership",
    "PartidoNota",
]
