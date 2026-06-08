#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
Modelo GameSubmission - Fichas de juego estructuradas para Wiki de Juegos.
Almacena datos anónimos pendientes de validación docente.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class GameSubmission(Base):
    """Ficha de juego estructurada. Almacena datos anónimos pendientes de validación."""
    __tablename__ = "game_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificación única para enlace de activación (Hash / Token)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    
    # Metadatos básicos
    title = Column(String(100), nullable=False)
    sport_id = Column(Integer, ForeignKey("tipos_deporte.id"), nullable=True)
    liga_id = Column(Integer, ForeignKey("ligas.id"), nullable=True)  # Para saber origen
    
    # ═══════════════════════════════════════════════════════════════════
    # CONTENIDO ESTRUCTURADO (ANÓNIMO - sin datos del alumno)
    # ═══════════════════════════════════════════════════════════════════
    materiales = Column(Text, nullable=True)
    reglas = Column(Text, nullable=True)
    
    # Representación gráfica (ruta a imagen PNG/WebP guardada en servidor)
    representacion_grafica = Column(String(255), nullable=True)
    
    # Pictogramas ARASAAC (almacenamos IDs para regenerar URLs)
    pictogramas_materiales = Column(JSON, nullable=True)  # Lista de IDs: [12345, 67890]
    pictogramas_reglas = Column(JSON, nullable=True)      # Lista de IDs
    
    # ═══════════════════════════════════════════════════════════════════
    # ATRIBUCIÓN DOCENTE (opcional, el docente decide al publicar)
    # ═══════════════════════════════════════════════════════════════════
    docente_nombre = Column(String(100), nullable=True)   # Nombre público si consiente
    docente_email = Column(String(255), nullable=True)    # Para avisos, NO se muestra
    
    # ═══════════════════════════════════════════════════════════════════
    # ESTADO Y GESTIÓN
    # ═══════════════════════════════════════════════════════════════════
    # Evidencia de aceptación legal en el envío público
    policy_notice_version = Column(String(32), nullable=True)
    policy_notice_accepted = Column(Boolean, default=False, nullable=False)
    community_guidelines_accepted = Column(Boolean, default=False, nullable=False)

    # Moderación preventiva (privacy-first: sin IP ni geolocalización explícita)
    moderation_required = Column(Boolean, default=False, nullable=False, index=True)
    moderation_flags = Column(JSON, nullable=True)
    content_fingerprint = Column(String(64), nullable=True, index=True)

    is_public = Column(Boolean, default=False, nullable=False, index=True)
    file_path = Column(String(255), nullable=True)  # Ahora opcional (legacy/backup)
    
    # Registro de entrega por email al docente
    email_enviado = Column(Boolean, default=False, nullable=False, index=True)
    email_error = Column(String(500), nullable=True)  # Último error SMTP si falló

    # Limpieza automática
    aviso_enviado = Column(Boolean, default=False, nullable=False)
    fecha_aviso = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)  # Cuando docente activa
    
    # Relaciones
    sport = relationship("TipoDeporte", backref="fichas_juego", lazy="joined")
    liga = relationship("Liga", backref="fichas_juego", lazy="joined")
    
    # Taxonomías pedagógicas (relación muchos-a-muchos)
    taxonomias = relationship(
        "TaxonomiaPedagogica",
        secondary="game_submission_taxonomias",
        back_populates="game_submissions",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<GameSubmission(id={self.id}, title='{self.title}', public={self.is_public})>"
    
    @property
    def dias_pendiente(self):
        """Calcula los días desde la creación sin publicar."""
        if self.is_public:
            return 0
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        delta = now - self.created_at.replace(tzinfo=timezone.utc)
        return delta.days
