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

from pydantic import BaseModel, EmailStr,  HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime

class SportProposalBase(BaseModel):
    nombre: str
    tipo_marcador: str
    descripcion: str
    caracteristicas_adicionales: Optional[str] = None
    config_sugerida: Optional[Dict[str, Any]] = None
    web_url: Optional[str] = None
    email_contacto: EmailStr

class SportProposalCreate(SportProposalBase):
    pass

class SportProposalUpdate(BaseModel):
    status: Optional[str] = None
    # We could allow updating other fields if needed, but for now status is key.

class SportProposal(SportProposalBase):
    id: int
    created_at: datetime
    status: str
    logo_filename: Optional[str] = None

    class Config:
        from_attributes = True
