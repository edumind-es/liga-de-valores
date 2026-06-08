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

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    Check,
    Clock3,
    Share2,
    Shield,
    Trophy,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import SportAvatar from '@/components/SportAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ExpressMatch as ExpressMatchType, ExpressTeam } from '@/types/express';
import ScoreboardDisplay from './scoreboard/ScoreboardDisplay';

interface InitialMatchLoad {
    match: ExpressMatchType | null;
    error: string | null;
}

interface RoleCardData {
    key: ExpressTeam['rol'];
    label: string;
    support: string;
    value: string;
    accentClassName: string;
    cardClassName: string;
}

const loadInitialMatch = (matchId?: string): InitialMatchLoad => {
    if (!matchId) {
        return { match: null, error: 'Partido no encontrado' };
    }

    const sessionData = sessionStorage.getItem(`express_match_${matchId}`);
    if (sessionData) {
        try {
            return { match: JSON.parse(sessionData) as ExpressMatchType, error: null };
        } catch (err) {
            console.error('Error parsing match data:', err);
            return { match: null, error: 'Error al cargar el partido' };
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('d');
    if (!sharedData) {
        return { match: null, error: 'Partido no encontrado' };
    }

    try {
        const decoded = JSON.parse(atob(sharedData)) as ExpressMatchType;
        sessionStorage.setItem(`express_match_${matchId}`, JSON.stringify(decoded));
        return { match: decoded, error: null };
    } catch (err) {
        console.error('Error decoding shared match:', err);
        return { match: null, error: 'Enlace de partido inválido' };
    }
};

const ROLE_META: Record<ExpressTeam['rol'], Omit<RoleCardData, 'value' | 'key'>> = {
    local: {
        label: 'Equipo local',
        support: 'Compite y abre el partido',
        accentClassName: 'text-mint',
        cardClassName: 'border-mint/20 bg-mint/10',
    },
    visitante: {
        label: 'Equipo visitante',
        support: 'Compite como rival principal',
        accentClassName: 'text-sky',
        cardClassName: 'border-sky/20 bg-sky/10',
    },
    arbitro: {
        label: 'Arbitraje',
        support: 'Gestiona normas y decisiones',
        accentClassName: 'text-amber-300',
        cardClassName: 'border-amber-300/20 bg-amber-300/10',
    },
    grada_local: {
        label: 'Grada local',
        support: 'Acompaña al equipo local',
        accentClassName: 'text-vio',
        cardClassName: 'border-vio/20 bg-vio/10',
    },
    grada_visitante: {
        label: 'Grada visitante',
        support: 'Acompaña al equipo visitante',
        accentClassName: 'text-pink-300',
        cardClassName: 'border-pink-300/20 bg-pink-300/10',
    },
};

function formatMatchDate(value: string) {
    return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export default function ExpressMatch() {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const [initialLoad] = useState<InitialMatchLoad>(() => loadInitialMatch(matchId));
    const [match, setMatch] = useState<ExpressMatchType | null>(initialLoad.match);

    useEffect(() => {
        const { error } = initialLoad;
        if (error) {
            toast.error(error);
            navigate('/express');
        }
    }, [initialLoad, navigate]);

    const updateMarcador = (updates: Record<string, unknown>) => {
        if (!match) return;

        const updatedMatch = {
            ...match,
            marcador: { ...match.marcador, ...updates },
        };

        setMatch(updatedMatch);
        sessionStorage.setItem(`express_match_${match.id}`, JSON.stringify(updatedMatch));
    };

    const handleFinalizar = () => {
        if (!match) return;

        if (match.finalizado) {
            navigate(`/express/acta/${match.id}`);
            return;
        }

        const finalMatch = { ...match, finalizado: true };
        setMatch(finalMatch);
        sessionStorage.setItem(`express_match_${match.id}`, JSON.stringify(finalMatch));
        navigate(`/express/acta/${match.id}`);
    };

    const handleCompartir = async () => {
        if (!match) return;

        try {
            const encoded = btoa(JSON.stringify(match));
            const url = `${window.location.origin}/express/partido/${match.id}?d=${encoded}`;

            if (navigator.share) {
                await navigator.share({
                    title: `Partido: ${match.deporte.nombre}`,
                    text: 'Comparte este partido en vivo',
                    url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success('Enlace copiado al portapapeles');
            }
        } catch (err) {
            console.error('Error sharing:', err);
            toast.error('Error al compartir');
        }
    };

    const roleCards = useMemo<RoleCardData[]>(() => {
        if (!match) return [];

        return match.equipos.map((team) => ({
            key: team.rol,
            value: team.nombre,
            ...ROLE_META[team.rol],
        }));
    }, [match]);

    if (!match) {
        return null;
    }

    const localTeam = match.equipos.find((team) => team.rol === 'local');
    const visitanteTeam = match.equipos.find((team) => team.rol === 'visitante');
    const vtFile = match.deporte.vt_file;
    const finalizeLabel = match.finalizado ? 'Abrir acta final' : 'Finalizar partido';
    const finalizeSupport = match.finalizado
        ? 'El encuentro ya está cerrado y listo para revisar el acta.'
        : 'Cuando acabes el marcador, pasa directamente al acta para valorar juego limpio, arbitraje y grada.';

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#040614] via-[#0a0f24] to-[#040614] p-4 pb-32 lg:pb-6">
            <div className="mx-auto max-w-6xl space-y-6 py-6 sm:py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link to="/express" className="inline-flex items-center text-sm text-sub transition-colors hover:text-mint">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Volver
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        <AccessibilityMenu />
                        <Button variant="outline" size="sm" onClick={handleCompartir}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Compartir
                        </Button>
                    </div>
                </div>

                <Card variant="glass">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <SportAvatar nombre={match.deporte.nombre} logoFile={match.deporte.logo_file} className="h-20 w-20" />
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.18em] text-sub">Marcador exprés</p>
                                        <h1 className="mt-1 text-3xl font-bold text-ink">{match.deporte.nombre}</h1>
                                        <p className="mt-2 text-sm text-sub">{formatMatchDate(match.fecha)}</p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-lme-border bg-white/5 p-4">
                                    <p className="text-sm font-semibold text-ink">
                                        {match.finalizado ? 'Acta disponible' : 'Partido abierto'}
                                    </p>
                                    <p className="mt-1 text-sm text-sub">{finalizeSupport}</p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[30rem] xl:grid-cols-2">
                                <QuickStat
                                    icon={Trophy}
                                    label="Deporte"
                                    value={match.deporte.codigo}
                                    accentClassName="text-mint"
                                />
                                <QuickStat
                                    icon={Users}
                                    label="Roles activos"
                                    value={`${match.equipos.length} equipos asignados`}
                                    accentClassName="text-sky"
                                />
                                <QuickStat
                                    icon={Clock3}
                                    label="Duración"
                                    value={match.duracion ? `${match.duracion} min` : 'Sesión libre'}
                                    accentClassName="text-vio"
                                />
                                <QuickStat
                                    icon={Calendar}
                                    label="Apoyo"
                                    value={vtFile ? 'Visual Thinking activo' : 'Sin recurso adicional'}
                                    accentClassName="text-amber-300"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                    <Card variant="glass">
                        <CardContent className="p-4 text-center">
                            <div className="mb-1 text-sm text-sub">Local</div>
                            <div className="break-words text-xl font-bold text-mint">{localTeam?.nombre || 'Local'}</div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-center py-1 sm:py-0">
                        <div className="rounded-full border border-lme-border bg-white/5 px-4 py-2 text-sm font-bold tracking-[0.18em] text-sub">
                            VS
                        </div>
                    </div>

                    <Card variant="glass">
                        <CardContent className="p-4 text-center">
                            <div className="mb-1 text-sm text-sub">Visitante</div>
                            <div className="break-words text-xl font-bold text-sky">{visitanteTeam?.nombre || 'Visitante'}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card variant="glass">
                    <CardContent className="space-y-4 p-5 sm:p-6">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-ink">Mesa operativa del partido</h2>
                                <p className="text-sm text-sub">
                                    Revisa rápidamente quién compite y quién apoya antes de cerrar el marcador.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-lme-border bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-sub">
                                <Shield className="h-3.5 w-3.5 text-mint" />
                                Flujo listo para acta
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {roleCards.map((roleCard) => (
                                <div
                                    key={roleCard.key}
                                    className={`rounded-2xl border p-4 ${roleCard.cardClassName}`}
                                >
                                    <p className={`text-xs uppercase tracking-[0.12em] ${roleCard.accentClassName}`}>
                                        {roleCard.label}
                                    </p>
                                    <p className="mt-2 text-base font-semibold text-ink">{roleCard.value}</p>
                                    <p className="mt-1 text-sm text-sub">{roleCard.support}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass">
                    <CardContent className="p-4 sm:p-8">
                        <ScoreboardDisplay
                            tipo={match.deporte.tipo_marcador}
                            marcador={match.marcador}
                            config={match.deporte.config}
                            onUpdate={updateMarcador}
                            equipoLocalNombre={localTeam?.nombre}
                            equipoVisitanteNombre={visitanteTeam?.nombre}
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    {vtFile ? (
                        <a
                            href={vtFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl border border-paper/20 bg-paper/10 px-4 py-3 text-ink transition-all hover:border-mint/30 hover:bg-paper/20"
                        >
                            <BookOpen className="h-5 w-5 text-mint" />
                            <span>Ver reglas y apoyo visual del deporte</span>
                        </a>
                    ) : (
                        <div className="rounded-2xl border border-lme-border bg-white/5 px-4 py-3 text-sm text-sub">
                            Puedes cerrar el partido y completar el acta incluso sin recurso de Visual Thinking.
                        </div>
                    )}

                    <div className="hidden justify-end lg:flex">
                        <Button
                            size="lg"
                            onClick={handleFinalizar}
                            className="bg-gradient-to-r from-mint to-sky px-8"
                        >
                            <Check className="mr-2 h-5 w-5" />
                            {finalizeLabel}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 px-4 lg:hidden">
                <div className="mx-auto max-w-3xl rounded-3xl border border-lme-border bg-[rgba(8,14,30,0.92)] p-3 shadow-[0_22px_40px_rgba(3,10,28,0.35)] backdrop-blur-xl">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                                {localTeam?.nombre || 'Local'} vs {visitanteTeam?.nombre || 'Visitante'}
                            </p>
                            <p className="text-xs text-sub">
                                {match.finalizado ? 'El acta está lista para revisar.' : 'Cierra el marcador y pasa al acta.'}
                            </p>
                        </div>
                        <div className="rounded-full border border-lme-border bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-sub">
                            {match.finalizado ? 'Acta' : 'En juego'}
                        </div>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleFinalizar}
                        className="w-full bg-gradient-to-r from-mint to-sky"
                    >
                        <Check className="mr-2 h-5 w-5" />
                        {finalizeLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function QuickStat({
    icon: Icon,
    label,
    value,
    accentClassName,
}: {
    icon: typeof Trophy;
    label: string;
    value: string;
    accentClassName?: string;
}) {
    return (
        <div className="rounded-2xl border border-lme-border bg-white/5 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-sub">
                <Icon className={`h-4 w-4 ${accentClassName || ''}`} />
                {label}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
        </div>
    );
}
