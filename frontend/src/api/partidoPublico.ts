/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { apiClient } from './client';

export interface TipoDeportePublico {
    nombre: string;
    tipo_marcador: string;
    config: Record<string, unknown>;
}

export interface PartidoPublico {
    id: number;
    liga_id: number;
    liga_nombre: string;
    modo_evaluacion: 'clasico' | 'personalizado';
    equipo_local: string;
    equipo_visitante: string;
    arbitro_nombre?: string | null;
    tutor_grada_local_nombre?: string | null;
    tutor_grada_visitante_nombre?: string | null;
    tipo_deporte: TipoDeportePublico;
    marcador_actual: Record<string, unknown>;
    marcador_local: number;
    marcador_visitante: number;
    marcador_pendiente: Record<string, unknown> | null;
    evaluacion_pendiente: Record<string, unknown> | null;
    hay_propuesta_pendiente: boolean;
}

export interface EvaluacionPublica {
    puntos_juego_limpio_local: number;
    puntos_juego_limpio_visitante: number;
    cumple_minimos_local: number;
    cumple_minimos_visitante: number;
    arbitro_conocimiento: number;
    arbitro_gestion: number;
    arbitro_apoyo: number;
    grada_animar_local: number;
    grada_respeto_local: number;
    grada_participacion_local: number;
    grada_animar_visitante: number;
    grada_respeto_visitante: number;
    grada_participacion_visitante: number;
}

export const partidoPublicoApi = {
    getByPin: async (pin: string): Promise<PartidoPublico> => {
        const response = await apiClient.client.get(`/public/partido/${pin}`);
        return response.data;
    },

    submitMarcador: async (
        pin: string,
        marcador: Record<string, unknown>,
        evaluacion: EvaluacionPublica,
        observaciones?: string
    ): Promise<{ message: string; pending_id: number }> => {
        const response = await apiClient.client.post(`/public/partido/${pin}/marcador`, {
            marcador,
            evaluacion,
            observaciones,
        });
        return response.data;
    },

    submitNota: async (
        pin: string,
        contenido: string,
        tipo: 'observacion' | 'incidencia' | 'evidencia',
        consentimiento_lopd: boolean
    ): Promise<{ message: string; tipo: string }> => {
        const response = await apiClient.client.post(`/public/partido/${pin}/nota`, {
            contenido,
            tipo,
            consentimiento_lopd,
        });
        return response.data;
    },
};
