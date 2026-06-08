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

/// <reference types="vite/client" />
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const RAW_API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const API_URL = RAW_API_URL.endsWith('/api/v1') ? RAW_API_URL : `${RAW_API_URL}/api/v1`;
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const PUBLIC_TOKEN_PREFIX = 'public_token_';

let refreshPromise: Promise<boolean> | null = null;
let sessionEstablished = false;
const refreshClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

function inBrowser(): boolean {
    return typeof window !== 'undefined';
}

function notifyAuthExpired(): void {
    if (!inBrowser()) return;
    window.dispatchEvent(new CustomEvent('edumind:auth-expired'));
}

function getSessionStorage(): Storage | null {
    if (!inBrowser()) return null;
    return window.sessionStorage;
}

function getLocalStorage(): Storage | null {
    if (!inBrowser()) return null;
    return window.localStorage;
}

function removeTokenEverywhere(key: string): void {
    getSessionStorage()?.removeItem(key);
    getLocalStorage()?.removeItem(key);
}

function clearLegacyAuthStorage(): void {
    removeTokenEverywhere(ACCESS_TOKEN_KEY);
    removeTokenEverywhere(REFRESH_TOKEN_KEY);
}

function readTokenWithLegacyFallback(key: string): string | null {
    const sessionValue = getSessionStorage()?.getItem(key);
    if (sessionValue) {
        return sessionValue;
    }
    return getLocalStorage()?.getItem(key) ?? null;
}

function markSessionEstablished(): void {
    sessionEstablished = true;
}

function resetSessionState(): void {
    sessionEstablished = false;
    clearLegacyAuthStorage();
}

function isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return (
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout')
    );
}

function getRequestUrl(input: RequestInfo | URL): string | undefined {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    return undefined;
}

async function requestCurrentUserViaCookieSession<T = unknown>(): Promise<T> {
    const response = await refreshClient.get<T>('/auth/me');
    markSessionEstablished();
    return response.data;
}

export function clearStoredTokens(): void {
    resetSessionState();
}

export function isAuthentikEnabled(): boolean {
    return import.meta.env.VITE_AUTHENTIK_ENABLED === 'true';
}

export function getOidcStartUrl(nextPath: string = '/ligas'): string {
    const params = new URLSearchParams({ next: nextPath });
    return `${API_URL}/auth/oidc/start?${params.toString()}`;
}

export function getOidcLogoutUrl(nextPath: string = '/login'): string {
    const params = new URLSearchParams({ next: nextPath });
    return `${API_URL}/auth/oidc/logout?${params.toString()}`;
}

export function getStoredPublicToken(ligaId: string | number): string | null {
    return readTokenWithLegacyFallback(`${PUBLIC_TOKEN_PREFIX}${ligaId}`);
}

export function setStoredPublicToken(ligaId: string | number, token: string): void {
    if (!inBrowser()) return;
    const key = `${PUBLIC_TOKEN_PREFIX}${ligaId}`;
    getSessionStorage()?.setItem(key, token);
    getLocalStorage()?.removeItem(key);
}

export function clearStoredPublicToken(ligaId: string | number): void {
    removeTokenEverywhere(`${PUBLIC_TOKEN_PREFIX}${ligaId}`);
}

export async function refreshAuthenticatedSession(options: { notifyOnFailure?: boolean } = {}): Promise<boolean> {
    const { notifyOnFailure = true } = options;
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            await refreshClient.post('/auth/refresh');
            markSessionEstablished();
            clearLegacyAuthStorage();
            return true;
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            const authRejected = status === 400 || status === 401;

            if (authRejected) {
                const shouldNotify = notifyOnFailure && sessionEstablished;
                clearStoredTokens();
                if (shouldNotify) {
                    notifyAuthExpired();
                }
            }
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function restoreCurrentUserSession<T = unknown>(): Promise<T | null> {
    const refreshed = await refreshAuthenticatedSession({ notifyOnFailure: false });
    if (!refreshed) {
        return null;
    }

    try {
        return await requestCurrentUserViaCookieSession<T>();
    } catch {
        return null;
    }
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const requestUrl = getRequestUrl(input);
    const requestInit: RequestInit = {
        ...init,
        credentials: 'include',
    };

    const response = await fetch(input, requestInit);
    if (response.status !== 401 || isAuthEndpoint(requestUrl)) {
        return response;
    }

    const refreshed = await refreshAuthenticatedSession();
    if (!refreshed) {
        return response;
    }

    return fetch(input, requestInit);
}

export class ApiClient {
    public client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_URL,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Handle auth errors with silent token refresh and request retry.
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
                const authEndpointRequest = isAuthEndpoint(originalRequest?.url);

                if (
                    error.response?.status === 401 &&
                    originalRequest &&
                    !originalRequest._retry &&
                    !authEndpointRequest
                ) {
                    originalRequest._retry = true;
                    const refreshed = await refreshAuthenticatedSession();
                    if (refreshed) {
                        return this.client.request(originalRequest);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // Auth endpoints
    async register(codigo: string, email: string, password: string, aceptaPrivacidad: boolean) {
        const response = await this.client.post('/auth/register', {
            codigo,
            email: email.trim() || null, // Enviar null si está vacío para que el backend lo acepte
            password,
            acepta_privacidad: aceptaPrivacidad,
        });
        return response.data;
    }

    async login(codigo: string, password: string) {
        const response = await this.client.post('/auth/login', {
            codigo,
            password,
        });

        markSessionEstablished();
        clearLegacyAuthStorage();
        return response.data;
    }

    async getCurrentUser() {
        const response = await this.client.get('/auth/me');
        markSessionEstablished();
        return response.data;
    }

    async logout(options: { remote?: boolean } = {}) {
        const { remote = true } = options;
        try {
            if (remote) {
                await this.client.post('/auth/logout');
            }
        } finally {
            clearStoredTokens();
        }
    }

    // Admin: Sport Proposals
    async getSportProposals() {
        const response = await this.client.get('/sport-proposals/');
        return response.data;
    }

    async updateSportProposalStatus(id: number, status: string) {
        const response = await this.client.patch(`/sport-proposals/${id}`, { status });
        return response.data;
    }

    async changePassword(currentPassword: string, newPassword: string) {
        const response = await this.client.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
        return response.data;
    }

    async forgotPassword(identifier: string) {
        const response = await this.client.post('/auth/forgot-password', {
            identifier,
        });
        return response.data;
    }

    async resetPassword(token: string, newPassword: string) {
        const response = await this.client.post('/auth/reset-password', {
            token,
            new_password: newPassword,
        });
        return response.data;
    }

    // Admin: Create new sport type
    async createSportType(data: {
        nombre: string;
        codigo: string;
        tipo_marcador: string;
        permite_empate?: boolean;
        config?: Record<string, unknown>;
        descripcion?: string;
        icono?: string;
    }) {
        const response = await this.client.post('/tipos-deporte/', data);
        return response.data;
    }
}

if (inBrowser()) {
    clearLegacyAuthStorage();
}

export const apiClient = new ApiClient();
