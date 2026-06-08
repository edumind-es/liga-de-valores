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
API de Taxonomías Pedagógicas para Wiki de Juegos.
Endpoints para listar y filtrar taxonomías disponibles.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models.taxonomia_pedagogica import TaxonomiaPedagogica, CategoriasTaxonomia

router = APIRouter()


@router.get("/")
async def list_all_taxonomies(db: AsyncSession = Depends(get_db)):
    """
    Lista todas las taxonomías agrupadas por categoría.
    Útil para poblar selectores en el frontend.
    """
    result = await db.execute(
        select(TaxonomiaPedagogica).order_by(
            TaxonomiaPedagogica.categoria,
            TaxonomiaPedagogica.orden
        )
    )
    taxonomias = result.scalars().all()
    
    # Agrupar por categoría
    grouped = {}
    for t in taxonomias:
        if t.categoria not in grouped:
            grouped[t.categoria] = {
                "categoria": t.categoria,
                "nombre": CategoriasTaxonomia.NOMBRES.get(t.categoria, t.categoria),
                "opciones": []
            }
        grouped[t.categoria]["opciones"].append({
            "id": t.id,
            "codigo": t.codigo,
            "nombre": t.nombre,
            "descripcion": t.descripcion,
            "cluster": t.cluster
        })
    
    return list(grouped.values())


@router.get("/categoria/{categoria}")
async def list_by_category(
    categoria: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista taxonomías de una categoría específica.
    Categorías: famose, sanchez_banuelos, mosston, nivel_iniciacion
    """
    result = await db.execute(
        select(TaxonomiaPedagogica)
        .where(TaxonomiaPedagogica.categoria == categoria)
        .order_by(TaxonomiaPedagogica.orden)
    )
    taxonomias = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "codigo": t.codigo,
            "nombre": t.nombre,
            "descripcion": t.descripcion,
            "cluster": t.cluster
        }
        for t in taxonomias
    ]


@router.get("/categorias")
async def list_categories():
    """
    Lista las categorías de taxonomía disponibles.
    """
    return [
        {"codigo": cat, "nombre": CategoriasTaxonomia.NOMBRES.get(cat, cat)}
        for cat in CategoriasTaxonomia.ALL
    ]
