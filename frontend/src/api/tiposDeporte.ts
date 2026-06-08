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
import { type TipoDeporte } from '../types/liga';

class TiposDeporteApi extends ApiClient {
    async getAll() {
        const response = await this.client.get<TipoDeporte[]>('/tipos-deporte/');
        return response.data;
    }

    async getById(id: number) {
        const response = await this.client.get<TipoDeporte>(`/tipos-deporte/${id}`);
        return response.data;
    }
    async delete(id: number) {
        await this.client.delete(`/tipos-deporte/${id}`);
    }
}

export const tiposDeporteApi = new TiposDeporteApi();
