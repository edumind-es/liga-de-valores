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
Tests for student code generator service.
"""
import pytest
from app.services.student_code_generator import (
    generar_codigo_estudiante,
    generar_codigos_para_equipo,
    generar_codigos_para_liga,
    validar_codigo,
    obtener_estadisticas_diccionario,
    DICCIONARIO_CODIGOS
)

class TestGeneradorCodigos:
    """Tests para el generador de códigos temáticos."""
    
    def test_generar_codigo_individual(self):
        """Test generación de código individual."""
        codigo = generar_codigo_estudiante(1, 1, seed=1000)
        
        assert isinstance(codigo, str)
        assert "-" in codigo
        assert len(codigo.split("-")) == 2
        
        palabra, numero = codigo.split("-")
        assert palabra in DICCIONARIO_CODIGOS
        assert numero == "01"
    
    def test_generar_codigo_formato(self):
        """Test formato del código generado."""
        codigo = generar_codigo_estudiante(1, 5, seed=1000)
        
        palabra, numero = codigo.split("-")
        assert len(numero) == 2  # Debe ser 2 dígitos
        assert numero == "05"
    
    def test_generar_codigos_equipo(self):
        """Test generación de códigos para equipo completo."""
        codigos = generar_codigos_para_equipo(1, 4, seed=1000)
        
        assert len(codigos) == 4
        assert all(isinstance(c, str) for c in codigos)
        assert all("-" in c for c in codigos)
        
        # Verificar numeración secuencial
        numeros = [c.split("-")[1] for c in codigos]
        assert numeros == ["01", "02", "03", "04"]
    
    def test_generar_codigos_liga(self):
        """Test generación de códigos para liga completa."""
        equipos = [1, 2, 3]
        codigos_liga = generar_codigos_para_liga(equipos, 3)
        
        assert len(codigos_liga) == 3
        assert all(eq_id in codigos_liga for eq_id in equipos)
        assert all(len(codigos) == 3 for codigos in codigos_liga.values())
    
    def test_validar_codigo_valido(self):
        """Test validación de código válido."""
        assert validar_codigo("LEON-01") == True
        assert validar_codigo("TIGRE-15") == True
        assert validar_codigo("AGUILA-99") == True
    
    def test_validar_codigo_invalido(self):
        """Test validación de código inválido."""
        assert validar_codigo("INVALID-01") == False  # Palabra no en diccionario
        assert validar_codigo("LEON") == False  # Sin número
        assert validar_codigo("LEON-100") == False  # Número fuera de rango
        assert validar_codigo("") == False  # Vacío
        assert validar_codigo("LEON-00") == False  # Número 0
    
    def test_estadisticas_diccionario(self):
        """Test estadísticas del diccionario."""
        stats = obtener_estadisticas_diccionario()
        
        assert stats["total_palabras"] == 100
        assert stats["max_estudiantes_sin_repetir"] == 100
        assert "categorias" in stats
    
    def test_unicidad_en_equipo(self):
        """Test que no se repiten códigos en el mismo equipo."""
        codigos = generar_codigos_para_equipo(1, 10, seed=1000)
        
        palabras = [c.split("-")[0] for c in codigos]
        assert len(palabras) == len(set(palabras))  # Sin duplicados
    
    def test_reproducibilidad_con_seed(self):
        """Test que el seed produce resultados reproducibles."""
        codigos1 = generar_codigos_para_equipo(1, 5, seed=1000)
        codigos2 = generar_codigos_para_equipo(1, 5, seed=1000)
        
        assert codigos1 == codigos2
    
    def test_diferentes_equipos_diferentes_codigos(self):
        """Test que equipos diferentes obtienen códigos diferentes."""
        codigos_eq1 = generar_codigos_para_equipo(1, 5, seed=1000)
        codigos_eq2 = generar_codigos_para_equipo(2, 5, seed=1000)
        
        # Las palabras deben ser diferentes (con el mismo seed)
        palabras1 = [c.split("-")[0] for c in codigos_eq1]
        palabras2 = [c.split("-")[0] for c in codigos_eq2]
        
        assert palabras1 != palabras2
