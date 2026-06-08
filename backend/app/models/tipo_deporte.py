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
Modelo TipoDeporte - Catálogo de deportes escolares.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class TipoDeporte(Base):
    """Catálogo de tipos de deportes para partidos."""
    __tablename__ = "tipos_deporte"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)  # "Fútbol", "Bádminton"
    codigo = Column(String(20), unique=True, nullable=False, index=True)  # "futbol", "badminton"
    
    # Configuración del marcador
    tipo_marcador = Column(String(20), nullable=False)  # "goles", "sets", "puntos", "tries"
    permite_empate = Column(Boolean, default=True, nullable=False)
    
    # Metadata adicional (JSON)
    config = Column(JSON, nullable=True)
    """
    Ejemplos de config:
    - Fútbol: {"tiempo_regulacion": 40, "prórroga": false}
    - Bádminton: {"sets_para_ganar": 2, "puntos_por_set": 21}
    - Rugby: {"valor_try": 5, "valor_conversion": 2}
    """
    
    # Información adicional
    descripcion = Column(Text, nullable=True)
    icono = Column(String(50), nullable=True)  # emoji o código de icono
    
    # Categoría del deporte para Wiki de Juegos
    # Valores: "alternativo", "popular", "tradicional", "convencional"
    categoria = Column(String(30), nullable=True, index=True)
    
    # Archivos asociados
    vt_file = Column(String(255), nullable=True)   # Ruta al PDF de Visual Thinking
    logo_file = Column(String(255), nullable=True) # Ruta al Logo del deporte
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<TipoDeporte(id={self.id}, nombre='{self.nombre}', tipo_marcador='{self.tipo_marcador}')>"
