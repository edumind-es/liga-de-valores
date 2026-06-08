#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# Modelo PendingAction - Gestiones pendientes de aprobación docente
#

"""
Modelo PendingAction - Acciones pendientes de validación.
Tipos: logo, match_data, contract, game_submission
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ActionType(str, enum.Enum):
    LOGO = "logo"
    MATCH_DATA = "match_data"
    CONTRACT = "contract"
    GAME_SUBMISSION = "game_submission"


class ActionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PendingAction(Base):
    """Acción pendiente de aprobación docente."""
    __tablename__ = "pending_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Tipo de acción
    action_type = Column(String(50), nullable=False, index=True)
    
    # Estado
    status = Column(String(20), default="pending", nullable=False, index=True)
    
    # Quién lo solicitó (puede ser null si es anónimo como equipos)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Liga asociada (para filtrar por docente)
    liga_id = Column(Integer, ForeignKey("ligas.id"), nullable=False, index=True)
    
    # ID del objeto destino (equipo_id, partido_id, etc.)
    target_id = Column(Integer, nullable=False)
    
    # Datos de la solicitud en JSON (logo dataUrl, datos de partido, etc.)
    data_json = Column(JSON, nullable=True)
    
    # Descripción legible
    description = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Revisor
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    
    # Relaciones
    liga = relationship("Liga")
    requester = relationship("User", foreign_keys=[requester_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    
    def __repr__(self):
        return f"<PendingAction(id={self.id}, type='{self.action_type}', status='{self.status}')>"
