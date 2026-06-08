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
Pydantic schemas for Jornada.
"""
from pydantic import BaseModel, Field
from datetime import datetime

# Base schema
class JornadaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    numero: int | None = None

# Create schema
class JornadaCreate(JornadaBase):
    liga_id: int

# Update schema
class JornadaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    numero: int | None = None

# Response schema
class JornadaResponse(JornadaBase):
    id: int
    liga_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Response with matches count
class JornadaWithStats(JornadaResponse):
    total_partidos: int = 0
