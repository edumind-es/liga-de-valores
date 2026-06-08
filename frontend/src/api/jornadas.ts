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
import { type JornadaWithStats, type JornadaCreate, type JornadaUpdate } from '@/types/liga';

export const jornadasApi = {
    getAllByLiga: async (ligaId: number): Promise<JornadaWithStats[]> => {
        const response = await apiClient.client.get(`/jornadas/?liga_id=${ligaId}`);
        return response.data;
    },

    getById: async (id: number): Promise<JornadaWithStats> => {
        const response = await apiClient.client.get(`/jornadas/${id}`);
        return response.data;
    },

    create: async (data: JornadaCreate): Promise<JornadaWithStats> => {
        const response = await apiClient.client.post('/jornadas/', data);
        return response.data;
    },

    update: async (id: number, data: JornadaUpdate): Promise<JornadaWithStats> => {
        const response = await apiClient.client.put(`/jornadas/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.client.delete(`/jornadas/${id}`);
    },

    generateCalendario: async (jornadaId: number, tipoDeporteId: number) => {
        const response = await apiClient.client.post(
            `/jornadas/${jornadaId}/generar-calendario`,
            null,
            { params: { tipo_deporte_id: tipoDeporteId } }
        );
        return response.data;
    }
};
