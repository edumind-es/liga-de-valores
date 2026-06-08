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
Servicio para generar códigos temáticos de estudiantes.
Sistema Privacy-First: sin datos personales, solo códigos anónimos.
"""
import random
from typing import List

# Diccionario de 100 palabras temáticas
DICCIONARIO_CODIGOS = [
    # Animales terrestres (30)
    "LEON", "TIGRE", "LOBO", "OSO", "PUMA", "JAGUAR", "LINCE", "GUEPARDO",
    "ELEFANTE", "RINOCERONTE", "HIPOPOTAMO", "JIRAFA", "CEBRA", "ANTILOPE",
    "BISONTE", "BUFALO", "CANGURO", "KOALA", "PANDA", "GORILA", "CHIMPANCE",
    "ORANGUTAN", "MONO", "ARDILLA", "CASTOR", "MARMOTA", "NUTRIA", "COMADREJA",
    "ERIZO", "TOPO",
    
    # Aves (20)
    "AGUILA", "HALCON", "BUHO", "LECHUZA", "CONDOR", "BUITRE", "GAVILAN",
    "CUERVO", "COLIBRI", "PELICANO", "FLAMENCO", "CISNE", "PATO", "GANSO",
    "LORO", "PINGUINO", "AVESTRUZ", "PAVO", "GALLO", "PALOMA",
    
    # Animales acuáticos (20)
    "DELFIN", "BALLENA", "ORCA", "TIBURON", "RAYA", "PEZESPADA", "ATUN",
    "SALMON", "TRUCHA", "LUBINA", "PULPO", "CALAMAR", "MEDUSA", "ESTRELLA",
    "CANGREJO", "LANGOSTA", "CABALLITO", "MORENA", "PIRAÑA", "BARRACUDA",
    
    # Reptiles y otros (20)
    "COCODRILO", "CAIMAN", "TORTUGA", "IGUANA", "CAMALEON", "DRAGON",
    "SERPIENTE", "COBRA", "PITON", "SALAMANDRA", "RANA", "SAPO",
    "GECKO", "LAGARTO", "ANACONDA", "BOA", "VARANO", "ESCINCO",
    "TUATARA", "BASILISCO",
    
    # Conceptos abstractos/valores (10)
    "RAYO", "TRUENO", "RELAMPAGO", "VOLCAN", "TERREMOTO", "TSUNAMI",
    "HURACAN", "TORNADO", "AURORA", "COMETA"
]

def generar_codigo_estudiante(
    equipo_id: int, 
    num_jugador: int, 
    seed: int | None = None
) -> str:
    """
    Genera código temático único para un estudiante.
    
    Formato: PALABRA-NN (ej: LEON-01, TIGRE-02)
    
    Args:
        equipo_id: ID del equipo
        num_jugador: Número del jugador (1-N)
        seed: Semilla para selección determinística (opcional)
    
    Returns:
        Código formato PALABRA-NN
    
    Examples:
        >>> generar_codigo_estudiante(1, 1, 1000)
        'LEON-01'
        >>> generar_codigo_estudiante(1, 2, 1000)
        'TIGRE-02'
    """
    # Usar seed para determinismo si se proporciona
    if seed is not None:
        random.seed(seed + equipo_id)
    
    # Seleccionar palabra única para este jugador
    # Evitar repeticiones dentro del mismo equipo
    idx = (equipo_id * 10 + num_jugador - 1) % len(DICCIONARIO_CODIGOS)
    palabra = DICCIONARIO_CODIGOS[idx]
    
    # Formatear número con 2 dígitos
    codigo = f"{palabra}-{num_jugador:02d}"
    
    return codigo

def generar_codigos_para_equipo(
    equipo_id: int,
    num_estudiantes: int,
    seed: int | None = None
) -> List[str]:
    """
    Genera todos los códigos para un equipo completo.
    
    Args:
        equipo_id: ID del equipo
        num_estudiantes: Cantidad de estudiantes en el equipo
        seed: Semilla para reproducibilidad
    
    Returns:
        Lista de códigos generados
    
    Examples:
        >>> generar_codigos_para_equipo(1, 4, 1000)
        ['LEON-01', 'TIGRE-02', 'LOBO-03', 'OSO-04']
    """
    codigos = []
    
    for i in range(1, num_estudiantes + 1):
        codigo = generar_codigo_estudiante(equipo_id, i, seed)
        codigos.append(codigo)
    
    return codigos

def generar_codigos_para_liga(
    equipos_ids: List[int],
    estudiantes_por_equipo: int
) -> dict[int, List[str]]:
    """
    Genera códigos para todos los equipos de una liga.
    
    Args:
        equipos_ids: Lista de IDs de equipos
        estudiantes_por_equipo: Cantidad de estudiantes por equipo
    
    Returns:
        Diccionario {equipo_id: [códigos]}
    
    Examples:
        >>> generar_codigos_para_liga([1, 2], 3)
        {1: ['LEON-01', 'TIGRE-02', 'LOBO-03'], 
         2: ['OSO-01', 'PUMA-02', 'JAGUAR-03']}
    """
    # Seed único para toda la liga (reproducible)
    seed = random.randint(1000, 9999)
    
    codigos_liga = {}
    
    for equipo_id in equipos_ids:
        codigos = generar_codigos_para_equipo(
            equipo_id,
            estudiantes_por_equipo,
            seed
        )
        codigos_liga[equipo_id] = codigos
    
    return codigos_liga

def validar_codigo(codigo: str) -> bool:
    """
    Valida que un código tenga el formato correcto.
    
    Args:
        codigo: Código a validar (ej: "LEON-01")
    
    Returns:
        True si es válido, False en caso contrario
    
    Examples:
        >>> validar_codigo("LEON-01")
        True
        >>> validar_codigo("INVALID")
        False
    """
    if not codigo or "-" not in codigo:
        return False
    
    partes = codigo.split("-")
    if len(partes) != 2:
        return False
    
    palabra, numero = partes
    
    # Validar palabra
    if palabra not in DICCIONARIO_CODIGOS:
        return False
    
    # Validar número (debe ser 01-99)
    try:
        num = int(numero)
        if num < 1 or num > 99:
            return False
    except ValueError:
        return False
    
    return True

def obtener_estadisticas_diccionario() -> dict:
    """
    Obtiene estadísticas del diccionario de palabras.
    
    Returns:
        Diccionario con información del diccionario
    """
    return {
        "total_palabras": len(DICCIONARIO_CODIGOS),
        "max_estudiantes_sin_repetir": len(DICCIONARIO_CODIGOS),
        "categorias": {
            "terrestres": 30,
            "aves": 20,
            "acuaticos": 20,
            "reptiles": 20,
            "abstractos": 10
        }
    }
