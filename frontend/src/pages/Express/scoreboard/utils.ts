/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Utilidades puras del scoreboard Express: lectura de configuración por
 * deporte, temas de layout y cálculo de marcador combinado.

 */
import { playGoal } from '@/lib/audio';
import type { DeporteConfig } from '@/types/marcador';

/**
 * Marcador type uses 'any' intentionally because:
 * 1. Sport scoreboards have dynamic keys (goles_local, puntos_visitante, etc.)
 * 2. TypeScript cannot perform arithmetic on 'unknown' type
 * 3. Keys are computed at runtime (e.g., `goles_${team}`)
 *
 * The typed interfaces in @/types/marcador.ts provide documentation
 * for the expected structure of each sport type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MarcadorRecord = Record<string, any>;

export interface SubScoreboardProps {
    marcador: MarcadorRecord;
    onUpdate: (updates: MarcadorRecord) => void;
    config?: DeporteConfig;
    localName: string;
    visitanteName: string;
}

// Sound effect utility
export function playGoalSound() {
    playGoal();
}

export const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

export const getConfigNumber = (config: DeporteConfig | undefined, keys: string[]): number | null => {
    if (!config) return null;
    for (const key of keys) {
        const raw = (config as Record<string, unknown>)[key];
        const value = toNumber(raw);
        if (value !== null && value > 0) return value;
    }
    return null;
};

export const getDefaultTimeSeconds = (config: DeporteConfig | undefined, fallbackMinutes: number): number => {
    const primaryMinutes = getConfigNumber(config, [
        'tiempo_limite',
        'tiempo_regulacion',
        'duracion_partido',
        'duracion_minutos',
        'duracion_tiempo_min',
    ]);

    if (primaryMinutes) {
        return primaryMinutes * 60;
    }

    const duracionCuarto = getConfigNumber(config, ['duracion_cuarto']);
    const cuartos = getConfigNumber(config, ['cuartos']);
    if (duracionCuarto && cuartos) {
        return duracionCuarto * cuartos * 60;
    }

    return fallbackMinutes * 60;
};

export const getScoringButtons = (config: DeporteConfig | undefined, fallback: number[]): number[] => {
    const raw = config?.botones_puntuacion;
    if (Array.isArray(raw)) {
        const buttons = raw
            .map((value) => toNumber(value))
            .filter((value): value is number => value !== null && value > 0);
        const unique = Array.from(new Set(buttons));
        if (unique.length > 0) {
            return unique.sort((a, b) => a - b);
        }
    }
    return fallback;
};

export const getSetsTotales = (config: DeporteConfig | undefined): number | null => {
    const explicit = getConfigNumber(config, ['sets_totales']);
    if (explicit) return explicit;
    const setsParaGanar = getConfigNumber(config, ['sets_para_ganar']);
    if (setsParaGanar) return Math.max(1, setsParaGanar * 2 - 1);
    return null;
};

export const getSetTargetPoints = (config: DeporteConfig | undefined, setActual: number): number => {
    const puntosPorSet = (config as Record<string, unknown> | undefined)?.puntos_por_set
        ?? (config as Record<string, unknown> | undefined)?.puntos_para_ganar;

    let target: number | null = null;

    if (Array.isArray(puntosPorSet)) {
        const raw = puntosPorSet[setActual - 1] ?? puntosPorSet[puntosPorSet.length - 1];
        target = toNumber(raw);
    } else if (puntosPorSet !== undefined) {
        target = toNumber(puntosPorSet);
    }

    const setsTotales = getSetsTotales(config);
    const isDecisive = setsTotales ? setActual >= setsTotales : setActual >= 5;
    const decisivo = getConfigNumber(config, ['puntos_set_decisivo']);
    if (isDecisive && decisivo) {
        target = decisivo;
    }

    if (target && target > 0) return target;
    return isDecisive ? 15 : 25;
};

export const getSetDifference = (config: DeporteConfig | undefined): number => {
    const diff = getConfigNumber(config, ['diferencia_minima']);
    return diff && diff > 0 ? diff : 2;
};

export type LayoutVariant = 'classic' | 'arena' | 'tactical' | 'neon';

export const isLayoutVariant = (value: unknown): value is LayoutVariant => (
    value === 'classic' || value === 'arena' || value === 'tactical' || value === 'neon'
);

export const getLayoutVariant = (tipo: string, config?: DeporteConfig): LayoutVariant => {
    const configured = (config as Record<string, unknown> | undefined)?.layout_variant;
    if (isLayoutVariant(configured)) return configured;

    switch (tipo) {
        case 'puntos':
            return 'arena';
        case 'sets':
            return 'tactical';
        case 'towertouchball':
            return 'neon';
        default:
            return 'classic';
    }
};

export type LayoutTheme = {
    background?: string;
    border?: string;
    accent?: string;
};

export const getThemeColor = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

export const getLayoutTheme = (config?: DeporteConfig): LayoutTheme | null => {
    if (!config) return null;
    const rawPalette = (config as Record<string, unknown>).layout_palette;
    const palette = rawPalette && typeof rawPalette === 'object'
        ? (rawPalette as Record<string, unknown>)
        : null;

    const background = getThemeColor(
        palette?.background
        ?? palette?.fondo
        ?? (config as Record<string, unknown>).layout_background
        ?? (config as Record<string, unknown>).color_fondo
        ?? (config as Record<string, unknown>).fondo
    );
    const border = getThemeColor(
        palette?.border
        ?? palette?.borde
        ?? (config as Record<string, unknown>).layout_border
        ?? (config as Record<string, unknown>).color_borde
        ?? (config as Record<string, unknown>).borde
    );
    const accent = getThemeColor(
        palette?.accent
        ?? palette?.acento
        ?? (config as Record<string, unknown>).layout_accent
        ?? (config as Record<string, unknown>).color_acento
        ?? (config as Record<string, unknown>).color_primario
    );

    if (!background && !border && !accent) return null;
    return {
        background: background ?? undefined,
        border: border ?? undefined,
        accent: accent ?? undefined,
    };
};

export const hasButtonPattern = (buttons: number[], expected: number[]) => (
    buttons.length === expected.length && buttons.every((v, i) => v === expected[i])
);

export const isLikelyThreeXThree = (config?: DeporteConfig): boolean => {
    const pointsToWin = getConfigNumber(config, ['puntos_para_ganar']);
    const limitMinutes = getConfigNumber(config, ['tiempo_limite']);
    const buttons = getScoringButtons(config, []);
    return pointsToWin === 21 && limitMinutes === 10 && hasButtonPattern(buttons, [1, 2]);
};

export const getPossessionSeconds = (config?: DeporteConfig): number | null => {
    const configured = getConfigNumber(config, [
        'tiempo_posesion_segundos',
        'reloj_posesion_segundos',
        'posesion_segundos',
        'tiempo_posesion'
    ]);
    if (configured) return configured;
    if (isLikelyThreeXThree(config)) return 12;
    return null;
};

export const getTryValues = (config?: DeporteConfig): { valorTry: number; valorConversion: number } => {
    const readValue = (keys: string[], fallback: number, allowZero = false) => {
        for (const key of keys) {
            const raw = (config as Record<string, unknown> | undefined)?.[key];
            const value = toNumber(raw);
            if (value !== null && (allowZero ? value >= 0 : value > 0)) return value;
        }
        return fallback;
    };
    const valorTry = readValue(['valor_try', 'puntos_por_try'], 5);
    const valorConversion = readValue(['valor_conversion', 'puntos_por_conversion'], 2, true);
    return { valorTry, valorConversion };
};

export function n(v: unknown): number {
    return typeof v === 'number' ? v : 0;
}

/**
 * Resumen legible del reglamento del deporte a partir de su config.
 * Se muestra en el marcador para que el alumnado conozca las reglas
 * (duración, meta de puntos, valor de cada acción) mientras arbitra.
 */
export function getReglasDeporte(tipo: string, config?: DeporteConfig): string[] {
    const reglas: string[] = [];
    const minutos = getConfigNumber(config, ['tiempo_limite', 'tiempo_regulacion', 'duracion_partido', 'duracion_minutos']);
    const cuartos = getConfigNumber(config, ['cuartos']);
    const duracionCuarto = getConfigNumber(config, ['duracion_cuarto']);
    const meta = getConfigNumber(config, ['puntos_para_ganar']);

    if (minutos) reglas.push(`Duración: ${minutos} min`);
    else if (cuartos) reglas.push(`Cuartos: ${cuartos}${duracionCuarto ? ` × ${duracionCuarto} min` : ''}`);

    switch (tipo) {
        case 'goles':
            reglas.push('Cada gol suma 1');
            if (meta) reglas.push(`Gana quien llegue a ${meta}`);
            break;
        case 'puntos': {
            const botones = getScoringButtons(config, meta ? [1] : [1, 2, 3]);
            reglas.push(`Puntúa: ${botones.map((b) => `+${b}`).join(' · ')}`);
            if (meta) reglas.push(`Gana quien llegue a ${meta}`);
            break;
        }
        case 'sets': {
            const sets = getSetsTotales(config);
            const puntosSet = getSetTargetPoints(config, 1);
            reglas.push(`Sets: al mejor de ${sets ?? 3}`);
            reglas.push(`Cada set a ${puntosSet} puntos (dif. ${getSetDifference(config)})`);
            break;
        }
        case 'tries': {
            const { valorTry, valorConversion } = getTryValues(config);
            reglas.push(`Ensayo: ${valorTry} pts`);
            reglas.push(`Conversión: ${valorConversion} pts`);
            break;
        }
        case 'carreras':
            reglas.push('Cada carrera suma 1');
            break;
        case 'towertouchball':
            reglas.push('Puntos y conos derribados');
            break;
    }
    return reglas;
}

export const getCombinedScore = (tipo: string, marcador: MarcadorRecord, config?: DeporteConfig): number => {
    switch (tipo) {
        case 'goles':
            return n(marcador.goles_local) + n(marcador.goles_visitante);
        case 'puntos':
            return n(marcador.puntos_local) + n(marcador.puntos_visitante);
        case 'sets':
            return n(marcador.puntos_set_actual_local) + n(marcador.puntos_set_actual_visitante);
        case 'tries': {
            const { valorTry, valorConversion } = getTryValues(config);
            const local = (n(marcador.tries_local) * valorTry) + (n(marcador.conversiones_local) * valorConversion);
            const visitante = (n(marcador.tries_visitante) * valorTry) + (n(marcador.conversiones_visitante) * valorConversion);
            return local + visitante;
        }
        case 'carreras':
            return n(marcador.carreras_local) + n(marcador.carreras_visitante);
        case 'towertouchball':
            return n(marcador.puntos_local) + n(marcador.puntos_visitante);
        default:
            return n(marcador.local) + n(marcador.visitante);
    }
};
