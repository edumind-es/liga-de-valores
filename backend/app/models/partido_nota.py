#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""
Modelo PartidoNota — Anotaciones de partido.

Privacy-by-design / LOPD/RGPD:
- Sin datos personales del alumno (sin nombre, IP ni identificador de sesión).
- Origen 'publico' = vía PIN de partido (anónimo).
- Moderación previa obligatoria: ninguna nota es visible sin aprobación docente.
- TTL: las rechazadas y las no aprobadas en 30 días se eliminan por tarea programada.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PartidoNota(Base):
    __tablename__ = "partido_notas"

    id = Column(Integer, primary_key=True, index=True)
    partido_id = Column(Integer, ForeignKey("partidos.id", ondelete="CASCADE"), nullable=False, index=True)

    # Contenido — texto libre sin datos personales, máx 500 caracteres validados en API
    contenido = Column(Text, nullable=False)

    # Tipo pedagógico de la anotación
    tipo = Column(String(20), nullable=False, default="observacion")  # observacion | incidencia | evidencia

    # Origen: anónimo vía PIN de partido o introducido directamente por el docente
    origen = Column(String(10), nullable=False, default="publico")  # publico | docente

    # Estado de moderación (la nota no es visible hasta que el docente la aprueba)
    estado = Column(String(15), nullable=False, default="pendiente", index=True)  # pendiente | aprobada | rechazada

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    aprobada_at = Column(DateTime(timezone=True), nullable=True)

    partido = relationship("Partido", back_populates="notas")

    __table_args__ = (
        Index("ix_partido_notas_partido_estado", "partido_id", "estado"),
    )
