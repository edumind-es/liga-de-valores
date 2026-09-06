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
 * Constantes de Los Cinco Mundos EDUfis: colores oficiales del sistema
 * Lámina y etiquetas de interfaz. Módulo aparte de los componentes para
 * poder compartirse sin romper el fast refresh.
 */
import type { Mundo } from '@/types/liga';

export const MUNDO_COLOR: Record<Mundo, string> = {
    fisico: '#e8613f',
    mental: '#3f7d99',
    emocional: '#6ea94a',
    social: '#e8a92e',
    interior: '#2c5c66',
};

export const MUNDO_LABEL: Record<Mundo, string> = {
    fisico: 'Físico',
    mental: 'Mental',
    emocional: 'Emocional',
    social: 'Social',
    interior: 'Interior',
};
