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
Modelo Partido - Partid multi-deporte con marcador flexible.
"""
from typing import Tuple
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.versioning import stable_hash

class Partido(Base):
    """Partido entre dos equipos (multi-deporte)."""
    __tablename__ = "partidos"
    
    id = Column(Integer, primary_key=True, index=True)
    liga_id = Column(Integer, ForeignKey("ligas.id"), nullable=False, index=True)
    jornada_id = Column(Integer, ForeignKey("jornadas.id"), nullable=True, index=True)
    tipo_deporte_id = Column(Integer, ForeignKey("tipos_deporte.id"), nullable=False)
    
    # Equipos participantes
    equipo_local_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, index=True)
    equipo_visitante_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, index=True)
    
    # Roles especiales
    arbitro_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    tutor_grada_local_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    tutor_grada_visitante_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    
    # Marcador específico del deporte (JSON flexible)
    marcador = Column(JSON, nullable=False, server_default='{}')
    
    # Puntuación unificada (Sistema EDUmind 3-2-1: todos suman)
    puntos_local = Column(Integer, default=0)  # 3 victoria, 2 empate, 1 derrota
    puntos_visitante = Column(Integer, default=0)
    resultado = Column(String(10), nullable=True)  # "V", "E", "D"
    
    # Estado
    finalizado = Column(Boolean, default=False, nullable=False)
    evaluacion_completa = Column(Boolean, default=False, nullable=False)
    fecha_hora = Column(DateTime(timezone=True), nullable=True)
    
    # Valores educativos
    puntos_juego_limpio_local = Column(Integer, default=0)
    puntos_juego_limpio_visitante = Column(Integer, default=0)
    puntos_arbitro = Column(Integer, default=0)
    puntos_grada_local = Column(Float, default=0.0)  # Soporta 0, 0.5, 1
    puntos_grada_visitante = Column(Float, default=0.0)  # Soporta 0, 0.5, 1
    
    # Evaluación arbitraje (0-10)
    arbitro_conocimiento = Column(Integer, nullable=True)
    arbitro_gestion = Column(Integer, nullable=True)
    arbitro_apoyo = Column(Integer, nullable=True)
    arbitro_media = Column(Float, nullable=True)
    
    # Evaluación grada (0-10)
    grada_animar_local = Column(Integer, nullable=True)
    grada_respeto_local = Column(Integer, nullable=True)
    grada_participacion_local = Column(Integer, nullable=True)
    grada_animar_visitante = Column(Integer, nullable=True)
    grada_respeto_visitante = Column(Integer, nullable=True)
    grada_participacion_visitante = Column(Integer, nullable=True)
    
    # PIN de acceso público
    pin = Column(String(6), nullable=True, index=True)
    pin_valid_from = Column(DateTime(timezone=True), nullable=True)
    pin_valid_until = Column(DateTime(timezone=True), nullable=True)

    # Fase final: cruce al que pertenece este partido (nullable = partido de liga regular)
    cruce_id = Column(Integer, ForeignKey("cruces_fase.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    liga = relationship("Liga", back_populates="partidos")
    jornada = relationship("Jornada", back_populates="partidos")
    tipo_deporte = relationship("TipoDeporte")
    equipo_local = relationship("Equipo", foreign_keys=[equipo_local_id])
    equipo_visitante = relationship("Equipo", foreign_keys=[equipo_visitante_id])
    arbitro = relationship("Equipo", foreign_keys=[arbitro_id])
    tutor_grada_local = relationship("Equipo", foreign_keys=[tutor_grada_local_id])
    tutor_grada_visitante = relationship("Equipo", foreign_keys=[tutor_grada_visitante_id])
    evaluaciones_personalizadas = relationship("EvaluacionPersonalizada", back_populates="partido", cascade="all, delete-orphan")
    cruce = relationship("CruceFase", back_populates="partidos", foreign_keys=[cruce_id])
    notas = relationship("PartidoNota", back_populates="partido", cascade="all, delete-orphan", order_by="PartidoNota.created_at")

    @staticmethod
    def _safe_number(value) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    def _get_try_values(self) -> Tuple[int, int]:
        config = self.tipo_deporte.config or {} if self.tipo_deporte else {}
        raw_try = config.get("valor_try", config.get("puntos_por_try", 5))
        raw_conv = config.get("valor_conversion", config.get("puntos_por_conversion", 2))
        valor_try = self._safe_number(raw_try)
        valor_conv = self._safe_number(raw_conv)
        if valor_try <= 0:
            valor_try = 5
        if valor_conv < 0:
            valor_conv = 2
        return valor_try, valor_conv

    def extraer_marcador_deportivo(self) -> Tuple[int, int]:
        """
        Extrae el marcador real (resultado deportivo) según el tipo de deporte.
        """
        if not self.marcador or not self.tipo_deporte:
            return 0, 0

        tipo = self.tipo_deporte.tipo_marcador

        if tipo == "goles":
            local = self._safe_number(self.marcador.get("goles_local", 0))
            visitante = self._safe_number(self.marcador.get("goles_visitante", 0))
        elif tipo == "sets":
            local = self._safe_number(self.marcador.get("sets_local", 0))
            visitante = self._safe_number(self.marcador.get("sets_visitante", 0))
        elif tipo == "puntos":
            local = self._safe_number(self.marcador.get("puntos_local", 0))
            visitante = self._safe_number(self.marcador.get("puntos_visitante", 0))
        elif tipo == "tries":
            valor_try, valor_conv = self._get_try_values()
            local = (self._safe_number(self.marcador.get("tries_local", 0)) * valor_try) + (
                self._safe_number(self.marcador.get("conversiones_local", 0)) * valor_conv
            )
            visitante = (self._safe_number(self.marcador.get("tries_visitante", 0)) * valor_try) + (
                self._safe_number(self.marcador.get("conversiones_visitante", 0)) * valor_conv
            )
        elif tipo == "carreras":
            local = self._safe_number(self.marcador.get("carreras_local", 0))
            visitante = self._safe_number(self.marcador.get("carreras_visitante", 0))
        elif tipo == "towertouchball":
            local = self._safe_number(self.marcador.get("puntos_local", 0))
            visitante = self._safe_number(self.marcador.get("puntos_visitante", 0))
        else:
            local = self._safe_number(self.marcador.get("local", 0))
            visitante = self._safe_number(self.marcador.get("visitante", 0))

        return local, visitante

    @property
    def marcador_local(self) -> int:
        """
        Marcador deportivo normalizado (equipo local).
        """
        local, _ = self.extraer_marcador_deportivo()
        return local

    @property
    def marcador_visitante(self) -> int:
        """
        Marcador deportivo normalizado (equipo visitante).
        """
        _, visitante = self.extraer_marcador_deportivo()
        return visitante

    @property
    def marcador_version(self) -> str:
        """
        Versión del marcador para control de conflictos.
        """
        return stable_hash(self.marcador or {})

    @property
    def evaluacion_version(self) -> str:
        """
        Versión de la evaluación educativa para control de conflictos.
        """
        data = {
            "puntos_juego_limpio_local": self.puntos_juego_limpio_local,
            "puntos_juego_limpio_visitante": self.puntos_juego_limpio_visitante,
            "arbitro_conocimiento": self.arbitro_conocimiento,
            "arbitro_gestion": self.arbitro_gestion,
            "arbitro_apoyo": self.arbitro_apoyo,
            "grada_animar_local": self.grada_animar_local,
            "grada_respeto_local": self.grada_respeto_local,
            "grada_participacion_local": self.grada_participacion_local,
            "grada_animar_visitante": self.grada_animar_visitante,
            "grada_respeto_visitante": self.grada_respeto_visitante,
            "grada_participacion_visitante": self.grada_participacion_visitante,
        }
        return stable_hash(data)
    
    def calcular_puntos_desde_marcador(self):
        """
        Convierte marcador del deporte a puntos unificados.
        Sistema EDUmind: +3 victoria, +2 empate, +1 derrota.
        """
        if not self.marcador or not self.tipo_deporte:
            return
        
        local, visitante = self.extraer_marcador_deportivo()
        
        # Sistema configurable (defecto EDUmind: 3-2-1)
        win_points = 3
        draw_points = 2
        loss_points = 1
        
        # Intentar leer configuración de la liga
        if self.liga and self.liga.config:
            win_points = self.liga.config.get("win_points", 3)
            draw_points = self.liga.config.get("draw_points", 2)
            loss_points = self.liga.config.get("loss_points", 1)

        if local > visitante:
            self.puntos_local = win_points
            self.puntos_visitante = loss_points
            self.resultado = "V"
        elif local < visitante:
            self.puntos_local = loss_points
            self.puntos_visitante = win_points
            self.resultado = "D"
        else:
            self.puntos_local = draw_points
            self.puntos_visitante = draw_points
            self.resultado = "E"
    
    def __repr__(self):
        return f"<Partido(id={self.id}, local_id={self.equipo_local_id}, visitante_id={self.equipo_visitante_id}, resultado='{self.resultado}')>"
