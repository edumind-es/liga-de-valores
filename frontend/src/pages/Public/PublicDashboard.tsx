/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuna
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { publicApi } from '@/api/public';
import { clearStoredPublicToken, getStoredPublicToken } from '@/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, ListChecks, Trophy, Users } from 'lucide-react';
import type { Liga, ClasificacionItem } from '@/types/liga';
import { PageHeader } from '@/components/layout/PageHeader';

interface PartidoPublic {
    id: number;
    equipo_local_id: number;
    equipo_visitante_id: number;
    puntos_local: number;
    puntos_visitante: number;
    marcador_local?: number;
    marcador_visitante?: number;
    finalizado: boolean;
}

interface JornadaPublic {
    id: number;
    nombre: string;
    fecha_inicio: string;
    partidos: PartidoPublic[];
}

const FALLBACK_DESCRIPTION = 'Consulta clasificacion, calendario y resultados de esta liga escolar.';

function formatPublicDate(value?: string) {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

export default function PublicDashboard() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const navigate = useNavigate();

    const [liga, setLiga] = useState<Liga | null>(null);
    const [clasificacion, setClasificacion] = useState<ClasificacionItem[]>([]);
    const [jornadas, setJornadas] = useState<JornadaPublic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const numericLigaId = ligaId ? Number.parseInt(ligaId, 10) : NaN;

    const loadData = useCallback(async (id: number) => {
        const token = getStoredPublicToken(id);
        if (!token) {
            navigate(`/public/${id}/login`);
            return;
        }

        try {
            const [ligaData, clasData, jornadasData] = await Promise.all([
                publicApi.getLiga(id, token),
                publicApi.getClasificacion(id, token),
                publicApi.getJornadas(id, token),
            ]);
            setLiga(ligaData);
            setClasificacion(clasData.clasificacion);
            setJornadas(jornadasData);
        } catch {
            clearStoredPublicToken(id);
            navigate(`/public/${id}/login`);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!Number.isFinite(numericLigaId) || numericLigaId <= 0) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        void loadData(numericLigaId);
    }, [numericLigaId, loadData]);

    const teamsById = useMemo(
        () => new Map(clasificacion.map((item) => [item.equipo_id, item.equipo_nombre])),
        [clasificacion]
    );

    const totalPartidos = useMemo(
        () => jornadas.reduce((total, jornada) => total + jornada.partidos.length, 0),
        [jornadas]
    );

    const partidosFinalizados = useMemo(
        () => jornadas.reduce(
            (total, jornada) => total + jornada.partidos.filter((partido) => partido.finalizado).length,
            0
        ),
        [jornadas]
    );

    const stats = useMemo(() => [
        {
            label: 'Equipos',
            value: clasificacion.length,
            description: 'Participantes clasificados',
            icon: Users,
        },
        {
            label: 'Jornadas',
            value: jornadas.length,
            description: 'Bloques de calendario',
            icon: Calendar,
        },
        {
            label: 'Partidos',
            value: totalPartidos,
            description: 'Encuentros registrados',
            icon: ListChecks,
        },
        {
            label: 'Finalizados',
            value: partidosFinalizados,
            description: 'Resultados cerrados',
            icon: Trophy,
        },
    ], [clasificacion.length, jornadas.length, totalPartidos, partidosFinalizados]);

    if (isLoading) {
        return (
            <div className="editorial-page space-y-6">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
                <Skeleton className="h-[24rem] w-full rounded-xl" />
            </div>
        );
    }

    if (!liga) {
        return (
            <Card variant="editorial" className="editorial-card border-red-400/40 bg-red-500/10">
                <CardContent className="space-y-4 pt-6">
                    <p className="font-semibold text-red-900">No se pudo cargar la liga publica.</p>
                    <Button asChild variant="editorialOutline" className="border-red-300 text-red-900 hover:bg-red-100">
                        <Link to="/pin">Volver a acceso por PIN</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="editorial-page space-y-6">
            <PageHeader
                title={liga.nombre}
                description={liga.descripcion || FALLBACK_DESCRIPTION}
                eyebrow="Seguimiento publico"
            >
                {liga.temporada && (
                    <Badge
                        variant="outline"
                        className="border-[#a8bfdf] bg-[#edf4ff] text-[#254372]"
                    >
                        Temporada {liga.temporada}
                    </Badge>
                )}
                <Badge
                    variant={liga.modo_evaluacion === 'personalizado' ? 'accent' : 'secondary'}
                    className={liga.modo_evaluacion === 'personalizado' ? '' : 'border-[#b7c9e5] bg-[#eef3fb] text-[#3e5983]'}
                >
                    {liga.modo_evaluacion === 'personalizado' ? 'Evaluacion personalizada' : 'Evaluacion clasica'}
                </Badge>
                <Button
                    asChild
                    variant="editorialOutline"
                    size="sm"
                >
                    <Link to="/pin">
                        <ArrowLeft className="h-4 w-4" />
                        Cambiar PIN
                    </Link>
                </Button>
            </PageHeader>

            <Card variant="editorial" className="editorial-card">
                <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-[var(--editorial-border)] bg-[color-mix(in_srgb,var(--editorial-card)_90%,white_10%)] p-4"
                        >
                            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]">
                                <span>{item.label}</span>
                                <item.icon className="h-4 w-4 text-[#3c659f]" aria-hidden="true" />
                            </p>
                            <p className="mt-2 text-3xl font-bold text-[var(--editorial-ink)]">{item.value}</p>
                            <p className="mt-1 text-xs text-[var(--editorial-muted)]">{item.description}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Tabs defaultValue="clasificacion" className="space-y-4">
                <TabsList
                    variant="editorial"
                    className="grid h-auto w-full grid-cols-1 gap-2 rounded-xl sm:grid-cols-2"
                    aria-label="Vistas publicas de la liga"
                >
                    <TabsTrigger
                        variant="editorial"
                        value="clasificacion"
                        className="h-auto min-h-[2.5rem] gap-2 text-xs sm:text-sm"
                    >
                        <Trophy className="h-4 w-4" />
                        Clasificacion
                    </TabsTrigger>
                    <TabsTrigger
                        variant="editorial"
                        value="jornadas"
                        className="h-auto min-h-[2.5rem] gap-2 text-xs sm:text-sm"
                    >
                        <Calendar className="h-4 w-4" />
                        Calendario
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="clasificacion" className="space-y-4">
                    <Card variant="editorial" className="editorial-card overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-[var(--editorial-ink)]">Tabla de clasificacion</CardTitle>
                            <CardDescription className="text-[var(--editorial-muted)]">
                                Ranking combinado de puntos deportivos y educativos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {clasificacion.length === 0 ? (
                                <div className="p-6">
                                    <p className="text-sm text-[var(--editorial-muted)]">
                                        Aun no hay datos de clasificacion disponibles.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table variant="editorial">
                                        <TableHeader>
                                            <TableRow className="border-[var(--editorial-border)] bg-[rgba(74,132,255,0.08)]">
                                                <TableHead className="w-[62px] text-center text-[#294b7c]">Pos</TableHead>
                                                <TableHead className="text-[#294b7c]">Equipo</TableHead>
                                                <TableHead className="text-center text-[#294b7c]">PJ</TableHead>
                                                <TableHead className="text-center text-[#294b7c]">Dep</TableHead>
                                                <TableHead className="text-center text-[#294b7c]">Edu</TableHead>
                                                <TableHead className="text-center text-[#294b7c]">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clasificacion.map((equipo) => (
                                                <TableRow key={equipo.equipo_id} className="border-[var(--editorial-border)]">
                                                    <TableCell className="text-center font-semibold text-[var(--editorial-ink)]">
                                                        {equipo.posicion}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-[var(--editorial-ink)]">
                                                        {equipo.equipo_nombre}
                                                    </TableCell>
                                                    <TableCell className="text-center text-[var(--editorial-muted)]">
                                                        {equipo.partidos_jugados}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-[#2b5e9e]">
                                                        {equipo.puntos_deportivos}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-[#2f7a5f]">
                                                        {equipo.puntos_educativos_total}
                                                    </TableCell>
                                                    <TableCell className="text-center text-base font-black text-[#234c91]">
                                                        {equipo.puntos_totales}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="jornadas" className="space-y-4">
                    {jornadas.length === 0 ? (
                        <Card variant="editorial" className="editorial-card">
                            <CardContent className="pt-6">
                                <p className="text-sm text-[var(--editorial-muted)]">
                                    Aun no hay jornadas publicadas para esta liga.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {jornadas.map((jornada) => {
                                const partidosJornadaFinalizados = jornada.partidos.filter((partido) => partido.finalizado).length;

                                return (
                                    <Card key={jornada.id} variant="editorial" className="editorial-card">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-start justify-between gap-2 text-base">
                                                <span className="text-[var(--editorial-ink)]">{jornada.nombre}</span>
                                                <Badge
                                                    variant="outline"
                                                    className="border-[#a9bfdc] bg-[#edf4ff] text-[#2f4f7f]"
                                                >
                                                    {formatPublicDate(jornada.fecha_inicio)}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="text-[var(--editorial-muted)]">
                                                {partidosJornadaFinalizados}/{jornada.partidos.length} partidos finalizados
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {jornada.partidos.length === 0 ? (
                                                <p className="text-sm text-[var(--editorial-muted)]">Sin partidos programados.</p>
                                            ) : (
                                                jornada.partidos.map((partido) => (
                                                    <div
                                                        key={partido.id}
                                                        className="space-y-2 rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-card)] p-3"
                                                    >
                                                        <div className="flex items-start justify-between gap-2 text-sm">
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-[var(--editorial-ink)]">
                                                                    {teamsById.get(partido.equipo_local_id) || `Equipo ${partido.equipo_local_id}`}
                                                                </p>
                                                                <p className="truncate text-xs text-[var(--editorial-muted)]">
                                                                    vs {teamsById.get(partido.equipo_visitante_id) || `Equipo ${partido.equipo_visitante_id}`}
                                                                </p>
                                                            </div>
                                                            <Badge
                                                                variant={partido.finalizado ? 'success' : 'secondary'}
                                                                className="whitespace-nowrap"
                                                            >
                                                                {partido.finalizado ? 'Finalizado' : 'Pendiente'}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex items-center justify-between rounded-md border border-[var(--editorial-border)] bg-[rgba(74,132,255,0.08)] px-2 py-1.5">
                                                            <span className="flex items-center gap-1 text-xs text-[var(--editorial-muted)]">
                                                                <ListChecks className="h-3.5 w-3.5" />
                                                                Marcador
                                                            </span>
                                                            <span className="font-semibold text-[var(--editorial-ink)]">
                                                                {partido.finalizado
                                                                    ? `${partido.marcador_local ?? partido.puntos_local} - ${partido.marcador_visitante ?? partido.puntos_visitante}`
                                                                    : 'Pendiente'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Card variant="editorial" className="editorial-card">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                    <div className="flex items-center gap-2 text-sm text-[var(--editorial-muted)]">
                        <Users className="h-4 w-4" />
                        Acceso publico de solo lectura para alumnado y familias.
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            asChild
                            variant="editorialOutline"
                        >
                            <Link to={`/public/${liga.id}/fichas/generar`}>
                                Generar fichas
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="editorialOutline"
                        >
                            <Link to="/pin">Volver a acceso por PIN</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
