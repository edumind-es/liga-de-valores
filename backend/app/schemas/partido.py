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
Pydantic schemas for Partido.
"""
from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Dict, Any

# Base schema
class PartidoBase(BaseModel):
    tipo_deporte_id: int
    equipo_local_id: int
    equipo_visitante_id: int
    arbitro_id: int | None = None
    tutor_grada_local_id: int | None = None
    tutor_grada_visitante_id: int | None = None
    fecha_hora: datetime | None = None

# Create schema
class PartidoCreate(PartidoBase):
    liga_id: int
    jornada_id: int | None = None
    
    @model_validator(mode='after')
    def validate_all_teams_different(self):
        """Ensure all 5 teams are different"""
        teams = [
            self.equipo_local_id,
            self.equipo_visitante_id,
            self.arbitro_id,
            self.tutor_grada_local_id,
            self.tutor_grada_visitante_id
        ]
        # Filter out None values
        teams_not_none = [t for t in teams if t is not None]
        
        if len(teams_not_none) != len(set(teams_not_none)):
            raise ValueError("Todos los equipos deben ser diferentes")
        
        # If all 5 are provided, ensure they're all different
        if all(teams):
            if len(set(teams)) != 5:
                raise ValueError("Los 5 equipos deben ser diferentes")
        
        return self

# Update marcador
class PartidoUpdateMarcador(BaseModel):
    marcador: Dict[str, Any] = Field(..., description="Marcador específico del deporte")
    expected_version: str | None = None

# Update evaluación
class PartidoUpdateEvaluacion(BaseModel):
    puntos_juego_limpio_local: int | None = Field(None, ge=0, le=1)
    puntos_juego_limpio_visitante: int | None = Field(None, ge=0, le=1)
    arbitro_conocimiento: int | None = Field(None, ge=0, le=10)
    arbitro_gestion: int | None = Field(None, ge=0, le=10)
    arbitro_apoyo: int | None = Field(None, ge=0, le=10)
    grada_animar_local: int | None = Field(None, ge=0, le=10)
    grada_respeto_local: int | None = Field(None, ge=0, le=10)
    grada_participacion_local: int | None = Field(None, ge=0, le=10)
    grada_animar_visitante: int | None = Field(None, ge=0, le=10)
    grada_respeto_visitante: int | None = Field(None, ge=0, le=10)
    grada_participacion_visitante: int | None = Field(None, ge=0, le=10)
    expected_version: str | None = None

# Response schema
class PartidoResponse(PartidoBase):
    id: int
    liga_id: int
    jornada_id: int | None
    marcador: Dict[str, Any] = {}
    puntos_local: int = 0
    puntos_visitante: int = 0
    resultado: str | None = None
    finalizado: bool = False
    evaluacion_completa: bool = False
    puntos_juego_limpio_local: int = 0
    puntos_juego_limpio_visitante: int = 0
    puntos_arbitro: int = 0
    puntos_grada_local: float = 0.0
    puntos_grada_visitante: float = 0.0
    arbitro_conocimiento: int | None = None
    arbitro_gestion: int | None = None
    arbitro_apoyo: int | None = None
    arbitro_media: float | None = None
    grada_animar_local: int | None = None
    grada_respeto_local: int | None = None
    grada_participacion_local: int | None = None
    grada_animar_visitante: int | None = None
    grada_respeto_visitante: int | None = None
    grada_participacion_visitante: int | None = None
    marcador_version: str | None = None
    evaluacion_version: str | None = None
    pin: str | None
    pin_valid_until: datetime | None
    created_at: datetime
    updated_at: datetime | None
    
    class Config:
        from_attributes = True

from app.schemas.tipo_deporte import TipoDeporteResponse
from app.schemas.equipo import EquipoResponse

# Response with nested info
class PartidoDetailed(PartidoResponse):
    tipo_deporte: TipoDeporteResponse
    equipo_local: EquipoResponse
    equipo_visitante: EquipoResponse
    arbitro: EquipoResponse | None = None
    tutor_grada_local: EquipoResponse | None = None
    tutor_grada_visitante: EquipoResponse | None = None
    marcador_local: int = 0
    marcador_visitante: int = 0
