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

export interface User {
    id: number;
    codigo: string;
    email: string | null;
    is_active: boolean;
    is_superuser: boolean;
    plan_code: string;
    plan_leagues_limit: number | null;
    grandfathered_unlimited: boolean;
    grandfathered_at: string | null;
    created_at: string;
    ligas_count?: number;
}

export interface LeagueCapacity {
    plan_code: string;
    plan_label: string;
    leagues_limit: number | null;
    leagues_used: number;
    leagues_remaining: number | null;
    can_create_league: boolean;
    grandfathered_unlimited: boolean;
    entitlement_source: string;
    grandfathering_cutoff: string;
}

export interface LoginCredentials {
    codigo: string;
    password: string;
}

export interface RegisterData {
    codigo: string;
    email?: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
}
