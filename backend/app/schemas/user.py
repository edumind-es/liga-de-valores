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

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# Base schema
class UserBase(BaseModel):
    codigo: str = Field(..., min_length=3, max_length=20, description="Código de usuario único")
    email: EmailStr | None = Field(None, description="Email del usuario (opcional)")

# Create schema (para registro)
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Contraseña (mínimo 6 caracteres)")
    acepta_privacidad: bool = Field(..., description="Aceptación de Política de Privacidad (obligatorio)")

# Login schema
class UserLogin(BaseModel):
    codigo: str = Field(..., description="Código de usuario")
    password: str = Field(..., description="Contraseña")

# Update schema (para admin)
class UserUpdate(BaseModel):
    codigo: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    plan_code: str | None = Field(None, max_length=40)
    plan_leagues_limit: int | None = Field(None, ge=0)
    grandfathered_unlimited: bool | None = None

# Response schema (lo que devuelve la API)
class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    plan_code: str
    plan_leagues_limit: int | None = None
    grandfathered_unlimited: bool = False
    grandfathered_at: datetime | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, description="Refresh token JWT")

class TokenData(BaseModel):
    codigo: str | None = None

class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=6, description="Nueva contraseña (mínimo 6 caracteres)")


class LeagueCapacityResponse(BaseModel):
    plan_code: str
    plan_label: str
    leagues_limit: int | None
    leagues_used: int
    leagues_remaining: int | None
    can_create_league: bool
    grandfathered_unlimited: bool
    entitlement_source: str
    grandfathering_cutoff: datetime
