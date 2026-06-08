/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Tipos para el sistema de evaluación personalizable
 */

export type CategoriaEvaluacion =
    | 'arbitro'
    | 'grada_local'
    | 'grada_visitante'
    | 'jugador'
    | 'general';

export interface CriterioEvaluacion {
    id: number;
    liga_id: number;
    nombre: string;
    codigo: string;
    descripcion?: string;
    categoria: CategoriaEvaluacion;
    escala_min: number;
    escala_max: number;
    umbral_alto: number;
    umbral_medio: number;
    puntos_alto: number;
    puntos_medio: number;
    orden: number;
    activo: boolean;
    icono?: string;
    created_at: string;
    updated_at?: string;
}

export interface CriterioEvaluacionCreate {
    nombre: string;
    codigo: string;
    descripcion?: string;
    categoria?: CategoriaEvaluacion;
    escala_min?: number;
    escala_max?: number;
    umbral_alto?: number;
    umbral_medio?: number;
    puntos_alto?: number;
    puntos_medio?: number;
    orden?: number;
    activo?: boolean;
    icono?: string;
}

export interface CriterioEvaluacionUpdate {
    nombre?: string;
    codigo?: string;
    descripcion?: string;
    categoria?: CategoriaEvaluacion;
    escala_min?: number;
    escala_max?: number;
    umbral_alto?: number;
    umbral_medio?: number;
    puntos_alto?: number;
    puntos_medio?: number;
    orden?: number;
    activo?: boolean;
    icono?: string;
}

export interface PlantillaCriterio {
    nombre: string;
    codigo: string;
    descripcion?: string;
    categoria: string;
    escala_min: number;
    escala_max: number;
    icono?: string;
}

export interface PlantillaEvaluacion {
    nombre: string;
    descripcion: string;
    criterios: PlantillaCriterio[];
}

export interface EvaluacionPersonalizada {
    id: number;
    partido_id: number;
    criterio_id: number;
    equipo_id?: number;
    valor: number;
    created_at: string;
    updated_at?: string;
}

export interface EvaluacionPersonalizadaInput {
    criterio_id: number;
    equipo_id?: number;
    valor: number;
}
