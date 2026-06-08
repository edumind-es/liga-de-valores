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

import { apiClient, authenticatedFetch } from './client';
import {
    type Liga,
    type LigaWithStats,
    type CreateLigaData,
    type UpdateLigaData,
    type MatchRoleSchema,
    type LeagueTeacherMember,
    type LeagueTeacherMemberUpsert,
} from '@/types/liga';
import { type LeagueCapacity } from '@/types/auth';

export const ligasApi = {
    getAll: async (): Promise<Liga[]> => {
        const response = await apiClient.client.get('/ligas/');
        return response.data;
    },

    getById: async (id: number): Promise<LigaWithStats> => {
        const response = await apiClient.client.get(`/ligas/${id}`);
        return response.data;
    },

    getCapacity: async (): Promise<LeagueCapacity> => {
        const response = await apiClient.client.get('/ligas/capacity');
        return response.data;
    },

    create: async (data: CreateLigaData): Promise<Liga> => {
        const response = await apiClient.client.post('/ligas/', data);
        return response.data;
    },

    update: async (id: number, data: UpdateLigaData): Promise<Liga> => {
        const response = await apiClient.client.put(`/ligas/${id}`, data);
        return response.data;
    },

    getMatchRoleSchema: async (ligaId: number): Promise<MatchRoleSchema> => {
        const response = await apiClient.client.get(`/ligas/${ligaId}/match-role-schema`);
        return response.data;
    },

    updateMatchRoleSchema: async (ligaId: number, data: MatchRoleSchema): Promise<MatchRoleSchema> => {
        const response = await apiClient.client.put(`/ligas/${ligaId}/match-role-schema`, data);
        return response.data;
    },

    lockMatchRoleSchema: async (ligaId: number): Promise<MatchRoleSchema> => {
        const response = await apiClient.client.post(`/ligas/${ligaId}/match-role-schema/lock`);
        return response.data;
    },

    unlockMatchRoleSchema: async (ligaId: number): Promise<MatchRoleSchema> => {
        const response = await apiClient.client.delete(`/ligas/${ligaId}/match-role-schema/lock`);
        return response.data;
    },

    getDocentes: async (ligaId: number): Promise<LeagueTeacherMember[]> => {
        const response = await apiClient.client.get(`/ligas/${ligaId}/docentes`);
        return response.data;
    },

    upsertDocente: async (ligaId: number, data: LeagueTeacherMemberUpsert): Promise<LeagueTeacherMember> => {
        const response = await apiClient.client.post(`/ligas/${ligaId}/docentes`, data);
        return response.data;
    },

    revokeDocente: async (ligaId: number, userId: number): Promise<void> => {
        await apiClient.client.delete(`/ligas/${ligaId}/docentes/${userId}`);
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.client.delete(`/ligas/${id}`);
    },

    getClasificacion: async (id: number) => {
        const response = await apiClient.client.get(`/ligas/${id}/clasificacion`);
        return response.data;
    },

    generatePublicPin: async (id: number): Promise<{ public_pin: string }> => {
        const response = await apiClient.client.post(`/ligas/${id}/public-pin`);
        return response.data;
    },

    disablePublicPin: async (id: number): Promise<void> => {
        await apiClient.client.delete(`/ligas/${id}/public-pin`);
    },

    // Exportaciones
    exportPDF: async (ligaId: number): Promise<void> => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const response = await authenticatedFetch(`${apiUrl}/ligas/${ligaId}/export/clasificacion/pdf`);

        if (!response.ok) {
            throw new Error('Error al exportar PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clasificacion_${ligaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    exportCSV: async (ligaId: number): Promise<void> => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const response = await authenticatedFetch(`${apiUrl}/ligas/${ligaId}/export/clasificacion/csv`);

        if (!response.ok) {
            throw new Error('Error al exportar CSV');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clasificacion_${ligaId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    exportEstadisticas: async (
        ligaId: number,
        formato: 'csv' | 'pdf' = 'csv',
        jornadaId?: number,
        equipoId?: number,
    ): Promise<void> => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const params = new URLSearchParams({ formato });
        if (jornadaId) params.set('jornada_id', jornadaId.toString());
        if (equipoId) params.set('equipo_id', equipoId.toString());
        const response = await authenticatedFetch(`${apiUrl}/ligas/${ligaId}/export/estadisticas?${params}`);
        if (!response.ok) throw new Error('Error al exportar estadísticas');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estadisticas_${ligaId}.${formato}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },
};
