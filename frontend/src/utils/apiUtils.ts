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

import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown): string {
    if (!error) return 'Ha ocurrido un error desconocido';

    if (error instanceof AxiosError && error.response?.data) {
        const detail = error.response.data.detail;

        if (Array.isArray(detail)) {
            return detail.map((err: { msg: string }) => err.msg).join(', ');
        }

        // Handle simple string errors
        if (typeof detail === 'string') {
            return detail;
        }

        // Handle object errors (fallback)
        if (typeof detail === 'object') {
            return JSON.stringify(detail);
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
