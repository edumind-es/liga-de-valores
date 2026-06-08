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
 * Typed interfaces for all scoreboard types in Liga EDUmind
 * Each sport type has its own marcador structure
 */

// Base interface with common timer field
export interface MarcadorBase {
    tiempo_restante?: number;
}

// Goles (Fútbol, Balonmano, Hockey, etc.)
export interface MarcadorGoles extends MarcadorBase {
    goles_local: number;
    goles_visitante: number;
}

// Puntos (Baloncesto, Bádminton, etc.)
export interface MarcadorPuntos extends MarcadorBase {
    puntos_local: number;
    puntos_visitante: number;
}

// Sets (Voleibol, Tenis, Voleibol Sentado, etc.)
export interface MarcadorSets extends MarcadorBase {
    sets_local: number;
    sets_visitante: number;
    set_actual: number;
    puntos_set_actual_local: number;
    puntos_set_actual_visitante: number;
    // Historical set scores
    set_1_local?: number;
    set_1_visitante?: number;
    set_2_local?: number;
    set_2_visitante?: number;
    set_3_local?: number;
    set_3_visitante?: number;
    set_4_local?: number;
    set_4_visitante?: number;
    set_5_local?: number;
    set_5_visitante?: number;
}

// Tries (Rugby Tag, Rugby)
export interface MarcadorTries extends MarcadorBase {
    tries_local: number;
    tries_visitante: number;
    conversiones_local: number;
    conversiones_visitante: number;
}

// Carreras (Béisbol, Softball)
export interface MarcadorCarreras extends MarcadorBase {
    carreras_local: number;
    carreras_visitante: number;
}

// TowerTouchball (specific EDUmind sport)
export interface MarcadorTowerTouchball extends MarcadorBase {
    puntos_local: number;
    puntos_visitante: number;
    conos_local: [boolean, boolean, boolean];
    conos_visitante: [boolean, boolean, boolean];
}

// Union type for any marcador
export type Marcador =
    | MarcadorGoles
    | MarcadorPuntos
    | MarcadorSets
    | MarcadorTries
    | MarcadorCarreras
    | MarcadorTowerTouchball;

// Generic marcador for cases where type is unknown at compile time
// Uses index signature for flexibility - requires type assertions at usage sites
export interface MarcadorGeneric {
    // Timer
    tiempo_restante?: number;
    // Goles
    goles_local?: number;
    goles_visitante?: number;
    // Puntos
    puntos_local?: number;
    puntos_visitante?: number;
    // Sets
    sets_local?: number;
    sets_visitante?: number;
    set_actual?: number;
    puntos_set_actual_local?: number;
    puntos_set_actual_visitante?: number;
    // Tries
    tries_local?: number;
    tries_visitante?: number;
    conversiones_local?: number;
    conversiones_visitante?: number;
    // Carreras
    carreras_local?: number;
    carreras_visitante?: number;
    // TowerTouchball
    conos_local?: boolean[];
    conos_visitante?: boolean[];
    // Allow dynamic key access with unknown type (requires casting at usage)
    [key: string]: unknown;
}

// Sport config type
export interface DeporteConfig {
    valor_try?: number;
    valor_conversion?: number;
    puntos_por_try?: number;
    puntos_por_conversion?: number;
    puntos_para_ganar?: number;
    tiempo_posesion_segundos?: number;
    duracion_partido?: number;
    tiempo_limite?: number;
    tiempo_regulacion?: number;
    duracion_minutos?: number;
    duracion_tiempo_min?: number;
    duracion_cuarto?: number;
    cuartos?: number;
    reglas_especiales?: string[];
    cambio_campo_puntos?: number;
    cambio_campo_tiempo_min?: number;
    cambio_campo_minutos?: number;
    botones_puntuacion?: number[];
    cambio_saque_puntos?: number;
    puntos_por_set?: number | number[];
    puntos_set_decisivo?: number;
    diferencia_minima?: number;
    sets_para_ganar?: number;
    sets_totales?: number;
    layout_variant?: 'classic' | 'arena' | 'tactical' | 'neon';
    layout_palette?: {
        background?: string;
        border?: string;
        accent?: string;
    };
    objetivos_adicionales?: {
        nombre: string;
        max?: number;
        icono?: string;
        victoria_al_completar?: boolean;
    }[];
    [key: string]: unknown;
}

// TipoMarcador literal
export type TipoMarcador = 'goles' | 'puntos' | 'sets' | 'tries' | 'carreras' | 'towertouchball';
