/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ChevronRight, GraduationCap, Hash, Key, Lock, ShieldCheck, Trophy, User, Zap } from 'lucide-react';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import { APP_BUILD_INFO } from '@/lib/appBuild';
import { getOidcStartUrl, isAuthentikEnabled } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QuickTile = {
    to: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    toneGlow: string;
    toneBorder: string;
    toneTopBorder: string;
    toneIcon: string;
    toneText: string;
};

const QUICK_TILES: QuickTile[] = [
    {
        to: '/partido',
        icon: <Key className="h-5 w-5" />,
        title: 'Partido con PIN',
        desc: 'Gestiona tu partido con el PIN de 6 dígitos que te dio el docente',
        toneGlow: 'from-sky/18 via-transparent to-transparent',
        toneBorder: 'border-sky/30 hover:border-sky/55',
        toneTopBorder: 'border-t-sky/55',
        toneIcon: 'border-sky/35 bg-sky/12 text-sky',
        toneText: 'text-sky',
    },
    {
        to: '/pin',
        icon: <Hash className="h-5 w-5" />,
        title: 'Portal de liga',
        desc: 'Accede al portal de tu equipo con el PIN de liga',
        toneGlow: 'from-mint/18 via-transparent to-transparent',
        toneBorder: 'border-mint/30 hover:border-mint/55',
        toneTopBorder: 'border-t-mint/55',
        toneIcon: 'border-mint/35 bg-mint/12 text-mint',
        toneText: 'text-mint',
    },
    {
        to: '/express',
        icon: <Zap className="h-5 w-5" />,
        title: 'Marcador Express',
        desc: 'Marcador rápido sin cuenta ni registro',
        toneGlow: 'from-amber-300/18 via-transparent to-transparent',
        toneBorder: 'border-amber-300/30 hover:border-amber-300/55',
        toneTopBorder: 'border-t-amber-300/55',
        toneIcon: 'border-amber-300/35 bg-amber-300/12 text-amber-300',
        toneText: 'text-amber-300',
    },
    {
        to: '/proponer-deporte',
        icon: <Trophy className="h-5 w-5" />,
        title: 'Proponer deporte',
        desc: 'Sugiere un deporte para añadirlo al catálogo',
        toneGlow: 'from-vio/18 via-transparent to-transparent',
        toneBorder: 'border-vio/30 hover:border-vio/55',
        toneTopBorder: 'border-t-vio/55',
        toneIcon: 'border-vio/35 bg-vio/12 text-vio',
        toneText: 'text-vio',
    },
];

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isLoading, error, clearError } = useAuthStore();
    const ssoEnabled = isAuthentikEnabled();
    const authError = searchParams.get('authError');
    const visibleError = error || authError;

    const [codigo, setCodigo] = useState('');
    const [password, setPassword] = useState('');
    const [showForm] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        try {
            await login(codigo, password);
            navigate('/ligas');
        } catch {
            // Error gestionado por el store
        }
    };

    return (
        <div className="lme-body min-h-screen flex flex-col">
            <div className="lme-gradient" />

            <nav className="sticky top-0 z-10 flex items-center justify-end px-4 py-3">
                <AccessibilityMenu />
            </nav>

            <main className="lme-main flex-grow flex flex-col items-center justify-center px-4 py-8">

                {/* Logos y título */}
                <div className="mb-10 flex items-center gap-5">
                    <img
                        src="/edumind_logo.png"
                        alt="EDUmind"
                        className="h-20 w-20 rounded-2xl object-cover shadow-[0_8px_24px_rgba(3,10,28,0.5)]"
                    />
                    <div className="text-center">
                        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-sub">Los Mundos Edufis</p>
                        <h1 className="text-3xl font-bold tracking-tight text-ink">Liga EDUmind</h1>
                    </div>
                    <img
                        src="/liga_logo_oficial.png"
                        alt="Logo Liga EDUmind"
                        className="h-20 w-20 rounded-2xl object-cover shadow-[0_8px_24px_rgba(3,10,28,0.5)]"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>

                <div className="w-full max-w-4xl grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">

                    {/* ── Columna izquierda: Docente ── */}
                    <Card className="border-t-2 border-lme-border/80 border-t-vio/50 bg-[rgba(10,20,38,0.80)] shadow-[0_20px_48px_rgba(3,10,28,0.28)]">
                        <CardHeader className="pb-4">
                            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-sub">Acceso docente</p>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <GraduationCap className="h-5 w-5 text-vio" />
                                Iniciar sesión
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {visibleError && (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300" role="alert">
                                    {visibleError}
                                </div>
                            )}

                            {/* Authentik SSO — acción principal */}
                            {ssoEnabled && (
                                <a
                                    href={getOidcStartUrl('/ligas')}
                                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-vio px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(142,121,255,0.35)] transition-all hover:bg-vio/90 hover:shadow-[0_6px_20px_rgba(142,121,255,0.45)] active:scale-[0.98]"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    Acceder con EDUmind
                                    <span className="ml-auto rounded-md bg-white/20 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider">SSO</span>
                                </a>
                            )}

                            {/* Separador */}
                            <div className="relative flex items-center gap-3">
                                <div className="h-px flex-1 bg-lme-border/50" />
                                <span className="text-[0.7rem] uppercase tracking-widest text-sub">o con email / contraseña</span>
                                <div className="h-px flex-1 bg-lme-border/50" />
                            </div>

                            {/* Formulario clásico */}
                            {showForm && (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label htmlFor="codigo" className="flex items-center gap-1.5 text-xs font-medium text-sub">
                                            <User className="h-3.5 w-3.5" />
                                            Usuario o email
                                        </label>
                                        <input
                                            id="codigo"
                                            type="text"
                                            className="form-control"
                                            placeholder="Ej. docente23 o tu@email.com"
                                            required
                                            value={codigo}
                                            onChange={(e) => { clearError(); setCodigo(e.target.value); }}
                                            autoComplete="username"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="password" className="flex items-center gap-1.5 text-xs font-medium text-sub">
                                                <Lock className="h-3.5 w-3.5" />
                                                Contraseña
                                            </label>
                                            <Link to="/forgot-password" className="text-xs text-sky hover:underline">
                                                ¿Olvidaste la contraseña?
                                            </Link>
                                        </div>
                                        <input
                                            id="password"
                                            type="password"
                                            className="form-control"
                                            placeholder="••••••••"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                        />
                                    </div>

                                    <Button type="submit" disabled={isLoading} variant="outline" className="w-full">
                                        {isLoading ? 'Accediendo...' : 'Iniciar sesión'}
                                    </Button>
                                </form>
                            )}

                            <p className="text-center text-xs text-sub">
                                ¿Sin cuenta?{' '}
                                <Link to="/register" className="font-semibold text-sky hover:underline">
                                    Regístrate aquí
                                </Link>
                            </p>
                        </CardContent>
                    </Card>

                    {/* ── Columna derecha: Accesos rápidos ── */}
                    <div className="flex h-full flex-col gap-3">
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-sub">Acceso directo · sin cuenta</p>

                        <div className="flex-1 grid grid-cols-2 gap-3 content-stretch">
                            {QUICK_TILES.map((tile) => (
                                <Link
                                    key={tile.to}
                                    to={tile.to}
                                    className={cn(
                                        'group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-t-2 bg-[rgba(10,20,38,0.74)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(3,10,28,0.28)]',
                                        tile.toneBorder,
                                        tile.toneTopBorder,
                                    )}
                                >
                                    {/* Glow de fondo */}
                                    <div className={cn('absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-80', tile.toneGlow)} />
                                    {/* Icono */}
                                    <div className={cn('relative w-fit rounded-lg border p-2', tile.toneIcon)}>
                                        {tile.icon}
                                    </div>
                                    {/* Texto */}
                                    <div className="relative flex-1">
                                        <p className={cn('text-sm font-bold', tile.toneText)}>{tile.title}</p>
                                        <p className="mt-0.5 text-xs leading-snug text-sub/80">{tile.desc}</p>
                                    </div>
                                    {/* Affordance de navegación */}
                                    <div className="relative flex justify-end">
                                        <ChevronRight className={cn('h-3.5 w-3.5 opacity-50 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5', tile.toneText)} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-5 text-center text-xs text-sub/50">
                <span>Liga EDUmind {APP_BUILD_INFO.version}</span>
                <span className="mx-2">·</span>
                <Link to="/privacidad" className="hover:text-sub transition-colors">Privacidad</Link>
                <span className="mx-2">·</span>
                <a href="mailto:contacto@edumind.es" className="hover:text-sub transition-colors">Contacto</a>
            </footer>
        </div>
    );
}
