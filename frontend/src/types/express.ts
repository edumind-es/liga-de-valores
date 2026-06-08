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

export interface ExpressTeam {
    id: string;
    nombre: string;
    color?: string;
    rol: 'local' | 'visitante' | 'arbitro' | 'grada_local' | 'grada_visitante';
}

export interface ExpressMatch {
    id: string;
    deporte: {
        id: number;
        nombre: string;
        codigo: string;
        tipo_marcador: string;
        icono?: string | null;
        logo_file?: string | null;
        vt_file?: string | null;  // Visual Thinking PDF URL
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config?: Record<string, any>;
    };
    equipos: ExpressTeam[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcador: Record<string, any>;
    evaluaciones: {
        juego_limpio?: { local: number; visitante: number };
        arbitro?: { conocimiento: number; gestion: number; apoyo: number };
        grada?: {
            local?: { animar: number; respeto: number; participacion: number };
            visitante?: { animar: number; respeto: number; participacion: number };
        };
    };
    fecha: string;
    finalizado: boolean;
    tiempoInicio?: string;
    duracion?: number;
}

export interface ExpressMatchShare {
    m: string; // match data encoded
    v: number; // version
}
