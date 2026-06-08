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

import { apiClient } from './client';
import {
    type CriterioEvaluacion,
    type CriterioEvaluacionCreate,
    type CriterioEvaluacionUpdate,
    type PlantillaEvaluacion
} from '@/types/criterioEvaluacion';

export const criteriosApi = {
    /**
     * Obtener plantillas predefinidas de criterios de evaluación
     */
    getPlantillas: async (): Promise<PlantillaEvaluacion[]> => {
        const response = await apiClient.client.get('/ligas/plantillas');
        return response.data;
    },

    /**
     * Listar criterios de una liga
     */
    getByLiga: async (ligaId: number): Promise<CriterioEvaluacion[]> => {
        const response = await apiClient.client.get(`/ligas/${ligaId}/criterios`);
        return response.data;
    },

    /**
     * Crear un nuevo criterio
     */
    create: async (ligaId: number, data: CriterioEvaluacionCreate): Promise<CriterioEvaluacion> => {
        const response = await apiClient.client.post(`/ligas/${ligaId}/criterios`, data);
        return response.data;
    },

    /**
     * Crear criterios desde una plantilla predefinida
     */
    createFromPlantilla: async (ligaId: number, nombrePlantilla: string): Promise<CriterioEvaluacion[]> => {
        const response = await apiClient.client.post(
            `/ligas/${ligaId}/criterios/desde-plantilla/${encodeURIComponent(nombrePlantilla)}`
        );
        return response.data;
    },

    /**
     * Actualizar un criterio
     */
    update: async (ligaId: number, criterioId: number, data: CriterioEvaluacionUpdate): Promise<CriterioEvaluacion> => {
        const response = await apiClient.client.put(`/ligas/${ligaId}/criterios/${criterioId}`, data);
        return response.data;
    },

    /**
     * Eliminar un criterio
     */
    delete: async (ligaId: number, criterioId: number): Promise<void> => {
        await apiClient.client.delete(`/ligas/${ligaId}/criterios/${criterioId}`);
    },

    /**
     * Reordenar criterios
     */
    reordenar: async (ligaId: number, ordenIds: number[]): Promise<CriterioEvaluacion[]> => {
        const response = await apiClient.client.put(`/ligas/${ligaId}/criterios/reordenar`, ordenIds);
        return response.data;
    },

    /**
     * Obtener evaluaciones personalizadas de un partido
     */
    getEvaluacionPartido: async (partidoId: number) => {
        const response = await apiClient.client.get(`/partidos/${partidoId}/evaluacion-personalizada`);
        return response.data;
    },

    /**
     * Guardar evaluaciones personalizadas de un partido
     */
    updateEvaluacionPartido: async (
        partidoId: number,
        evaluaciones: Array<{ criterio_id: number, equipo_id?: number, valor: number }>,
        expectedVersion?: string
    ) => {
        const qs = expectedVersion ? `?expected_version=${encodeURIComponent(expectedVersion)}` : '';
        const response = await apiClient.client.put(`/partidos/${partidoId}/evaluacion-personalizada${qs}`, evaluaciones);
        return response.data;
    }
};
