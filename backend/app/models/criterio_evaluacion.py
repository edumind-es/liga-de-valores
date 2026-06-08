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
Modelo CriterioEvaluacion - Criterios personalizables por liga.

Este modelo permite a docentes crear sus propios criterios de evaluación
para ligas en modo personalizado, sin afectar el sistema legacy.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CriterioEvaluacion(Base):
    """
    Criterio de evaluación personalizable.
    
    Cada liga en modo 'personalizado' puede tener hasta 10 criterios.
    Los criterios definen qué aspectos se evalúan (ej: respeto, comunicación)
    y su configuración de puntuación.
    """
    __tablename__ = "criterios_evaluacion"
    
    id = Column(Integer, primary_key=True, index=True)
    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Información del criterio
    nombre = Column(String(50), nullable=False)  # "Respeto al Material"
    codigo = Column(String(30), nullable=False)  # "respeto_material" (para uso interno)
    descripcion = Column(Text, nullable=True)    # Texto explicativo para docentes
    
    # Categoría del criterio (para agrupación visual)
    categoria = Column(String(20), nullable=False, default='general')
    # Valores posibles: 'arbitro', 'grada_local', 'grada_visitante', 'jugador', 'general'
    
    # Configuración de escala
    escala_min = Column(Integer, default=0, nullable=False)
    escala_max = Column(Integer, default=10, nullable=False)
    
    # Umbrales para conversión a puntos de clasificación
    # Si la media >= umbral_alto -> otorga puntos_alto
    # Si la media >= umbral_medio -> otorga puntos_medio
    umbral_alto = Column(Float, default=7.0)
    umbral_medio = Column(Float, default=4.0)
    puntos_alto = Column(Float, default=1.0)
    puntos_medio = Column(Float, default=0.5)
    
    # Control de visualización
    orden = Column(Integer, default=0)  # Para ordenar en UI y radar chart
    activo = Column(Boolean, default=True, nullable=False)
    icono = Column(String(10), nullable=True)  # Emoji opcional
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    liga = relationship("Liga", back_populates="criterios_evaluacion")
    evaluaciones = relationship("EvaluacionPersonalizada", back_populates="criterio", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CriterioEvaluacion(id={self.id}, nombre='{self.nombre}', liga_id={self.liga_id})>"
