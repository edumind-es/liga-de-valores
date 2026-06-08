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

import { create } from 'zustand';
import axios from 'axios';
import { apiClient, clearStoredTokens, restoreCurrentUserSession } from '@/api/client';
import { clearOfflineData } from '@/lib/offline/offlineDB';
import { queryClient } from '@/lib/react-query';
import { type User } from '@/types/auth';
import { getErrorMessage } from '@/utils/apiUtils';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (codigo: string, password: string) => Promise<void>;
    register: (codigo: string, email: string, password: string, aceptaPrivacidad: boolean) => Promise<void>;
    logout: () => void;
    expireSession: () => void;
    fetchCurrentUser: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (codigo, password) => {
        set({ isLoading: true, error: null });
        try {
            await apiClient.login(codigo, password);
            const user = await apiClient.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({
                error: getErrorMessage(error),
                isLoading: false
            });
            throw error;
        }
    },

    register: async (codigo, email, password, aceptaPrivacidad) => {
        set({ isLoading: true, error: null });
        try {
            await apiClient.register(codigo, email, password, aceptaPrivacidad);
            // Auto-login after registration
            await apiClient.login(codigo, password);
            const user = await apiClient.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({
                error: getErrorMessage(error),
                isLoading: false
            });
            throw error;
        }
    },

    logout: () => {
        void apiClient.logout();
        void clearOfflineData();
        queryClient.clear();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    },

    expireSession: () => {
        clearStoredTokens();
        queryClient.clear();
        set({ user: null, isAuthenticated: false, isLoading: false });
    },

    fetchCurrentUser: async () => {
        set({ isLoading: true });
        try {
            const user = await apiClient.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401 || status === 403) {
                const restoredUser = await restoreCurrentUserSession<User>();
                if (restoredUser) {
                    set({ user: restoredUser, isAuthenticated: true, isLoading: false, error: null });
                    return;
                }
                clearStoredTokens();
                set({ user: null, isAuthenticated: false, isLoading: false });
                return;
            }

            // Keep previous auth state on transient network/runtime errors.
            set((state) => ({ ...state, isLoading: false }));
        }
    },

    clearError: () => set({ error: null }),
}));
