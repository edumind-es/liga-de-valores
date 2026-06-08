#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class EquipoBasico(BaseModel):
    id: int
    nombre: str
    logo_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CruceFaseResponse(BaseModel):
    id: int
    fase_id: int
    equipo_a: EquipoBasico
    equipo_b: EquipoBasico
    orden: int
    ganador_id: Optional[int] = None
    estado: str
    created_at: datetime
    partidos_ids: List[int] = []

    model_config = {"from_attributes": True}


class FaseFinalResponse(BaseModel):
    id: int
    liga_id: int
    nombre: str
    num_partidos_por_cruce: int
    asignar_roles_auto: bool
    estado: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    cruces: List[CruceFaseResponse] = []

    model_config = {"from_attributes": True}


class FaseFinalCreate(BaseModel):
    nombre: str = "Fase Final"
    num_partidos_por_cruce: int = 1
    asignar_roles_auto: bool = True


class GenerarCrucesPayload(BaseModel):
    top_n: int = 4
    tipo_deporte_ids: Optional[List[int]] = None


class ResolverCrucePayload(BaseModel):
    ganador_id: int
