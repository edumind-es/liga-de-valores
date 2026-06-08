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
Pydantic schemas for TipoDeporte.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any

# Response schema (read-only for users)
class TipoDeporteResponse(BaseModel):
    id: int
    nombre: str
    codigo: str
    tipo_marcador: str  # "goles", "sets", "puntos", "tries"
    permite_empate: bool
    config: Dict[str, Any] | None
    descripcion: str | None
    icono: str | None
    vt_file: str | None
    logo_file: str | None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Create schema (for admin to add new sports)
class TipoDeporteCreate(BaseModel):
    nombre: str
    codigo: str
    tipo_marcador: str  # "goles", "sets", "puntos", "tries", "carreras"
    permite_empate: bool = True
    config: Dict[str, Any] | None = None
    descripcion: str | None = None
    icono: str | None = None
    vt_file: str | None = None
    logo_file: str | None = None
