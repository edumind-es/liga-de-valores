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

from sqlalchemy import Column, Integer, String, Boolean, DateTime, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    """Usuario del sistema (docente/administrador)."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    plan_code = Column(String(40), nullable=False, default="free", server_default=text("'free'"), index=True)
    plan_leagues_limit = Column(Integer, nullable=True)
    grandfathered_unlimited = Column(Boolean, default=False, nullable=False, server_default=text("false"))
    grandfathered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Verificación de email
    email_verificado = Column(Boolean, default=True, nullable=False)   # True para usuarios existentes
    email_verification_token = Column(String(500), nullable=True)

    # Campos RGPD - Consentimiento (Auditoría LOPD/RGPD 2025-12-15)
    acepta_privacidad = Column(Boolean, default=False, nullable=False)
    fecha_consentimiento = Column(DateTime(timezone=True))
    ip_consentimiento = Column(String(45))  # Soporte IPv6
    
    # Integración Nextcloud (Personal por docente) - Encrypted
    nextcloud_url = Column(String(255), nullable=True)
    nextcloud_user = Column(String(100), nullable=True)
    nextcloud_password_enc = Column(String(500), nullable=True)  # Fernet encrypted token
    
    # Relaciones
    ligas = relationship("Liga", back_populates="usuario")
    league_memberships = relationship(
        "LeagueTeacherMembership",
        foreign_keys="LeagueTeacherMembership.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, codigo='{self.codigo}')>"
