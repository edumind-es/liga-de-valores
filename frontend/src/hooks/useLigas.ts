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
import { ligasApi } from '../api/ligas';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/apiUtils';
import type { UpdateLigaData } from '../types/liga';

export function useLigas() {
    return useQuery({
        queryKey: ['ligas'],
        queryFn: () => ligasApi.getAll(),
    });
}

export function useLiga(id: number) {
    return useQuery({
        queryKey: ['ligas', id],
        queryFn: () => ligasApi.getById(id),
        enabled: !!id,
    });
}

export function useClasificacion(id: number) {
    return useQuery({
        queryKey: ['clasificacion', id],
        queryFn: () => ligasApi.getClasificacion(id),
        enabled: !!id,
    });
}

export function useUpdateLiga() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLigaData }) =>
            ligasApi.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ligas'] });
            queryClient.invalidateQueries({ queryKey: ['ligas', data.id] });
            toast.success('Liga actualizada correctamente');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });
}
