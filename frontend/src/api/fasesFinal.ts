/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { ApiClient } from './client';
import type { FaseFinal, FaseFinalCreate, GenerarCrucesPayload } from '@/types/faseFinal';

class FasesFinalApi extends ApiClient {
    async list(ligaId: number): Promise<FaseFinal[]> {
        const r = await this.client.get<FaseFinal[]>(`/ligas/${ligaId}/fases-finales`);
        return r.data;
    }

    async create(ligaId: number, data: FaseFinalCreate): Promise<FaseFinal> {
        const r = await this.client.post<FaseFinal>(`/ligas/${ligaId}/fases-finales`, data);
        return r.data;
    }

    async generarCruces(ligaId: number, faseId: number, payload: GenerarCrucesPayload): Promise<FaseFinal> {
        const r = await this.client.post<FaseFinal>(
            `/ligas/${ligaId}/fases-finales/${faseId}/generar-cruces`,
            payload,
        );
        return r.data;
    }

    async resolverCruce(ligaId: number, faseId: number, cruceId: number, ganadorId: number): Promise<void> {
        await this.client.post(
            `/ligas/${ligaId}/fases-finales/${faseId}/cruces/${cruceId}/resolver`,
            { ganador_id: ganadorId },
        );
    }

    async delete(ligaId: number, faseId: number): Promise<void> {
        await this.client.delete(`/ligas/${ligaId}/fases-finales/${faseId}`);
    }
}

export const fasesFinalApi = new FasesFinalApi();
