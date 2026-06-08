#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later

"""
Modelo AuditLog — registro de operaciones destructivas para trazabilidad RGPD.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class AuditLog(Base):
    """Registro inmutable de operaciones sensibles realizadas por usuarios."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)

    # Quién lo hizo (nullable por si es un proceso interno)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Qué acción: "delete_liga", "delete_jornada", "delete_partido",
    #             "approve_submission", "reject_submission", "finalizar_partido"
    action = Column(String(60), nullable=False, index=True)

    # Sobre qué recurso
    resource = Column(String(50), nullable=False)   # "liga", "partido", "jornada", ...
    resource_id = Column(Integer, nullable=True)    # id del objeto afectado
    resource_name = Column(String(255), nullable=True)  # nombre legible

    # IP del cliente (para RGPD)
    ip_address = Column(String(45), nullable=True)

    # Datos adicionales de contexto (JSON libre)
    details = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', resource='{self.resource}/{self.resource_id}')>"
