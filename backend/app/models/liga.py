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
Modelo Liga - Liga escolar.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Index, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Liga(Base):
    """Liga escolar para competiciones deportivas."""
    __tablename__ = "ligas"
    __table_args__ = (
        Index(
            "ux_ligas_public_pin_not_null",
            "public_pin",
            unique=True,
            postgresql_where=text("public_pin IS NOT NULL"),
            sqlite_where=text("public_pin IS NOT NULL"),
        ),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    temporada = Column(String(20), nullable=True)  # "2024-2025"
    activa = Column(Boolean, default=True, nullable=False)
    modo_competicion = Column(String(20), nullable=False, default='unico_deporte')  # 'unico_deporte' | 'multi_deporte'
    public_pin = Column(String(6), nullable=True)  # PIN de 6 dígitos para acceso público
    email_fichas = Column(String(255), nullable=True)  # Email para recepción de fichas de juegos
    
    # Modo de evaluación: 'clasico' (criterios fijos) o 'personalizado' (criterios configurables)
    modo_evaluacion = Column(String(20), default='clasico', nullable=False)
    
    # Configuración de liga (puntuación, etc.)
    config = Column(JSON, nullable=True, server_default='{}')
    
    # Team Portal: roles y compromisos personalizables
    team_roles = Column(JSON, nullable=True, server_default='["Capitán/a", "Entrenador/a", "Árbitro/a", "Tutor/a de grada", "Preparador/a físico/a"]')
    team_commitments = Column(JSON, nullable=True, server_default='''{"Capitán/a": ["Liderar con respeto", "Dar ejemplo", "Comunicar con el profesorado"], "Entrenador/a": ["Gestionar alineaciones", "Decidir cambios", "Organizar táctica"], "Árbitro/a": ["Ser imparcial", "Conocer las reglas", "Gestionar conflictos con calma"], "Tutor/a de grada": ["Asegurar que el equipo anime con respeto y deportividad", "Evitar insultos", "Celebrar sin humillar"], "Preparador/a físico/a": ["Ayudar en calentamiento", "Prevenir lesiones", "Motivar al equipo"]}''')
    
    # Usuario propietario
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    usuario = relationship("User", back_populates="ligas")
    equipos = relationship("Equipo", back_populates="liga", cascade="all, delete-orphan")
    jornadas = relationship("Jornada", back_populates="liga", cascade="all, delete-orphan")
    partidos = relationship("Partido", back_populates="liga", cascade="all, delete-orphan")
    criterios_evaluacion = relationship("CriterioEvaluacion", back_populates="liga", cascade="all, delete-orphan")
    match_role_schemas = relationship("LeagueMatchRoleSchema", back_populates="liga", cascade="all, delete-orphan")
    fases_finales = relationship("FaseFinal", back_populates="liga", cascade="all, delete-orphan")
    teacher_memberships = relationship("LeagueTeacherMembership", back_populates="liga", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Liga(id={self.id}, nombre='{self.nombre}', temporada='{self.temporada}')>"
