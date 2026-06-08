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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partidosApi } from '../api/partidos';
import { type PartidoCreate, type PartidoUpdateMarcador, type PartidoUpdateEvaluacion, type PartidoDetailed } from '../types/liga';
import { isLeaguePreparedOffline, saveRecord } from '@/lib/offline/offlineDB';

export function usePartidos(ligaId?: number) {
    return useQuery({
        queryKey: ['partidos', { ligaId }],
        queryFn: async () => {
            const data = await partidosApi.getAll(ligaId ? { liga_id: ligaId } : undefined) as PartidoDetailed[];
            try {
                if (ligaId && await isLeaguePreparedOffline(ligaId)) {
                    await Promise.all(
                        data.map((partido) =>
                            saveRecord('partidos', 'partido', partido.id, partido, { syncStatus: 'synced' })
                        )
                    );
                }
            } catch (err) {
                console.warn('No se pudo cachear la lista de partidos para offline:', err);
            }
            return data;
        },
        enabled: !!ligaId,
    });
}

export function usePartido(id: number) {
    return useQuery({
        queryKey: ['partidos', id],
        queryFn: () => partidosApi.getById(id),
        enabled: !!id,
    });
}

export function useCreatePartido() {
    const queryClient = useQueryClient();

    const invalidateLeagueViews = (targetLigaId?: number) => {
        queryClient.invalidateQueries({ queryKey: ['partidos'] });
        queryClient.invalidateQueries({ queryKey: ['clasificacion'] });
        queryClient.invalidateQueries({ queryKey: ['ligas'] });
        if (targetLigaId) {
            queryClient.invalidateQueries({ queryKey: ['ligas', targetLigaId] });
        }
    };

    return useMutation({
        mutationFn: (data: PartidoCreate) => partidosApi.create(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['partidos', { ligaId: variables.liga_id }] });
            invalidateLeagueViews(variables.liga_id);
        },
    });
}

export function useDeletePartido() {
    const queryClient = useQueryClient();

    const invalidateLeagueViews = () => {
        queryClient.invalidateQueries({ queryKey: ['partidos'] });
        queryClient.invalidateQueries({ queryKey: ['clasificacion'] });
        queryClient.invalidateQueries({ queryKey: ['ligas'] });
    };

    return useMutation({
        mutationFn: (id: number) => partidosApi.delete(id),
        onSuccess: () => {
            invalidateLeagueViews();
        },
    });
}

export function useUpdateMarcador() {
    const queryClient = useQueryClient();

    const invalidateLeagueViews = (targetLigaId?: number) => {
        queryClient.invalidateQueries({ queryKey: ['partidos'] });
        queryClient.invalidateQueries({ queryKey: ['clasificacion'] });
        queryClient.invalidateQueries({ queryKey: ['ligas'] });
        if (targetLigaId) {
            queryClient.invalidateQueries({ queryKey: ['ligas', targetLigaId] });
        }
    };

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: PartidoUpdateMarcador }) =>
            partidosApi.updateMarcador(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['partidos', data.id] });
            invalidateLeagueViews(data.liga_id);
        },
    });
}

export function useUpdateEvaluacion() {
    const queryClient = useQueryClient();

    const invalidateLeagueViews = (targetLigaId?: number) => {
        queryClient.invalidateQueries({ queryKey: ['partidos'] });
        queryClient.invalidateQueries({ queryKey: ['clasificacion'] });
        queryClient.invalidateQueries({ queryKey: ['ligas'] });
        if (targetLigaId) {
            queryClient.invalidateQueries({ queryKey: ['ligas', targetLigaId] });
        }
    };

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: PartidoUpdateEvaluacion }) =>
            partidosApi.updateEvaluacion(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['partidos', data.id] });
            invalidateLeagueViews(data.liga_id);
        },
    });
}
