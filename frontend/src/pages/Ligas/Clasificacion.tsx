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
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Medal, Trophy, UserCheck, Users } from 'lucide-react';
import { useClasificacion, useLiga } from '@/hooks/useLigas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { type ClasificacionItem } from '@/types/liga';
import EmptyState from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { ListToolbar } from '@/components/workspace/ListToolbar';
import { MetricCard } from '@/components/workspace/MetricCard';

export default function Clasificacion() {
    const { id } = useParams<{ id: string }>();
    const ligaId = id ? parseInt(id, 10) : 0;
    const [searchValue, setSearchValue] = useState('');

    const { data: liga, isLoading: isLoadingLiga } = useLiga(ligaId);
    const { data: clasificacionData, isLoading: isLoadingClasificacion } = useClasificacion(ligaId);

    if (isLoadingLiga || isLoadingClasificacion) {
        return (
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    if (!liga) return <div className="p-8 text-center text-red-500">Liga no encontrada</div>;

    const clasificacion = clasificacionData?.clasificacion || [];
    const filteredClasificacion = clasificacion.filter((equipo: ClasificacionItem) =>
        equipo.equipo_nombre.toLowerCase().includes(searchValue.toLowerCase()),
    );
    const lider = clasificacion[0];
    const mejorJuegoLimpio = [...clasificacion].sort((a, b) => b.puntos_juego_limpio - a.puntos_juego_limpio)[0];
    const mejorEducativo = [...clasificacion].sort((a, b) => b.puntos_educativos_total - a.puntos_educativos_total)[0];

    return (
        <div className="space-y-6">
            <Breadcrumb items={[
                { label: 'Mis Ligas', href: '/ligas' },
                { label: liga.nombre, href: `/ligas/${liga.id}` },
                { label: 'Clasificación' },
            ]} />

            <PageHeader
                title="Clasificación"
                description="Puntos deportivos y valores educativos en una sola tabla."
                eyebrow="Seguimiento de resultados"
            >
                <Button variant="outline" size="sm" asChild>
                    <Link to={`/ligas/${liga.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a la liga
                    </Link>
                </Button>
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Equipos"
                    value={clasificacion.length}
                    support="Registrados en tabla"
                    icon={Users}
                    tone="mint"
                />
                <MetricCard
                    label="Líder actual"
                    value={lider ? `${lider.puntos_totales} pts` : '-'}
                    support={lider?.equipo_nombre || 'Sin datos'}
                    icon={Trophy}
                    tone="sky"
                />
                <MetricCard
                    label="Mejor juego limpio"
                    value={mejorJuegoLimpio?.puntos_juego_limpio ?? 0}
                    support={mejorJuegoLimpio?.equipo_nombre || 'Sin datos'}
                    icon={Medal}
                    tone="vio"
                />
                <MetricCard
                    label="Mejor bloque educativo"
                    value={mejorEducativo?.puntos_educativos_total ?? 0}
                    support={mejorEducativo?.equipo_nombre || 'Sin datos'}
                    icon={UserCheck}
                    tone="amber"
                />
            </div>

            <ListToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Buscar equipo en la clasificación"
                summary={`Mostrando ${filteredClasificacion.length} de ${clasificacion.length} equipos.`}
            >
                <Badge variant="outline">Pts dep</Badge>
                <Badge variant="secondary">Juego limpio</Badge>
                <Badge variant="accent">Árbitro y grada</Badge>
            </ListToolbar>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Tabla general</CardTitle>
                    <CardDescription>Sistema de puntuación EDUmind con lectura deportiva y educativa.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {clasificacion.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                icon={Trophy}
                                title="No hay datos de clasificación"
                                description="Crea equipos y partidos para que aparezcan los resultados en la tabla de clasificación."
                                actionLabel="Ver equipos"
                                actionHref={`/ligas/${liga.id}/equipos`}
                            />
                        </div>
                    ) : filteredClasificacion.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-lg font-semibold text-ink">No hay equipos que coincidan con la búsqueda</p>
                            <p className="mt-2 text-sm text-sub">Prueba con otro nombre para filtrar la tabla.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto p-4">
                            <Table className="overflow-hidden rounded-2xl">
                                <TableHeader>
                                    <TableRow className="border-lme-border/80 hover:bg-transparent">
                                        <TableHead className="w-[70px] text-center">Pos</TableHead>
                                        <TableHead>Equipo</TableHead>
                                        <TableHead className="text-center">PJ</TableHead>
                                        <TableHead className="text-center">G</TableHead>
                                        <TableHead className="text-center">E</TableHead>
                                        <TableHead className="text-center">P</TableHead>
                                        <TableHead className="bg-sky/10 text-center text-sky">Pts Dep</TableHead>
                                        <TableHead className="hidden text-center md:table-cell">JL</TableHead>
                                        <TableHead className="hidden text-center md:table-cell">Arb</TableHead>
                                        <TableHead className="hidden text-center md:table-cell">Grd</TableHead>
                                        <TableHead className="bg-mint/10 text-center text-mint">Pts Edu</TableHead>
                                        <TableHead className="bg-vio/10 text-center text-vio">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClasificacion.map((equipo: ClasificacionItem, index: number) => (
                                        <TableRow
                                            key={equipo.equipo_id}
                                            className={index % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : ''}
                                        >
                                            <TableCell className="text-center font-medium">
                                                <div className={`
                                                    mx-auto flex h-9 w-9 items-center justify-center rounded-full font-bold
                                                    ${equipo.posicion === 1
                                                        ? 'bg-amber-300/15 text-amber-200'
                                                        : equipo.posicion === 2
                                                            ? 'bg-slate-300/15 text-slate-200'
                                                            : equipo.posicion === 3
                                                                ? 'bg-orange-300/15 text-orange-200'
                                                                : 'bg-white/5 text-sub'}
                                                `}>
                                                    {equipo.posicion}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-ink">{equipo.equipo_nombre}</TableCell>
                                            <TableCell className="text-center">{equipo.partidos_jugados}</TableCell>
                                            <TableCell className="text-center font-medium text-mint">{equipo.ganados}</TableCell>
                                            <TableCell className="text-center font-medium text-amber-300">{equipo.empatados}</TableCell>
                                            <TableCell className="text-center font-medium text-red-300">{equipo.perdidos}</TableCell>
                                            <TableCell className="bg-sky/5 text-center font-bold text-sky">
                                                {equipo.puntos_deportivos}
                                            </TableCell>
                                            <TableCell className="hidden text-center md:table-cell">
                                                {equipo.puntos_juego_limpio}
                                            </TableCell>
                                            <TableCell className="hidden text-center md:table-cell">
                                                {equipo.puntos_arbitro}
                                            </TableCell>
                                            <TableCell className="hidden text-center md:table-cell">
                                                {equipo.puntos_grada}
                                            </TableCell>
                                            <TableCell className="bg-mint/5 text-center font-bold text-mint">
                                                {equipo.puntos_educativos_total}
                                            </TableCell>
                                            <TableCell className="bg-vio/5 text-center font-black text-vio">
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
        </div>
    );
}
