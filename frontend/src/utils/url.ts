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

const RAW_API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export const getApiBaseUrl = (): string => {
    if (RAW_API_URL.endsWith('/api/v1')) {
        return RAW_API_URL;
    }
    return `${RAW_API_URL}/api/v1`;
};

export const buildApiUrl = (path: string = ''): string => {
    const baseUrl = getApiBaseUrl();
    if (!path) {
        return baseUrl;
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

export const getSiteBaseUrl = (): string => {
    return getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
};

export const getImageUrl = (path: string | undefined | null): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const baseUrl = getSiteBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${cleanPath}`;
};
