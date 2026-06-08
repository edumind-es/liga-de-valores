/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuna
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, ShieldCheck, Users } from 'lucide-react';
import { publicApi } from '@/api/public';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { setStoredPublicToken } from '@/api/client';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';

export default function PinAccess() {
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const normalizedPin = pin.trim();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (normalizedPin.length !== 6) return;

        setIsLoading(true);
        try {
            const { liga_id } = await publicApi.findByPin(normalizedPin);

            try {
                const response = await publicApi.login(liga_id, normalizedPin);
                setStoredPublicToken(liga_id, response.access_token);
                toast.success('Liga encontrada. Accediendo...');
                navigate(`/public/${liga_id}/dashboard`);
            } catch {
                navigate(`/public/${liga_id}/login`);
            }
        } catch {
            toast.error('PIN no valido o liga no activa');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PublicEditorialShell
            title="Acceso por PIN"
            description="Accede de forma rapida a clasificacion y jornadas para alumnado, familias y seguimiento de aula."
            eyebrow="Acceso publico protegido"
            actions={(
                <Button
                    asChild
                    variant="editorialOutline"
                >
                    <Link to="/wiki-juegos">Explorar wiki de juegos</Link>
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
                                <CardTitle className="text-2xl text-[var(--editorial-ink)]">Identificacion de liga</CardTitle>
                                <CardDescription className="text-[var(--editorial-muted)]">
                                    Introduce el codigo PIN para abrir el panel publico de una liga concreta.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="public-pin" className="text-sm font-semibold text-[var(--editorial-ink)]">
                                    PIN de liga
                                </label>
                                <Input
                                    id="public-pin"
                                    type="password"
                                    placeholder="••••••"
                                    className="h-14 rounded-xl border-[#9bb4dc] bg-[#f5f8ff] text-center text-3xl tracking-[0.5em] text-[#173760] placeholder:text-[#7e93b7]"
                                    maxLength={6}
                                    value={pin}
                                    autoComplete="one-time-code"
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\s+/g, '').slice(0, 6);
                                        setPin(value);
                                    }}
                                    required
                                />
                                <p className="text-sm text-[var(--editorial-muted)]">
                                    Solicita este codigo al profesorado responsable de la liga.
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
                                        Buscando liga...
                                    </>
                                ) : (
                                    <>
                                        Entrar al panel publico
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <div className="rounded-lg border border-[#bfd0ea] bg-[#eef4ff] px-3 py-2 text-sm text-[#2d4f7f]">
                                Si el PIN es valido, accedes al tablero de clasificacion y calendario en modo solo lectura.
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card variant="editorial" className="editorial-card h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg text-[var(--editorial-ink)]">Como funciona</CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Flujo simple para consultas rapidas en clase o en casa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-[var(--editorial-ink)]">
                        <div className="flex items-start gap-2 rounded-lg border border-[var(--editorial-border)] bg-[#f8fbff] px-3 py-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#2b5f99]" aria-hidden="true" />
                            <span>PIN de 6 caracteres asociado a una liga activa.</span>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-[var(--editorial-border)] bg-[#f8fbff] px-3 py-2">
                            <Users className="mt-0.5 h-4 w-4 text-[#2b5f99]" aria-hidden="true" />
                            <span>Acceso publico de alumnado y familias sin editar datos.</span>
                        </div>
                        <div className="rounded-lg border border-[#bfd0ea] bg-[#edf4ff] px-3 py-2 text-[#2b4f80]">
                            Si no recuerdas el PIN, solicita asistencia al docente o al centro.
                        </div>
                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-center text-[#315b95] hover:bg-[#dce9ff] hover:text-[#1e3f6c]"
                        >
                            <Link to="/faq">Necesitas ayuda de acceso?</Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </PublicEditorialShell>
    );
}
