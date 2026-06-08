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
Modelo EvaluacionPersonalizada - Valores de evaluación para partidos con criterios personalizados.

Este modelo almacena los valores de evaluación para partidos en ligas con modo 'personalizado'.
Los partidos en ligas con modo 'clasico' siguen usando los campos fijos del modelo Partido.
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EvaluacionPersonalizada(Base):
    """
    Valor de evaluación para un criterio personalizado en un partido.
    
    Cada registro representa la puntuación de un criterio específico
    en un partido específico. Para criterios de grada, se incluye
    equipo_id para distinguir local/visitante.
    """
    __tablename__ = "evaluaciones_personalizadas"
    
    id = Column(Integer, primary_key=True, index=True)
    partido_id = Column(Integer, ForeignKey("partidos.id", ondelete="CASCADE"), nullable=False, index=True)
    criterio_id = Column(Integer, ForeignKey("criterios_evaluacion.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Para criterios que aplican a un equipo específico (ej: grada local vs visitante)
    # NULL = criterio general (como arbitraje que es único)
    equipo_id = Column(Integer, ForeignKey("equipos.id", ondelete="SET NULL"), nullable=True)
    
    # Valor de la evaluación (dentro de la escala del criterio)
    valor = Column(Integer, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    partido = relationship("Partido", back_populates="evaluaciones_personalizadas")
    criterio = relationship("CriterioEvaluacion", back_populates="evaluaciones")
    equipo = relationship("Equipo")
    
    # Constraint: Un criterio solo puede tener un valor por partido+equipo
    __table_args__ = (
        UniqueConstraint('partido_id', 'criterio_id', 'equipo_id', name='uq_evaluacion_partido_criterio_equipo'),
    )
    
    def __repr__(self):
        return f"<EvaluacionPersonalizada(partido_id={self.partido_id}, criterio_id={self.criterio_id}, valor={self.valor})>"
