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
Modelo de Taxonomías Pedagógicas para clasificación de fichas de juegos.

Taxonomías soportadas:
- Tipo de Tarea (Famose)
- Estrategia en la Práctica (Sánchez Bañuelos)
- Estilo de Enseñanza (Mosston & Ashworth)
- Nivel de Iniciación Deportiva
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class TaxonomiaPedagogica(Base):
    """Taxonomías pedagógicas para clasificar fichas de juegos."""
    __tablename__ = "taxonomias_pedagogicas"
    
    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String(50), nullable=False, index=True)  # famose, sanchez_banuelos, mosston, nivel_iniciacion
    codigo = Column(String(50), nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    orden = Column(Integer, default=0)  # Para ordenar en UI
    cluster = Column(String(50), nullable=True)  # Para agrupar (ej: Mosston reproducción/producción)
    
    # Relación con fichas
    game_submissions = relationship(
        "GameSubmission",
        secondary="game_submission_taxonomias",
        back_populates="taxonomias"
    )
    
    __table_args__ = (
        UniqueConstraint('categoria', 'codigo', name='uq_taxonomia_categoria_codigo'),
    )
    
    def __repr__(self):
        return f"<TaxonomiaPedagogica {self.categoria}:{self.codigo}>"


class GameSubmissionTaxonomia(Base):
    """Tabla de relación entre fichas de juego y taxonomías."""
    __tablename__ = "game_submission_taxonomias"
    
    id = Column(Integer, primary_key=True, index=True)
    game_submission_id = Column(
        Integer, 
        ForeignKey("game_submissions.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    taxonomia_id = Column(
        Integer, 
        ForeignKey("taxonomias_pedagogicas.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    __table_args__ = (
        UniqueConstraint('game_submission_id', 'taxonomia_id', name='uq_game_taxonomia'),
    )


# Constantes para las categorías
class CategoriasTaxonomia:
    FAMOSE = "famose"
    SANCHEZ_BANUELOS = "sanchez_banuelos"
    MOSSTON = "mosston"
    NIVEL_INICIACION = "nivel_iniciacion"
    
    ALL = [FAMOSE, SANCHEZ_BANUELOS, MOSSTON, NIVEL_INICIACION]
    
    NOMBRES = {
        FAMOSE: "Tipo de Tarea (Famose)",
        SANCHEZ_BANUELOS: "Estrategia en Práctica (Sánchez Bañuelos)",
        MOSSTON: "Estilo de Enseñanza (Mosston & Ashworth)",
        NIVEL_INICIACION: "Nivel de Iniciación Deportiva"
    }
