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
import { type Equipo, type EquipoCreate, type EquipoUpdate } from '@/types/liga';

export interface EquipoStatsHistoryItem {
    jornada: string | number;
    juego_limpio?: number;
    grada?: number;
    arbitraje?: number;
    [key: string]: unknown;
}

export interface EquipoBadge {
    id: number | string;
    icon?: string;
    color?: string;
    name: string;
    description?: string;
    [key: string]: unknown;
}

export const equiposApi = {
    getAllByLiga: async (ligaId: number): Promise<Equipo[]> => {
        const response = await apiClient.client.get(`/equipos/?liga_id=${ligaId}`);
        return response.data;
    },

    getAllAdmin: async (skip = 0, limit = 100): Promise<Equipo[]> => {
        const response = await apiClient.client.get(`/equipos/?skip=${skip}&limit=${limit}`);
        return response.data;
    },

    getById: async (id: number): Promise<Equipo> => {
        const response = await apiClient.client.get(`/equipos/${id}`);
        return response.data;
    },

    create: async (data: EquipoCreate): Promise<Equipo> => {
        const response = await apiClient.client.post('/equipos/', data);
        return response.data;
    },

    update: async (id: number, data: EquipoUpdate): Promise<Equipo> => {
        const response = await apiClient.client.put(`/equipos/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.client.delete(`/equipos/${id}`);
    },


    uploadLogo: async (id: number, file: File): Promise<{ logo_url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.client.post(`/equipos/${id}/logo`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getStatsHistory: async (id: number): Promise<EquipoStatsHistoryItem[]> => {
        const response = await apiClient.client.get(`/equipos/${id}/stats_history`);
        return response.data;
    },

    regenerateToken: async (id: number): Promise<{ acceso_token: string }> => {
        const response = await apiClient.client.post(`/equipos/${id}/regenerate_token`);
        return response.data;
    },

    getBadges: async (id: number): Promise<EquipoBadge[]> => {
        const response = await apiClient.client.get(`/equipos/${id}/badges`);
        return response.data;
    }
};
