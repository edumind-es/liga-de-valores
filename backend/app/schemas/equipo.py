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
Pydantic schemas for Equipo.
"""
from pydantic import BaseModel, Field
from datetime import datetime

# Base schema
class EquipoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    color_principal: str | None = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$', description="Color hex (#FF5733)")

# Create schema
class EquipoCreate(EquipoBase):
    liga_id: int

# Update schema
class EquipoUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    color_principal: str | None = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')

# Response schema
class EquipoResponse(EquipoBase):
    id: int
    liga_id: int
    logo_filename: str | None
    logo_url: str | None = None  # URL to optimized team logo
    acceso_token: str | None
    puntos_totales: int
    ganados: int
    empatados: int
    perdidos: int
    puntos_juego_limpio: int
    puntos_arbitro: int
    puntos_grada: float  # Soporta medios puntos
    created_at: datetime
    
    class Config:
        from_attributes = True

# Response with logo URL
class EquipoWithLogo(EquipoResponse):
    logo_url: str | None = None
