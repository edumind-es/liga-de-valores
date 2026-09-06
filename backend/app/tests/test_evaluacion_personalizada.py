#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""Tests del reparto de puntos por umbrales de la evaluación personalizada."""
from types import SimpleNamespace

from app.services.evaluacion_personalizada import aplicar_puntos_personalizados


def _criterio(**kw):
    base = dict(umbral_alto=7.0, umbral_medio=4.0, puntos_alto=1.0, puntos_medio=0.5, categoria='general')
    base.update(kw)
    return SimpleNamespace(**base)


def _eval(valor, equipo_id=None):
    return SimpleNamespace(valor=valor, equipo_id=equipo_id)


def test_umbral_alto_y_medio_por_equipo():
    partido = SimpleNamespace(equipo_local_id=1, equipo_visitante_id=2)
    datos = [
        (_eval(8, equipo_id=1), _criterio()),   # alto → 1.0 a local
        (_eval(5, equipo_id=2), _criterio()),   # medio → 0.5 a visitante
        (_eval(2, equipo_id=1), _criterio()),   # bajo → 0
    ]
    puntos = aplicar_puntos_personalizados(partido, datos)
    assert puntos == {"local": 1.0, "visitante": 0.5}
    assert partido.puntos_juego_limpio_local == 1
    assert partido.puntos_juego_limpio_visitante == 0  # int(0.5) == 0


def test_categorias_arbitro_y_grada():
    partido = SimpleNamespace(equipo_local_id=1, equipo_visitante_id=2)
    datos = [
        (_eval(9), _criterio(categoria='arbitro')),
        (_eval(8, equipo_id=1), _criterio(categoria='grada_local')),
        (_eval(8, equipo_id=2), _criterio(categoria='grada_visitante')),
    ]
    aplicar_puntos_personalizados(partido, datos)
    assert partido.puntos_arbitro == 1
    assert partido.puntos_grada_local == 1.0
    assert partido.puntos_grada_visitante == 1.0


def test_criterio_general_sin_equipo_suma_a_ambos():
    partido = SimpleNamespace(equipo_local_id=1, equipo_visitante_id=2)
    datos = [(_eval(9), _criterio(categoria='general'))]
    puntos = aplicar_puntos_personalizados(partido, datos)
    assert puntos == {"local": 1.0, "visitante": 1.0}
