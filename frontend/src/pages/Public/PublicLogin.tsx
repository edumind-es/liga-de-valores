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
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, ShieldCheck, Users } from 'lucide-react';
import { publicApi } from '@/api/public';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { setStoredPublicToken } from '@/api/client';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';

export default function PublicLogin() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const normalizedPin = pin.trim();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ligaId || normalizedPin.length !== 6) return;

        setIsLoading(true);
        try {
            const response = await publicApi.login(parseInt(ligaId, 10), normalizedPin);
            setStoredPublicToken(ligaId, response.access_token);
            toast.success('Acceso concedido');
            navigate(`/public/${ligaId}/dashboard`);
        } catch {
            toast.error('PIN incorrecto o acceso no habilitado');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PublicEditorialShell
            title="Verificacion de acceso"
            eyebrow="Acceso publico protegido"
            description="Introduce el PIN asociado a esta liga para abrir el panel publico con clasificacion, jornadas y seguimiento del grupo."
            actions={(
                <Button asChild variant="editorialOutline">
                    <Link to="/pin">Cambiar a acceso general por PIN</Link>
                </Button>
            )}
        >
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Card variant="editorial" className="editorial-card">
                    <CardHeader className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#a9c0e2] bg-[#e8f2ff]">
                                <Lock className="h-5 w-5 text-[#2b4f80]" aria-hidden="true" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl text-[var(--editorial-ink)]">Confirmar PIN de la liga</CardTitle>
                                <CardDescription className="text-[var(--editorial-muted)]">
                                    La liga {ligaId ? `#${ligaId}` : 'seleccionada'} requiere verificacion antes de mostrar los datos publicos.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="public-login-pin" className="text-sm font-semibold text-[var(--editorial-ink)]">
                                    PIN de acceso
                                </label>
                                <Input
                                    variant="editorial"
                                    id="public-login-pin"
                                    type="password"
                                    placeholder="••••••"
                                    className="h-14 text-center text-3xl tracking-[0.45em] font-mono"
                                    maxLength={6}
                                    value={pin}
                                    autoComplete="one-time-code"
                                    onChange={(e) => setPin(e.target.value.replace(/\s+/g, '').slice(0, 6))}
                                    required
                                />
                                <p className="text-sm text-[var(--editorial-muted)]">
                                    Usa el mismo PIN que facilitó el profesorado para esta liga.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={isLoading || normalizedPin.length !== 6}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Verificando acceso...
                                    </>
                                ) : (
                                    <>
                                        Entrar al panel publico
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <div className="rounded-lg border border-[#bfd0ea] bg-[#eef4ff] px-3 py-2 text-sm text-[#2d4f7f]">
                                Si el PIN es correcto, continuarás directamente al dashboard publico de la liga.
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card variant="editorial" className="editorial-card h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg text-[var(--editorial-ink)]">Antes de entrar</CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            El acceso mantiene el modo consulta para alumnado, familias y acompañamiento de aula.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-[var(--editorial-ink)]">
                        <div className="flex items-start gap-2 rounded-lg border border-[var(--editorial-border)] bg-[#f8fbff] px-3 py-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#2b5f99]" aria-hidden="true" />
                            <span>Sin edicion de datos sensibles ni acceso a la administracion docente.</span>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-[var(--editorial-border)] bg-[#f8fbff] px-3 py-2">
                            <Users className="mt-0.5 h-4 w-4 text-[#2b5f99]" aria-hidden="true" />
                            <span>Ideal para seguimiento de clase, familias y visualizacion compartida en aula.</span>
                        </div>
                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-center text-[#315b95] hover:bg-[#dce9ff] hover:text-[#1e3f6c]"
                        >
                            <Link to="/faq">Necesitas ayuda con el acceso?</Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </PublicEditorialShell>
    );
}
