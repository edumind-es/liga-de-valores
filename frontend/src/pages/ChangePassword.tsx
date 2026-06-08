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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { apiClient } from '@/api/client';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Lock, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ChangePassword() {
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword.length < 6) {
            setError("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Las contraseñas nuevas no coinciden.");
            return;
        }

        setIsLoading(true);

        try {
            await apiClient.changePassword(currentPassword, newPassword);
            setSuccess("Contraseña actualizada correctamente.");

            // Clear fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Redirect after a moment
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err: unknown) {
            console.error("Error changing password:", err);
            const detail = isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
                ? (err.response.data as { detail?: string }).detail
                : undefined;
            const msg = detail || "Error al cambiar la contraseña. Verifica tu contraseña actual.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-md mx-auto mt-10">
                <div className="rounded-xl border border-lme-border bg-[rgba(13,22,38,0.82)] p-6 shadow-glass backdrop-blur-xl md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-300">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-ink">Cambiar Contraseña</h1>
                    </div>

                    {error && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
                            <CheckCircle className="h-5 w-5 flex-shrink-0" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-sub">
                                Contraseña Actual
                            </label>
                            <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full rounded-lg border border-lme-border bg-[rgba(14,24,44,0.78)] px-3 py-2 text-ink outline-none transition-all placeholder:text-sub/70 focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-2">
                            <label className="mb-1 block text-sm font-medium text-sub">
                                Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full rounded-lg border border-lme-border bg-[rgba(14,24,44,0.78)] px-3 py-2 text-ink outline-none transition-all placeholder:text-sub/70 focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                            <p className="mt-1 text-xs text-sub">Mínimo 6 caracteres.</p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-sub">
                                Confirmar Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-lg border border-lme-border bg-[rgba(14,24,44,0.78)] px-3 py-2 text-ink outline-none transition-all placeholder:text-sub/70 focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="flex-1 rounded-lg border border-lme-border bg-white/5 px-4 py-2 text-sm font-medium text-sub focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-white/10 hover:text-ink"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
