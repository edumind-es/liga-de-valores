#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""
Lógica de dominio de la evaluación personalizada: versión para control de
conflictos, comprobación de completitud, cálculo de puntos por umbrales de
criterio y construcción de la vista de criterios con valores.

Extraída del router de partidos para adelgazarlo y agrupar la lógica.
"""
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.criterio_evaluacion import CriterioEvaluacion
from app.models.evaluacion_personalizada import EvaluacionPersonalizada
from app.models.partido import Partido
from app.utils.versioning import stable_hash


def evaluacion_personalizada_version(evaluaciones: Iterable[EvaluacionPersonalizada]) -> str:
    """Hash estable de las evaluaciones para el control optimista de conflictos."""
    payload = [
        {"criterio_id": e.criterio_id, "equipo_id": e.equipo_id, "valor": e.valor}
        for e in evaluaciones
    ]
    payload.sort(key=lambda x: (x["criterio_id"], -1 if x["equipo_id"] is None else x["equipo_id"], x["valor"]))
    return stable_hash(payload)


def es_personalizada_completa(
    partido: Partido,
    criterios: Iterable[CriterioEvaluacion],
    evaluaciones: Iterable[EvaluacionPersonalizada],
) -> bool:
    """La evaluación está completa si cada criterio activo tiene su valor."""
    criterios_list = list(criterios)
    if not criterios_list:
        return True

    evals = list(evaluaciones)
    eval_pairs = {(e.criterio_id, e.equipo_id) for e in evals}

    for criterio in criterios_list:
        if criterio.categoria == 'grada_local':
            if (criterio.id, partido.equipo_local_id) not in eval_pairs:
                return False
        elif criterio.categoria == 'grada_visitante':
            if (criterio.id, partido.equipo_visitante_id) not in eval_pairs:
                return False
        else:
            if not any(e.criterio_id == criterio.id for e in evals):
                return False

    return True


def aplicar_puntos_personalizados(partido: Partido, datos_evaluacion) -> dict:
    """
    Reparte los puntos educativos según los umbrales de cada criterio y los
    escribe en los campos contenedor del partido. `datos_evaluacion` es una
    lista de (EvaluacionPersonalizada, CriterioEvaluacion). Devuelve el
    desglose de puntos calculados para local y visitante.
    """
    puntos_local = 0.0
    puntos_visitante = 0.0
    puntos_grada_local = 0.0
    puntos_grada_visitante = 0.0
    puntos_arbitro = 0.0

    id_local = partido.equipo_local_id
    id_visitante = partido.equipo_visitante_id

    for evaluacion, criterio in datos_evaluacion:
        puntos_obtenidos = 0.0
        if evaluacion.valor >= criterio.umbral_alto:
            puntos_obtenidos = criterio.puntos_alto
        elif evaluacion.valor >= criterio.umbral_medio:
            puntos_obtenidos = criterio.puntos_medio

        if criterio.categoria == 'grada_local':
            puntos_grada_local += puntos_obtenidos
            continue
        if criterio.categoria == 'grada_visitante':
            puntos_grada_visitante += puntos_obtenidos
            continue
        if criterio.categoria == 'arbitro':
            puntos_arbitro += puntos_obtenidos
            continue

        if evaluacion.equipo_id:
            if evaluacion.equipo_id == id_local:
                puntos_local += puntos_obtenidos
            elif evaluacion.equipo_id == id_visitante:
                puntos_visitante += puntos_obtenidos
        elif criterio.categoria in ('general', 'jugador'):
            puntos_local += puntos_obtenidos
            puntos_visitante += puntos_obtenidos

    # Reutiliza los campos contenedor de puntos educativos del modo clásico
    partido.puntos_juego_limpio_local = int(puntos_local)
    partido.puntos_juego_limpio_visitante = int(puntos_visitante)
    partido.puntos_grada_local = puntos_grada_local
    partido.puntos_grada_visitante = puntos_grada_visitante
    partido.puntos_arbitro = int(puntos_arbitro)

    return {"local": puntos_local, "visitante": puntos_visitante}


async def refresh_evaluacion_completa(partido: Partido, db: AsyncSession) -> bool:
    """Recalcula partido.evaluacion_completa según el modo de la liga."""
    # Import local para evitar ciclo (evaluacion_clasica no depende de este módulo)
    from app.services.evaluacion_clasica import es_evaluacion_clasica_completa

    if partido.liga.modo_evaluacion == 'personalizado':
        criterios_result = await db.execute(
            select(CriterioEvaluacion)
            .where(CriterioEvaluacion.liga_id == partido.liga_id)
            .where(CriterioEvaluacion.activo == True)
        )
        criterios = criterios_result.scalars().all()
        evaluaciones = partido.evaluaciones_personalizadas or []
        partido.evaluacion_completa = es_personalizada_completa(partido, criterios, evaluaciones)
    else:
        partido.evaluacion_completa = es_evaluacion_clasica_completa(partido)

    return partido.evaluacion_completa


async def build_criterios_con_valores(partido: Partido, db: AsyncSession):
    """Vista de los criterios de la liga con el valor asignado en este partido."""
    criterios_result = await db.execute(
        select(CriterioEvaluacion)
        .where(CriterioEvaluacion.liga_id == partido.liga_id)
        .where(CriterioEvaluacion.activo == True)
        .order_by(CriterioEvaluacion.orden)
    )
    criterios = criterios_result.scalars().all()

    evaluaciones_map = {
        (e.criterio_id, e.equipo_id): e.valor
        for e in partido.evaluaciones_personalizadas
    }

    criterios_con_valores = []
    for c in criterios:
        criterio_data = {
            "id": c.id,
            "nombre": c.nombre,
            "codigo": c.codigo,
            "categoria": c.categoria,
            "escala_min": c.escala_min,
            "escala_max": c.escala_max,
            "icono": c.icono,
            "valor": evaluaciones_map.get((c.id, None), None),
        }
        if c.categoria in ['grada_local', 'grada_visitante']:
            equipo_id = partido.equipo_local_id if c.categoria == 'grada_local' else partido.equipo_visitante_id
            criterio_data["valor"] = evaluaciones_map.get((c.id, equipo_id), None)
            criterio_data["equipo_id"] = equipo_id
        criterios_con_valores.append(criterio_data)

    return criterios_con_valores
