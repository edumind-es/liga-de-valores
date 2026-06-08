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

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeft,
    Award,
    Medal,
    ShieldCheck,
    Star,
    ThumbsUp,
    Trophy,
    Users,
    Zap,
} from 'lucide-react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { equiposApi } from '@/api/equipos';
import type { EquipoBadge, EquipoStatsHistoryItem } from '@/api/equipos';
import { ligasApi } from '@/api/ligas';
import { type Equipo, type Liga } from '@/types/liga';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/workspace/MetricCard';
import { ValuesRadarChart } from '@/components/charts/ValuesRadarChart';
import { PointsEvolutionChart } from '@/components/charts/PointsEvolutionChart';

const BADGE_ICONS: Record<string, LucideIcon> = {
    award: Award,
    medal: Medal,
    shieldcheck: ShieldCheck,
    star: Star,
    thumbsup: ThumbsUp,
    trophy: Trophy,
    users: Users,
    zap: Zap,
};

const resolveBadgeIcon = (name?: string): LucideIcon => {
    if (!name) return Award;
    const normalized = name.replace(/[\s_-]/g, '').toLowerCase();
    return BADGE_ICONS[normalized] ?? Award;
};

export default function EquipoAnalytics() {
    const { ligaId, equipoId } = useParams<{ ligaId: string; equipoId: string }>();
    const [liga, setLiga] = useState<Liga | null>(null);
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const [history, setHistory] = useState<EquipoStatsHistoryItem[]>([]);
    const [badges, setBadges] = useState<EquipoBadge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (ligaId && equipoId) {
            void loadData(parseInt(ligaId, 10), parseInt(equipoId, 10));
        }
    }, [ligaId, equipoId]);

    const loadData = async (lId: number, eId: number) => {
        try {
            const [ligaData, equipoData, historyData, badgesData] = await Promise.all([
                ligasApi.getById(lId),
                equiposApi.getById(eId),
                equiposApi.getStatsHistory(eId),
                equiposApi.getBadges(eId),
            ]);
            setLiga(ligaData);
            setEquipo(equipoData);
            setHistory(historyData);
            setBadges(badgesData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8 p-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-[340px] rounded-2xl" />
                    <Skeleton className="h-[340px] rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!liga || !equipo) return <div className="p-8 text-center">No encontrado</div>;

    const radarData = [
        { subject: 'Juego limpio', A: equipo.puntos_juego_limpio, fullMark: 150 },
        { subject: 'Arbitro', A: equipo.puntos_arbitro, fullMark: 150 },
        { subject: 'Grada', A: equipo.puntos_grada, fullMark: 150 },
    ];
    const sportsPoints = (equipo.ganados * 3) + (equipo.empatados * 2) + equipo.perdidos;
    const educationalPoints = equipo.puntos_juego_limpio + equipo.puntos_arbitro + equipo.puntos_grada;
    const totalMatches = equipo.ganados + equipo.empatados + equipo.perdidos;
    const barData = [
        {
            name: 'Actual',
            deportivos: sportsPoints,
            educativos: educationalPoints,
        },
    ];

    return (
        <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${ligaId}/equipos`}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Volver a equipos
                </Link>
            </Button>

            <PageHeader
                title={`Analitica: ${equipo.nombre}`}
                description="Desglose del rendimiento deportivo, educativo y evolutivo del equipo."
                eyebrow="Detalle de equipo"
            >
                <Badge variant="outline">{liga.nombre}</Badge>
                <Badge variant="secondary">{totalMatches} partidos</Badge>
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Puntos totales"
                    value={equipo.puntos_totales}
                    support="Acumulado global"
                    icon={Trophy}
                    tone="mint"
                />
                <MetricCard
                    label="Puntos deportivos"
                    value={sportsPoints}
                    support={`${equipo.ganados} victorias · ${equipo.empatados} empates`}
                    icon={Zap}
                    tone="sky"
                />
                <MetricCard
                    label="Puntos educativos"
                    value={educationalPoints}
                    support="Juego limpio, arbitro y grada"
                    icon={ShieldCheck}
                    tone="vio"
                />
                <MetricCard
                    label="Reconocimientos"
                    value={badges.length}
                    support="Medallas y distintivos"
                    icon={Award}
                    tone="amber"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                    <CardHeader className="border-b border-lme-border/70">
                        <CardTitle>Perfil de valores</CardTitle>
                        <CardDescription>Distribucion de puntos educativos por area.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ValuesRadarChart data={radarData} />
                    </CardContent>
                </Card>

                <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                    <CardHeader className="border-b border-lme-border/70">
                        <CardTitle>Composicion de puntos</CardTitle>
                        <CardDescription>Comparativa entre bloque deportivo y bloque educativo.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <PointsEvolutionChart data={barData} />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Evolucion por jornadas</CardTitle>
                    <CardDescription>Tendencia educativa del equipo a lo largo del calendario.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {history.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-lg font-semibold text-ink">Todavia no hay historial suficiente</p>
                            <p className="mt-2 text-sm text-sub">Cuando se jueguen y evalúen partidos, aparecerá aquí la evolución del equipo.</p>
                        </div>
                    ) : (
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,170,199,0.14)" vertical={false} />
                                    <XAxis
                                        dataKey="jornada"
                                        stroke="rgba(150,170,199,0.55)"
                                        tick={{ fill: '#d8e6ff', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="rgba(150,170,199,0.55)"
                                        tick={{ fill: '#d8e6ff', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(11,24,44,0.94)',
                                            border: '1px solid rgba(90,126,181,0.38)',
                                            borderRadius: '14px',
                                            color: '#f5fbff',
                                        }}
                                        labelStyle={{ color: '#f5fbff', fontWeight: 600 }}
                                        itemStyle={{ color: '#d8e6ff' }}
                                    />
                                    <Legend wrapperStyle={{ color: '#d8e6ff', paddingTop: '8px' }} />
                                    <Line type="monotone" dataKey="juego_limpio" stroke="#21d1b1" strokeWidth={2.5} name="Juego limpio" dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="grada" stroke="#fbbf24" strokeWidth={2.5} name="Grada" dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="arbitraje" stroke="#3c7dff" strokeWidth={2.5} name="Arbitraje" dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Desglose rapido</CardTitle>
                    <CardDescription>Lectura directa de resultados deportivos y educativos del equipo.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-lme-border/80 bg-[rgba(11,24,44,0.58)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sub">Juego limpio</p>
                        <p className="mt-3 text-3xl font-bold text-mint">{equipo.puntos_juego_limpio}</p>
                    </div>
                    <div className="rounded-2xl border border-lme-border/80 bg-[rgba(11,24,44,0.58)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sub">Arbitro</p>
                        <p className="mt-3 text-3xl font-bold text-sky">{equipo.puntos_arbitro}</p>
                    </div>
                    <div className="rounded-2xl border border-lme-border/80 bg-[rgba(11,24,44,0.58)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sub">Grada</p>
                        <p className="mt-3 text-3xl font-bold text-amber-200">{equipo.puntos_grada}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Medallero del equipo</CardTitle>
                    <CardDescription>Reconocimientos obtenidos por rendimiento y valores.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {badges.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-lg font-semibold text-ink">Aun no hay reconocimientos registrados</p>
                            <p className="mt-2 text-sm text-sub">Cuando el equipo desbloquee insignias aparecerán en esta sección.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {badges.map((badge) => {
                                const iconName = typeof badge.icon === 'string' ? badge.icon : undefined;
                                const IconComponent = resolveBadgeIcon(iconName);

                                return (
                                    <div
                                        key={badge.id}
                                        className="flex flex-col items-center rounded-2xl border border-lme-border/80 bg-[rgba(11,24,44,0.58)] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                    >
                                        <div className={`mb-3 rounded-full border border-white/10 bg-white/5 p-3 ${badge.color || ''}`}>
                                            <IconComponent className="h-7 w-7" />
                                        </div>
                                        <h4 className="font-bold text-ink">{badge.name}</h4>
                                        <p className="mt-1 text-xs leading-relaxed text-sub">{badge.description || 'Reconocimiento del equipo'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
