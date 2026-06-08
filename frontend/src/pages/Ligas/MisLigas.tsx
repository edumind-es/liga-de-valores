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
import { Link } from 'react-router-dom';
import {
    BarChart2,
    Calendar,
    ClipboardList,
    Loader2,
    MoreHorizontal,
    Plus,
    Settings,
    Trash2,
    Trophy,
    Users,
} from 'lucide-react';
import { ligasApi } from '@/api/ligas';
import { useLigas } from '@/hooks/useLigas';
import { getErrorMessage } from '@/utils/apiUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListToolbar } from '@/components/workspace/ListToolbar';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatusFilter = 'all' | 'active' | 'draft';

const LIGA_TONES = [
    { color: 'var(--mint)',        glow: 'rgba(82,217,199,0.12)'  },
    { color: 'var(--sky)',         glow: 'rgba(74,132,255,0.12)'  },
    { color: 'var(--vio)',         glow: 'rgba(142,121,255,0.12)' },
    { color: 'var(--lme-warning)', glow: 'rgba(242,185,73,0.12)'  },
] as const;

export default function MisLigas() {
    const { data: ligas, isLoading, error, refetch } = useLigas();
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const totalLigas = ligas?.length ?? 0;
    const ligasActivas = ligas?.filter((liga) => liga.activa).length ?? 0;
    const filteredLigas = (ligas ?? []).filter((liga) => {
        const matchesText = `${liga.nombre} ${liga.descripcion ?? ''} ${liga.temporada ?? ''}`
            .toLowerCase()
            .includes(searchValue.toLowerCase());
        const matchesStatus = statusFilter === 'all'
            || (statusFilter === 'active' && liga.activa)
            || (statusFilter === 'draft' && !liga.activa);
        return matchesText && matchesStatus;
    });

    const handleDelete = async (id: number, nombre: string) => {
        if (!window.confirm(`¿Eliminar la liga "${nombre}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        try {
            await ligasApi.delete(id);
            toast.success('Liga eliminada correctamente');
            refetch();
        } catch {
            toast.error('Error al eliminar la liga');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <PageHeader
                    title="Mis Ligas"
                    description="Gestiona competiciones, organiza calendarios y mantén control operativo de cada liga."
                    eyebrow="Gestión de ligas"
                >
                    <Skeleton className="h-10 w-36 rounded-full" />
                </PageHeader>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl bg-lme-surface-soft" />
                    ))}
                </div>

                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-mint" />
                        <p className="text-sub text-sm">Cargando ligas...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-500/35 bg-red-500/10">
                <CardContent className="p-8 text-center">
                    <p className="font-semibold text-red-300">Error al cargar las ligas</p>
                    <p className="mt-1 text-sm text-red-200">{getErrorMessage(error)}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <PageHeader
                title="Mis Ligas"
                description="Gestiona competiciones, organiza calendarios y mantén control operativo de cada liga."
                eyebrow="Gestión de ligas"
            >
                <Badge variant="outline">{totalLigas} ligas</Badge>
                <Badge variant="secondary">{ligasActivas} activas</Badge>
                <Button asChild className="gap-2">
                    <Link to="/ligas/crear">
                        <Plus className="h-5 w-5" />
                        Nueva Liga
                    </Link>
                </Button>
            </PageHeader>

            {!ligas || ligas.length === 0 ? (
                <Card variant="glass" className="py-14 text-center">
                    <CardContent className="flex flex-col items-center justify-center space-y-4">
                        <div className="mb-2 rounded-2xl border border-mint/20 bg-gradient-to-br from-mint/20 to-sky/20 p-5">
                            <Trophy className="h-12 w-12 text-mint" />
                        </div>
                        <h3 className="text-2xl font-bold text-ink">Todavía no tienes ligas</h3>
                        <p className="mx-auto max-w-md text-sub">
                            Empieza creando tu primera competición para gestionar equipos, jornadas y resultados desde un único panel.
                        </p>
                        <Button asChild size="lg" className="mt-3 gap-2">
                            <Link to="/ligas/crear">
                                <Plus className="h-5 w-5" />
                                Crear Liga
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-5">
                    <ListToolbar
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        searchPlaceholder="Buscar por nombre, temporada o descripción"
                        summary={`Mostrando ${filteredLigas.length} de ${totalLigas} ligas.`}
                    >
                        <Button
                            variant={statusFilter === 'all' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                        >
                            Todas
                        </Button>
                        <Button
                            variant={statusFilter === 'active' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('active')}
                        >
                            Activas
                        </Button>
                        <Button
                            variant={statusFilter === 'draft' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('draft')}
                        >
                            Borradores
                        </Button>
                    </ListToolbar>

                    {filteredLigas.length === 0 ? (
                        <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)]">
                            <CardContent className="py-12 text-center">
                                <p className="text-lg font-semibold text-ink">No hay ligas que coincidan con la búsqueda</p>
                                <p className="mt-2 text-sm text-sub">Prueba con otro término o cambia el filtro activo.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {filteredLigas.map((liga, index) => {
                                const tone = LIGA_TONES[index % LIGA_TONES.length];
                                return (
                                <Card
                                    key={liga.id}
                                    style={{ borderTopColor: tone.color }}
                                    className="relative flex h-full flex-col overflow-hidden border-t-[3px] border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_38px_rgba(3,10,28,0.18)] transition-transform duration-200 hover:-translate-y-1"
                                >
                                    <div
                                        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                                        style={{ background: `linear-gradient(to bottom, ${tone.glow}, transparent)` }}
                                    />
                                    <CardContent className="relative flex h-full flex-col gap-4 p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <Link to={`/ligas/${liga.id}`} className="no-underline">
                                                    <p className="text-lg font-semibold leading-tight text-ink transition-colors hover:text-mint">
                                                        {liga.nombre}
                                                    </p>
                                                </Link>
                                                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-sub">
                                                    {liga.temporada || 'Temporada actual'}
                                                </p>
                                            </div>
                                            <Badge variant={liga.activa ? 'success' : 'secondary'}>
                                                {liga.activa ? 'Activa' : 'Borrador'}
                                            </Badge>
                                        </div>

                                        <p className="min-h-[3.2rem] text-sm leading-relaxed text-sub line-clamp-3">
                                            {liga.descripcion || 'Sin descripción disponible para esta liga.'}
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline">
                                                {liga.modo_competicion === 'multi_deporte' ? 'Multideporte' : 'Único deporte'}
                                            </Badge>
                                            <Badge variant={liga.modo_evaluacion === 'personalizado' ? 'accent' : 'secondary'}>
                                                {liga.modo_evaluacion === 'personalizado' ? 'Eval. personalizada' : 'Eval. clásica'}
                                            </Badge>
                                        </div>

                                        <Link
                                            to={`/ligas/${liga.id}`}
                                            style={{ color: tone.color, borderColor: tone.color }}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border bg-white/5 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-white/10"
                                        >
                                            <Users className="h-4 w-4" />
                                            Abrir panel de liga
                                        </Link>

                                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-lme-border/70 pt-4">
                                            <div className="flex flex-wrap gap-2">
                                                <Button asChild variant="outline" size="sm" className="gap-1.5">
                                                    <Link to={`/ligas/${liga.id}/equipos`}>
                                                        <Users className="h-4 w-4" />
                                                        Equipos
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm" className="gap-1.5">
                                                    <Link to={`/ligas/${liga.id}/jornadas`}>
                                                        <Calendar className="h-4 w-4" />
                                                        Jornadas
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm" className="gap-1.5">
                                                    <Link to={`/ligas/${liga.id}/clasificacion`}>
                                                        <BarChart2 className="h-4 w-4" />
                                                        Tabla
                                                    </Link>
                                                </Button>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-sub hover:text-ink"
                                                        aria-label={`Acciones de ${liga.nombre}`}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link to={`/ligas/${liga.id}`}>
                                                            <Users className="mr-2 h-4 w-4" />
                                                            Abrir liga
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link to={`/ligas/${liga.id}/configuracion`}>
                                                            <Settings className="mr-2 h-4 w-4" />
                                                            Configuración
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {liga.modo_evaluacion === 'personalizado' && (
                                                        <DropdownMenuItem asChild>
                                                            <Link to={`/ligas/${liga.id}/criterios`}>
                                                                <ClipboardList className="mr-2 h-4 w-4" />
                                                                Criterios
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(liga.id, liga.nombre)}
                                                        className="text-red-300 focus:text-red-100"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar liga
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
