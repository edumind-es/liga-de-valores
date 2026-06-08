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

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearOfflineData } from '@/lib/offline/offlineDB';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    isRecovering: boolean;
}

const AUTO_RECOVERY_KEY = 'edumind:auto-recover:v1';
const AUTO_RECOVERY_COOLDOWN_MS = 2 * 60 * 1000;

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        isRecovering: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, isRecovering: false };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.tryAutoRecover(error);
    }

    private handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    private hardReload = () => {
        const reloadNow = () => {
            const url = new URL(window.location.href);
            url.searchParams.set('app_reload', Date.now().toString());
            window.location.replace(url.toString());
        };

        if (!('serviceWorker' in navigator)) {
            reloadNow();
            return;
        }

        navigator.serviceWorker
            .getRegistrations()
            .then(async (registrations) => {
                await Promise.all(
                    registrations.map(async (registration) => {
                        try {
                            await registration.update();
                        } catch {
                            // Ignore update failures and continue with reload.
                        }
                        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                    })
                );
            })
            .catch(() => undefined)
            .finally(reloadNow);
    };

    private isRecoverableRuntimeError = (error: Error): boolean => {
        const raw = `${error?.message ?? ''} ${error?.stack ?? ''}`.toLowerCase();
        return (
            raw.includes('minified react error #310') ||
            raw.includes('chunkloaderror') ||
            raw.includes('loading chunk') ||
            raw.includes('failed to fetch dynamically imported module') ||
            raw.includes('importing a module script failed') ||
            raw.includes('error loading module script')
        );
    };

    private tryAutoRecover = (error: Error): void => {
        if (!this.isRecoverableRuntimeError(error)) return;

        try {
            const now = Date.now();
            const lastRecoverRaw = window.sessionStorage.getItem(AUTO_RECOVERY_KEY);
            const lastRecoverAt = lastRecoverRaw ? Number(lastRecoverRaw) : 0;
            if (Number.isFinite(lastRecoverAt) && now - lastRecoverAt < AUTO_RECOVERY_COOLDOWN_MS) {
                return;
            }
            window.sessionStorage.setItem(AUTO_RECOVERY_KEY, String(now));
            this.setState({ isRecovering: true }, () => this.hardReload());
        } catch {
            // If storage is unavailable, keep default fallback UI.
        }
    };

    private handleReload = () => {
        this.setState({ isRecovering: true });
        this.hardReload();
    };

    private handleFactoryReset = async () => {
        const confirmed = window.confirm(
            'Esta acción borrará caché y datos offline guardados en este navegador. ¿Continuar?'
        );
        if (!confirmed) return;

        this.setState({ isRecovering: true });
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));
            }
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
            }
            await clearOfflineData();
        } catch (recoveryError) {
            console.error('Error limpiando cache de la app:', recoveryError);
        } finally {
            this.hardReload();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.state.isRecovering) {
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
                            <h1 className="text-xl font-bold text-blue-700 mb-2">Recuperando la app</h1>
                            <p className="text-gray-600">Se está aplicando una recarga segura para restablecer la sesión.</p>
                        </div>
                    </div>
                );
            }
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-red-100">
                        <h1 className="text-xl font-bold text-red-600 mb-4">Algo salió mal</h1>
                        <p className="text-gray-600 mb-4">Se ha producido un error inesperado.</p>
                        <div className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs font-mono text-red-800 mb-6">
                            {this.state.error?.message}
                            {this.state.error?.stack && (
                                <div className="mt-2 opacity-50">
                                    {this.state.error.stack.slice(0, 300)}...
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={this.handleReload}
                                disabled={this.state.isRecovering}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                            >
                                {this.state.isRecovering ? 'Recargando...' : 'Recargar app (mantener datos offline)'}
                            </button>
                            <button
                                onClick={this.handleFactoryReset}
                                disabled={this.state.isRecovering}
                                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                                {this.state.isRecovering ? 'Restableciendo...' : 'Restablecer caché (borra datos offline)'}
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Volver al inicio
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
