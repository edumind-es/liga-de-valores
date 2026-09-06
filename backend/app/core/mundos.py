#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""
Los Cinco Mundos EDUfis como taxonomía de dominio.

Hasta ahora los mundos eran solo identidad visual; este módulo los convierte
en modelo de datos: cada criterio de evaluación puede etiquetarse con un
mundo, y la clasificación agrega los puntos educativos por mundo.

El mapeo del modo clásico es la ÚNICA fuente de verdad pedagógica y está
pensado para ajustarse desde aquí sin tocar el resto del código.
"""

# Los cinco mundos, en el orden canónico del pentágono
MUNDOS = ("fisico", "mental", "emocional", "social", "interior")

# Mapeo pedagógico por defecto de las dimensiones del modo clásico:
#   - puntos deportivos  → físico   (práctica físico-motriz)
#   - árbitro            → mental   (conocimiento del juego y gestión)
#   - grada              → social   (animar, respetar, participar con otros)
#   - juego limpio       → interior (valores y ética personal)
# El mundo emocional se trabaja hoy mediante criterios personalizados.
MUNDO_DEPORTIVO = "fisico"
MUNDO_ARBITRO = "mental"
MUNDO_GRADA = "social"
MUNDO_JUEGO_LIMPIO = "interior"


def es_mundo_valido(valor: str | None) -> bool:
    """Un criterio puede no tener mundo asignado (None) o uno de los cinco."""
    return valor is None or valor in MUNDOS
