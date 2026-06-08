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

import { ApiClient } from './client';
import { type PartidoCreate, type PartidoResponse, type PartidoDetailed, type PartidoUpdateMarcador, type PartidoUpdateEvaluacion, type PartidoNota } from '../types/liga';

class PartidosApi extends ApiClient {
    async getAll(filters?: { liga_id?: number; jornada_id?: number; equipo_id?: number; skip?: number; limit?: number }) {
        const params = new URLSearchParams();
        if (filters?.liga_id) params.append('liga_id', filters.liga_id.toString());
        if (filters?.jornada_id) params.append('jornada_id', filters.jornada_id.toString());
        if (filters?.equipo_id) params.append('equipo_id', filters.equipo_id.toString());
        if (typeof filters?.skip === 'number') params.append('skip', filters.skip.toString());
        if (typeof filters?.limit === 'number') params.append('limit', filters.limit.toString());

        const response = await this.client.get<PartidoDetailed[]>(`/partidos/?${params.toString()}`);
        return response.data;
    }

    async getById(id: number) {
        const response = await this.client.get<PartidoDetailed>(`/partidos/${id}`);
        return response.data;
    }

    async create(data: PartidoCreate) {
        const response = await this.client.post<PartidoResponse>('/partidos/', data);
        return response.data;
    }

    async updateMarcador(id: number, data: PartidoUpdateMarcador) {
        const response = await this.client.put<PartidoResponse>(`/partidos/${id}/marcador`, data);
        return response.data;
    }

    async updateEvaluacion(id: number, data: PartidoUpdateEvaluacion) {
        const response = await this.client.put<PartidoResponse>(`/partidos/${id}/evaluacion`, data);
        return response.data;
    }

    async finalizar(id: number) {
        const response = await this.client.put<PartidoResponse>(`/partidos/${id}/finalizar`);
        return response.data;
    }

    async delete(id: number) {
        await this.client.delete(`/partidos/${id}`);
    }

    async generatePin(id: number) {
        const response = await this.client.post<PartidoResponse>(`/partidos/${id}/pin`);
        return response.data;
    }

    async revokePin(id: number) {
        const response = await this.client.delete<PartidoResponse>(`/partidos/${id}/pin`);
        return response.data;
    }

    async exportPinesCalendario(ligaId: number, formato: 'pdf' | 'csv' = 'pdf', soloConPin = false): Promise<void> {
        const { authenticatedFetch } = await import('./client');
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const params = new URLSearchParams({
            liga_id: ligaId.toString(),
            formato,
            solo_con_pin: soloConPin ? 'true' : 'false',
        });
        const response = await authenticatedFetch(`${apiUrl}/partidos/export/pines?${params}`);
        if (!response.ok) throw new Error('Error al exportar calendario de PINes');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pines_liga_${ligaId}.${formato}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Anotaciones (notas de partido)
    async getNotas(partidoId: number): Promise<PartidoNota[]> {
        const response = await this.client.get<PartidoNota[]>(`/partidos/${partidoId}/notas`);
        return response.data;
    }

    async updateEstadoNota(partidoId: number, notaId: number, estado: 'aprobada' | 'rechazada'): Promise<PartidoNota> {
        const response = await this.client.put<PartidoNota>(`/partidos/${partidoId}/notas/${notaId}/estado`, { estado });
        return response.data;
    }

    async deleteNota(partidoId: number, notaId: number): Promise<void> {
        await this.client.delete(`/partidos/${partidoId}/notas/${notaId}`);
    }
}

export const partidosApi = new PartidosApi();
