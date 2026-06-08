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
import { type LigaResponse } from '@/types/liga';

export const publicApi = {
    login: async (ligaId: number, pin: string) => {
        const response = await apiClient.client.post('/public/login', { liga_id: ligaId, pin });
        return response.data;
    },

    findByPin: async (pin: string): Promise<{ liga_id: number }> => {
        const response = await apiClient.client.post('/public/find-by-pin', { pin });
        return response.data;
    },

    getLiga: async (ligaId: number, token: string): Promise<LigaResponse> => {
        const response = await apiClient.client.get(`/public/ligas/${ligaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getClasificacion: async (ligaId: number, token: string) => {
        const response = await apiClient.client.get(`/public/ligas/${ligaId}/clasificacion`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getJornadas: async (ligaId: number, token: string) => {
        const response = await apiClient.client.get(`/public/ligas/${ligaId}/jornadas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
