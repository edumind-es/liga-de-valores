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
Pydantic schemas for CriterioEvaluacion and EvaluacionPersonalizada.
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal


# === Criterio Evaluación Schemas ===

class CriterioEvaluacionBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=50, description="Nombre del criterio (ej: Respeto al Material)")
    codigo: str = Field(..., min_length=1, max_length=30, description="Código interno (ej: respeto_material)")
    descripcion: str | None = Field(None, description="Descripción explicativa para docentes")
    categoria: Literal['arbitro', 'grada_local', 'grada_visitante', 'jugador', 'general'] = Field(
        default='general',
        description="Categoría del criterio para agrupación visual"
    )
    escala_min: int = Field(default=0, ge=0, le=100, description="Valor mínimo de la escala")
    escala_max: int = Field(default=10, ge=1, le=100, description="Valor máximo de la escala")
    umbral_alto: float = Field(default=7.0, ge=0, description="Umbral para puntuación alta")
    umbral_medio: float = Field(default=4.0, ge=0, description="Umbral para puntuación media")
    puntos_alto: float = Field(default=1.0, ge=0, description="Puntos otorgados si supera umbral alto")
    puntos_medio: float = Field(default=0.5, ge=0, description="Puntos otorgados si supera umbral medio")
    orden: int = Field(default=0, ge=0, description="Orden de visualización")
    activo: bool = Field(default=True, description="Si el criterio está activo")
    icono: str | None = Field(None, max_length=10, description="Emoji opcional para UI")

    @field_validator('escala_max')
    @classmethod
    def validate_escala_max(cls, v, info):
        escala_min = info.data.get('escala_min', 0)
        if v <= escala_min:
            raise ValueError('escala_max debe ser mayor que escala_min')
        return v

    @field_validator('umbral_medio')
    @classmethod
    def validate_umbral_medio(cls, v, info):
        umbral_alto = info.data.get('umbral_alto', 7.0)
        if v > umbral_alto:
            raise ValueError('umbral_medio debe ser menor o igual a umbral_alto')
        return v


class CriterioEvaluacionCreate(CriterioEvaluacionBase):
    """Schema para crear un criterio"""
    pass


class CriterioEvaluacionUpdate(BaseModel):
    """Schema para actualizar un criterio (todos los campos opcionales)"""
    nombre: str | None = Field(None, min_length=1, max_length=50)
    codigo: str | None = Field(None, min_length=1, max_length=30)
    descripcion: str | None = None
    categoria: Literal['arbitro', 'grada_local', 'grada_visitante', 'jugador', 'general'] | None = None
    escala_min: int | None = Field(None, ge=0, le=100)
    escala_max: int | None = Field(None, ge=1, le=100)
    umbral_alto: float | None = Field(None, ge=0)
    umbral_medio: float | None = Field(None, ge=0)
    puntos_alto: float | None = Field(None, ge=0)
    puntos_medio: float | None = Field(None, ge=0)
    orden: int | None = Field(None, ge=0)
    activo: bool | None = None
    icono: str | None = None


class CriterioEvaluacionResponse(CriterioEvaluacionBase):
    """Schema de respuesta con ID y timestamps"""
    id: int
    liga_id: int
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# === Evaluación Personalizada Schemas ===

class EvaluacionPersonalizadaBase(BaseModel):
    criterio_id: int = Field(..., description="ID del criterio a evaluar")
    equipo_id: int | None = Field(None, description="ID del equipo (para criterios de grada)")
    valor: int = Field(..., ge=0, description="Valor de la evaluación")


class EvaluacionPersonalizadaCreate(EvaluacionPersonalizadaBase):
    """Schema para crear una evaluación"""
    pass


class EvaluacionPersonalizadaUpdate(BaseModel):
    """Schema para actualizar una evaluación"""
    valor: int = Field(..., ge=0, description="Nuevo valor de la evaluación")


class EvaluacionPersonalizadaResponse(EvaluacionPersonalizadaBase):
    """Schema de respuesta con ID y timestamps"""
    id: int
    partido_id: int
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class EvaluacionPersonalizadaBulkInput(BaseModel):
    """Schema para actualizar múltiples evaluaciones a la vez"""
    evaluaciones: list[EvaluacionPersonalizadaCreate] = Field(
        ..., 
        max_length=20,
        description="Lista de evaluaciones (máximo 20)"
    )


# === Plantillas predefinidas ===

class PlantillaCriterio(BaseModel):
    """Una plantilla de criterio predefinida"""
    nombre: str
    codigo: str
    descripcion: str | None = None
    categoria: str
    escala_min: int = 0
    escala_max: int = 10
    icono: str | None = None


class PlantillaEvaluacion(BaseModel):
    """Plantilla de conjunto de criterios predefinidos"""
    nombre: str
    descripcion: str
    criterios: list[PlantillaCriterio]


# Plantillas disponibles
PLANTILLAS_EVALUACION: list[PlantillaEvaluacion] = [
    PlantillaEvaluacion(
        nombre="EDUmind Clásico",
        descripcion="Los mismos criterios del sistema clásico pero configurables",
        criterios=[
            PlantillaCriterio(nombre="Conocimiento", codigo="conocimiento", categoria="arbitro", icono="📚"),
            PlantillaCriterio(nombre="Gestión", codigo="gestion", categoria="arbitro", icono="⚙️"),
            PlantillaCriterio(nombre="Apoyo Educativo", codigo="apoyo", categoria="arbitro", icono="🤝"),
            PlantillaCriterio(nombre="Animación Local", codigo="animacion_local", categoria="grada_local", escala_max=4, icono="📣"),
            PlantillaCriterio(nombre="Respeto Local", codigo="respeto_local", categoria="grada_local", escala_max=4, icono="🙏"),
            PlantillaCriterio(nombre="Participación Local", codigo="participacion_local", categoria="grada_local", escala_max=4, icono="👥"),
            PlantillaCriterio(nombre="Animación Visitante", codigo="animacion_visitante", categoria="grada_visitante", escala_max=4, icono="📣"),
            PlantillaCriterio(nombre="Respeto Visitante", codigo="respeto_visitante", categoria="grada_visitante", escala_max=4, icono="🙏"),
            PlantillaCriterio(nombre="Participación Visitante", codigo="participacion_visitante", categoria="grada_visitante", escala_max=4, icono="👥"),
        ]
    ),
    PlantillaEvaluacion(
        nombre="Respeto Ampliado",
        descripcion="Enfocado en diferentes dimensiones del respeto",
        criterios=[
            PlantillaCriterio(nombre="Respeto al Árbitro", codigo="respeto_arbitro", categoria="general", icono="👨‍⚖️"),
            PlantillaCriterio(nombre="Respeto a Rivales", codigo="respeto_rivales", categoria="general", icono="🤝"),
            PlantillaCriterio(nombre="Respeto al Material", codigo="respeto_material", categoria="general", icono="🏀"),
            PlantillaCriterio(nombre="Respeto a las Gradas", codigo="respeto_gradas", categoria="general", icono="👥"),
            PlantillaCriterio(nombre="Respeto a las Normas", codigo="respeto_normas", categoria="general", icono="📋"),
        ]
    ),
    PlantillaEvaluacion(
        nombre="Competencias Sociales",
        descripcion="Evaluación de habilidades socioemocionales",
        criterios=[
            PlantillaCriterio(nombre="Comunicación", codigo="comunicacion", categoria="general", icono="💬"),
            PlantillaCriterio(nombre="Trabajo en Equipo", codigo="trabajo_equipo", categoria="general", icono="🤝"),
            PlantillaCriterio(nombre="Liderazgo", codigo="liderazgo", categoria="general", icono="⭐"),
            PlantillaCriterio(nombre="Empatía", codigo="empatia", categoria="general", icono="❤️"),
            PlantillaCriterio(nombre="Resolución de Conflictos", codigo="conflictos", categoria="general", icono="🕊️"),
        ]
    ),
    PlantillaEvaluacion(
        nombre="Mini-Deportes",
        descripcion="Criterios simplificados para edades tempranas",
        criterios=[
            PlantillaCriterio(nombre="Juego Limpio", codigo="fair_play", categoria="general", escala_max=5, icono="✨"),
            PlantillaCriterio(nombre="Esfuerzo", codigo="esfuerzo", categoria="general", escala_max=5, icono="💪"),
            PlantillaCriterio(nombre="Deportividad", codigo="deportividad", categoria="general", escala_max=5, icono="🏆"),
        ]
    ),
]
