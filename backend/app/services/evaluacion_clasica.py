#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""
Lógica de la evaluación educativa clásica (juego limpio, árbitro, grada).

Única fuente de verdad del cálculo de medias y puntos: la usan
PUT /partidos/{id}/evaluacion, PUT /partidos/{id}/acta y la aprobación
de acciones pendientes (resultados enviados por el alumnado). Antes
había tres copias divergiendo.
"""
from app.models.partido import Partido


def aplicar_evaluacion_clasica(partido: Partido, update_data: dict) -> None:
    """
    Aplica los campos de la evaluación clásica y recalcula medias y puntos
    (árbitro y gradas) de los grupos presentes en update_data.
    Requiere partido.liga cargada (usa liga.config para los puntos).
    """
    for key, value in update_data.items():
        setattr(partido, key, value)

    # Calcular media árbitro si aplica
    if any(k in update_data for k in ['arbitro_conocimiento', 'arbitro_gestion', 'arbitro_apoyo']):
        vals = [
            partido.arbitro_conocimiento,
            partido.arbitro_gestion,
            partido.arbitro_apoyo
        ]
        valid_vals = [v for v in vals if v is not None]

        if valid_vals:
            partido.arbitro_media = sum(valid_vals) / len(valid_vals)
            # Sistema de puntuación: +2 puntos si logra evaluación positiva (>= 5)
            # Configurable via liga.config
            config = partido.liga.config or {}
            arbitro_points = config.get("arbitro_points", 2)
            partido.puntos_arbitro = arbitro_points if partido.arbitro_media >= 5 else 0

    # Calcular media grada local
    if any(k in update_data for k in ['grada_animar_local', 'grada_respeto_local', 'grada_participacion_local']):
        vals = [
            partido.grada_animar_local,
            partido.grada_respeto_local,
            partido.grada_participacion_local
        ]
        valid_vals = [v for v in vals if v is not None]
        if valid_vals:
            media_local = sum(valid_vals) / len(valid_vals)
            # Sistema de puntuación normalizado (escala 0-4):
            # >75% (>3) → 1 punto | 50-75% (2-3) → 0.5 puntos | <50% (<2) → 0 puntos
            config = partido.liga.config or {}
            grada_max = config.get("grada_max_points", 1)
            grada_mid = config.get("grada_mid_points", 0.5)

            if media_local > 3:
                partido.puntos_grada_local = grada_max
            elif media_local >= 2:
                partido.puntos_grada_local = grada_mid
            else:
                partido.puntos_grada_local = 0

    # Calcular media grada visitante
    if any(k in update_data for k in ['grada_animar_visitante', 'grada_respeto_visitante', 'grada_participacion_visitante']):
        vals = [
            partido.grada_animar_visitante,
            partido.grada_respeto_visitante,
            partido.grada_participacion_visitante
        ]
        valid_vals = [v for v in vals if v is not None]
        if valid_vals:
            media_visitante = sum(valid_vals) / len(valid_vals)
            # Sistema de puntuación normalizado (escala 0-4):
            # >75% (>3) → 1 punto | 50-75% (2-3) → 0.5 puntos | <50% (<2) → 0 puntos
            config = partido.liga.config or {}
            grada_max = config.get("grada_max_points", 1)
            grada_mid = config.get("grada_mid_points", 0.5)

            if media_visitante > 3:
                partido.puntos_grada_visitante = grada_max
            elif media_visitante >= 2:
                partido.puntos_grada_visitante = grada_mid
            else:
                partido.puntos_grada_visitante = 0


def es_evaluacion_clasica_completa(partido: Partido) -> bool:
    """La evaluación clásica está completa si cada rol asignado tiene sus notas."""
    if partido.puntos_juego_limpio_local is None or partido.puntos_juego_limpio_visitante is None:
        return False

    if partido.arbitro_id:
        if any(
            value is None
            for value in (
                partido.arbitro_conocimiento,
                partido.arbitro_gestion,
                partido.arbitro_apoyo,
            )
        ):
            return False

    if partido.tutor_grada_local_id:
        if any(
            value is None
            for value in (
                partido.grada_animar_local,
                partido.grada_respeto_local,
                partido.grada_participacion_local,
            )
        ):
            return False

    if partido.tutor_grada_visitante_id:
        if any(
            value is None
            for value in (
                partido.grada_animar_visitante,
                partido.grada_respeto_visitante,
                partido.grada_participacion_visitante,
            )
        ):
            return False

    return True
