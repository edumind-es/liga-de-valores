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
Pydantic schemas for Liga.
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


ALLOWED_SLOT_KEYS = {"home_team", "away_team", "slot_3", "slot_4", "slot_5"}


class MatchRoleSlotInput(BaseModel):
    slot_key: str = Field(..., description="home_team|away_team|slot_3|slot_4|slot_5")
    slot_order: int | None = Field(None, ge=1, le=5)
    role_code: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-z0-9_]+$")
    role_label: str | None = Field(None, max_length=120)
    scoring_category: str | None = Field(None, max_length=32)
    is_required: bool = True
    evaluation_enabled: bool = True

    @field_validator("slot_key", mode="before")
    @classmethod
    def normalize_slot_key(cls, value):
        if not isinstance(value, str):
            return value
        normalized = value.strip().lower()
        if normalized not in ALLOWED_SLOT_KEYS:
            raise ValueError("slot_key invalido")
        return normalized

    @field_validator("role_code", mode="before")
    @classmethod
    def normalize_role_code(cls, value):
        if not isinstance(value, str):
            return value
        return value.strip().lower()


class MatchRoleRuleInput(BaseModel):
    role_code: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-z0-9_]+$")
    rule_code: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-z0-9_]+$")
    params_json: dict = Field(default_factory=dict)

    @field_validator("role_code", "rule_code", mode="before")
    @classmethod
    def normalize_codes(cls, value):
        if not isinstance(value, str):
            return value
        return value.strip().lower()


class MatchRoleSchemaInput(BaseModel):
    roles_per_match: int = Field(5, ge=3, le=5)
    slots: list[MatchRoleSlotInput] | None = None
    rules: list[MatchRoleRuleInput] | None = None


class MatchRoleSlotResponse(BaseModel):
    id: int
    slot_key: str
    slot_order: int
    role_code: str
    role_label: str
    scoring_category: str
    is_required: bool
    evaluation_enabled: bool

    class Config:
        from_attributes = True


class MatchRoleRuleResponse(BaseModel):
    id: int
    role_code: str
    rule_code: str
    params_json: dict = Field(default_factory=dict)

    class Config:
        from_attributes = True


class MatchRoleSchemaResponse(BaseModel):
    id: int
    liga_id: int
    version: int
    roles_per_match: int
    status: str
    locked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    slots: list[MatchRoleSlotResponse] = Field(default_factory=list)
    rules: list[MatchRoleRuleResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# Base schema
class LigaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: str | None = None
    temporada: str | None = Field(None, max_length=20, description="Ej: 2024-2025")
    activa: bool = True
    modo_competicion: str = Field(default='unico_deporte', description="Modo de competición: 'unico_deporte' o 'multi_deporte'")
    modo_evaluacion: str = Field(default='clasico', description="Modo de evaluación: 'clasico' (criterios fijos) o 'personalizado' (criterios configurables)")
    email_fichas: str | None = Field(None, description="Email para recibir fichas de juegos")
    config: dict | None = Field(default_factory=dict, description="Configuración adicional JSON")
    team_roles: list[str] | None = Field(default=None, description="Roles pedagogicos del portal de equipos")
    team_commitments: dict[str, list[str]] | None = Field(default=None, description="Compromisos pedagogicos por rol")

# Create schema
class LigaCreate(LigaBase):
    match_role_schema: MatchRoleSchemaInput | None = None

# Update schema
class LigaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    descripcion: str | None = None
    temporada: str | None = None
    activa: bool | None = None
    modo_competicion: str | None = Field(None, description="Modo de competición: 'unico_deporte' o 'multi_deporte'")
    modo_evaluacion: str | None = Field(None, description="Modo de evaluación: 'clasico' o 'personalizado'")
    public_pin: str | None = Field(
        None,
        description="PIN de 6 caracteres para acceso público. Usa null/vacío para deshabilitar.",
        max_length=6,
    )
    email_fichas: str | None = Field(None, description="Email para recibir fichas de juegos")
    config: dict | None = None
    team_roles: list[str] | None = None
    team_commitments: dict[str, list[str]] | None = None
    match_role_schema: MatchRoleSchemaInput | None = None

    @field_validator("public_pin", mode="before")
    @classmethod
    def normalize_public_pin(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("public_pin")
    @classmethod
    def validate_public_pin_length(cls, v):
        if v is None:
            return None
        if len(v) != 6:
            raise ValueError("El PIN debe tener exactamente 6 caracteres")
        return v

# Calendar generation schema
class CalendarCreate(BaseModel):
    tipo_deporte_id: int
    start_date: datetime | None = None

# Public Login schema
class PublicLogin(BaseModel):
    liga_id: int
    pin: str

    @field_validator("pin", mode="before")
    @classmethod
    def normalize_pin(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("pin")
    @classmethod
    def validate_pin_length(cls, v):
        if len(v) != 6:
            raise ValueError("El PIN debe tener exactamente 6 caracteres")
        return v

# Response schema
class LigaResponse(LigaBase):
    id: int
    usuario_id: int
    modo_competicion: str
    public_pin: str | None = None
    match_role_schema: MatchRoleSchemaResponse | None = None
    created_at: datetime
    updated_at: datetime | None
    
    class Config:
        from_attributes = True

class LigaPublicResponse(LigaBase):
    id: int
    usuario_id: int
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True

# Response with counts
class LigaWithStats(LigaResponse):
    total_equipos: int = 0
    total_jornadas: int = 0
    total_partidos: int = 0
