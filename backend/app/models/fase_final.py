#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class FaseFinal(Base):
    __tablename__ = "fases_finales"

    id = Column(Integer, primary_key=True, index=True)
    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(120), nullable=False, default="Fase Final")
    num_partidos_por_cruce = Column(Integer, nullable=False, default=1)
    asignar_roles_auto = Column(Boolean, nullable=False, default=True)
    # estado: 'borrador' | 'activa' | 'finalizada'
    estado = Column(String(20), nullable=False, default="borrador")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True)

    liga = relationship("Liga", back_populates="fases_finales")
    cruces = relationship("CruceFase", back_populates="fase", cascade="all, delete-orphan", order_by="CruceFase.orden")


class CruceFase(Base):
    __tablename__ = "cruces_fase"

    id = Column(Integer, primary_key=True, index=True)
    fase_id = Column(Integer, ForeignKey("fases_finales.id", ondelete="CASCADE"), nullable=False, index=True)
    equipo_a_id = Column(Integer, ForeignKey("equipos.id", ondelete="CASCADE"), nullable=False)
    equipo_b_id = Column(Integer, ForeignKey("equipos.id", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    ganador_id = Column(Integer, ForeignKey("equipos.id", ondelete="SET NULL"), nullable=True)
    # estado: 'pendiente' | 'en_curso' | 'finalizado'
    estado = Column(String(20), nullable=False, default="pendiente")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    fase = relationship("FaseFinal", back_populates="cruces")
    equipo_a = relationship("Equipo", foreign_keys=[equipo_a_id])
    equipo_b = relationship("Equipo", foreign_keys=[equipo_b_id])
    ganador = relationship("Equipo", foreign_keys=[ganador_id])
    partidos = relationship("Partido", back_populates="cruce", order_by="Partido.id")
