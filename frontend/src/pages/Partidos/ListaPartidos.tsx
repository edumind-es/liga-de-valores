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
import { ArrowLeft, Calendar, Clock, Copy, Edit, Key, Link2, Loader2, Plus, Trash2, Trophy, Wifi, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useQueryClient } from '@tanstack/react-query';
import { usePartidos, useDeletePartido } from '@/hooks/usePartidos';
import { useLiga } from '@/hooks/useLigas';
import { partidosApi } from '@/api/partidos';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ListToolbar } from '@/components/workspace/ListToolbar';
import { MetricCard } from '@/components/workspace/MetricCard';
import { toast } from 'sonner';
import type { PartidoDetailed } from '@/types/liga';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getOfflineLeagueMeta, type OfflineLeagueMeta } from '@/lib/offline/offlineDB';
import { prepareLeagueOffline } from '@/lib/offline/prepareLeagueOffline';
import { useAuthStore } from '@/store/authStore';

type StatusFilter = 'all' | 'pending' | 'finished';

function getDisplayScore(partido: PartidoDetailed): { local: number; visitante: number } | null {
    if (typeof partido.marcador_local !== 'number' || typeof partido.marcador_visitante !== 'number') {
        return null;
    }
    return { local: partido.marcador_local, visitante: partido.marcador_visitante };
}

export default function ListaPartidos() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const leagueId = ligaId ? parseInt(ligaId, 10) : 0;
    const { data: liga, isLoading: isLoadingLiga } = useLiga(leagueId);
    const { data: partidos, isLoading: isLoadingPartidos } = usePartidos(leagueId);
    const deletePartido = useDeletePartido();
    const queryClient = useQueryClient();
    const { isOnline } = useOfflineSync();
    const { user } = useAuthStore();
    const canPrepareOffline = isOnline;
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [pinLoading, setPinLoading] = useState<Record<number, boolean>>({});
    const [offlineMeta, setOfflineMeta] = useState<OfflineLeagueMeta | null>(null);
    const [isPreparingOffline, setIsPreparingOffline] = useState(false);

    useEffect(() => {
        if (!leagueId) return;
        const loadOfflineStatus = async () => {
            try {
                const meta = await getOfflineLeagueMeta(leagueId);
                setOfflineMeta(meta ?? null);
            } catch (err) {
                console.warn('No se pudo leer el estado offline:', err);
            }
        };
        void loadOfflineStatus();
    }, [leagueId]);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const handleGeneratePin = async (id: number) => {
        setPinLoading((prev) => ({ ...prev, [id]: true }));
        try {
            await partidosApi.generatePin(id);
            await queryClient.invalidateQueries({ queryKey: ['partidos', leagueId] });
            toast.success('PIN generado');
        } catch {
            toast.error('No se pudo generar el PIN');
        } finally {
            setPinLoading((prev) => ({ ...prev, [id]: false }));
        }
    };

    const handleRevokePin = async (id: number) => {
        setPinLoading((prev) => ({ ...prev, [id]: true }));
        try {
            await partidosApi.revokePin(id);
            await queryClient.invalidateQueries({ queryKey: ['partidos', leagueId] });
            toast.success('PIN revocado');
        } catch {
            toast.error('No se pudo revocar el PIN');
        } finally {
            setPinLoading((prev) => ({ ...prev, [id]: false }));
        }
    };

    const handleCopyPinLink = async (pin: string) => {
        const url = `${origin}/partido/${pin}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Enlace copiado');
        } catch {
            toast.error('No se pudo copiar el enlace');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este partido?')) return;

        try {
            await deletePartido.mutateAsync(id);
            toast.success('Partido eliminado');
        } catch {
            toast.error('Error al eliminar el partido');
        }
    };

    if (isLoadingLiga || isLoadingPartidos) {
        return (
            <div className="space-y-8">
                <PageHeader title="Partidos" description="Cargando calendario de liga..." eyebrow="Gestión de partidos">
                    <Skeleton className="h-10 w-40 rounded-full" />
                </PageHeader>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-40 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!liga) {
        return <div className="p-8 text-center text-red-500">Liga no encontrada</div>;
    }

    const partidosLista = partidos ?? [];
    const partidosFinalizados = partidosLista.filter((partido) => partido.finalizado).length;
    const partidosPendientes = partidosLista.length - partidosFinalizados;
    const deportesActivos = new Set(partidosLista.map((partido) => partido.tipo_deporte.nombre)).size;
    const filteredPartidos = partidosLista.filter((partido) => {
        const matchesText = [
            partido.tipo_deporte.nombre,
            partido.equipo_local.nombre,
            partido.equipo_visitante.nombre,
        ].join(' ').toLowerCase().includes(searchValue.toLowerCase());
        const matchesStatus = statusFilter === 'all'
            || (statusFilter === 'finished' && partido.finalizado)
            || (statusFilter === 'pending' && !partido.finalizado);
        return matchesText && matchesStatus;
    });

    const handlePrepareOffline = async () => {
        if (!leagueId) return;
        if (!canPrepareOffline) {
            toast.warning('Necesitas conexión para preparar el modo offline.');
            return;
        }
        setIsPreparingOffline(true);
        try {
            const result = await prepareLeagueOffline(leagueId, {
                includeEvaluacionesPersonalizadas: liga.modo_evaluacion === 'personalizado',
                preparedBy: user?.codigo ?? null,
            });
            const meta = await getOfflineLeagueMeta(leagueId);
            setOfflineMeta(meta ?? null);
            toast.success(`Modo offline preparado (${result.counts.partidos} partidos)`);
        } catch (err) {
            console.error('Error preparando offline:', err);
            toast.error('No se pudo preparar el modo offline.');
        } finally {
            setIsPreparingOffline(false);
        }
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${leagueId}`}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Volver a la liga
                </Link>
            </Button>

            <PageHeader
                title="Partidos"
                description={`Gestiona los partidos de ${liga.nombre}`}
                eyebrow="Gestión de partidos"
            >
                <Badge variant="outline">{partidosLista.length} partidos</Badge>
                <Button asChild className="gap-2">
                    <Link to={`/ligas/${leagueId}/partidos/crear`}>
                        <Plus className="h-5 w-5" />
                        Nuevo Partido
                    </Link>
                </Button>
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Partidos"
                    value={partidosLista.length}
                    support="Calendario registrado"
                    icon={Trophy}
                    tone="mint"
                />
                <MetricCard
                    label="Pendientes"
                    value={partidosPendientes}
                    support="Por jugar o cerrar"
                    icon={Clock}
                    tone="amber"
                />
                <MetricCard
                    label="Finalizados"
                    value={partidosFinalizados}
                    support="Con resultado guardado"
                    icon={Calendar}
                    tone="sky"
                />
                <MetricCard
                    label="Deportes"
                    value={deportesActivos}
                    support="Activos en la agenda"
                    icon={Wifi}
                    tone="vio"
                />
            </div>

            <Card className="border-sky/35 bg-[rgba(13,35,63,0.44)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <Wifi className="h-4 w-4 text-sky" />
                            Preparar modo offline
                        </div>
                        <p className="text-sm text-sub">
                            Guarda una copia local de los partidos para trabajar sin internet en el aula.
                        </p>
                        <p className="text-xs text-sub">
                            Estado: {offlineMeta
                                ? `Listo (${offlineMeta.counts.partidos} partidos) · ${new Date(offlineMeta.updatedAt).toLocaleString()}`
                                : 'No preparado'}
                        </p>
                        {!canPrepareOffline && (
                            <p className="text-xs text-amber-300">
                                Necesitas conexión para preparar el modo offline.
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={handlePrepareOffline}
                        disabled={!canPrepareOffline || isPreparingOffline}
                    >
                        {isPreparingOffline ? 'Preparando...' : 'Preparar offline'}
                    </Button>
                </CardContent>
            </Card>

            <ListToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Buscar por deporte o por nombre de equipo"
                summary={`Mostrando ${filteredPartidos.length} de ${partidosLista.length} partidos.`}
            >
                <Button
                    variant={statusFilter === 'all' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                >
                    Todos
                </Button>
                <Button
                    variant={statusFilter === 'pending' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('pending')}
                >
                    Pendientes
                </Button>
                <Button
                    variant={statusFilter === 'finished' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('finished')}
                >
                    Finalizados
                </Button>
            </ListToolbar>

            {filteredPartidos.length === 0 ? (
                <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)]">
                    <CardContent className="py-12 text-center">
                        {partidosLista.length === 0 ? (
                            <>
                                <div className="mx-auto mb-4 h-12 w-12 text-lme-muted">
                                    <Trophy className="h-12 w-12 opacity-50" />
                                </div>
                                <h3 className="text-lg font-medium text-lme-text">No hay partidos registrados</h3>
                                <p className="mt-1 mb-4 text-lme-muted">Comienza creando el calendario de la liga.</p>
                                <Button asChild>
                                    <Link to={`/ligas/${leagueId}/partidos/crear`}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Crear el primer partido
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-semibold text-ink">No hay partidos que coincidan con el filtro</p>
                                <p className="mt-2 text-sm text-sub">Prueba con otro texto o cambia el estado seleccionado.</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredPartidos.map((partido) => {
                        const score = getDisplayScore(partido);
                        return (
                            <Card
                                key={partido.id}
                                className="overflow-hidden border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_38px_rgba(3,10,28,0.18)] transition-transform duration-200 hover:-translate-y-1"
                            >
                                <CardContent className="p-6">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex-1">
                                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                                <Badge variant="outline">{partido.tipo_deporte.nombre}</Badge>
                                                {partido.fecha_hora && (
                                                    <Badge variant="secondary">
                                                        <Calendar className="mr-1 h-3 w-3" />
                                                        {new Date(partido.fecha_hora).toLocaleString('es-ES', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </Badge>
                                                )}
                                                <Badge variant={partido.finalizado ? 'success' : 'warning'}>
                                                    {partido.finalizado ? 'Finalizado' : 'Pendiente'}
                                                </Badge>
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                                                <div className="flex items-center justify-between gap-4 rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.52)] px-4 py-4">
                                                    <span className="min-w-0 text-sm font-semibold text-ink lg:text-lg">
                                                        {partido.equipo_local.nombre}
                                                    </span>
                                                    <span className="rounded-xl border border-lme-border bg-[rgba(255,255,255,0.06)] px-3 py-2 text-xl font-bold text-ink">
                                                        {score ? score.local : '-'}
                                                    </span>
                                                </div>

                                                <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-sub">
                                                    vs
                                                </div>

                                                <div className="flex items-center justify-between gap-4 rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.52)] px-4 py-4">
                                                    <span className="rounded-xl border border-lme-border bg-[rgba(255,255,255,0.06)] px-3 py-2 text-xl font-bold text-ink">
                                                        {score ? score.visitante : '-'}
                                                    </span>
                                                    <span className="min-w-0 text-right text-sm font-semibold text-ink lg:text-lg">
                                                        {partido.equipo_visitante.nombre}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 border-t border-lme-border/70 pt-4 lg:border-t-0 lg:pt-0">
                                            {/* PIN de acceso para alumnado */}
                                            {partido.pin ? (
                                                <div className="flex items-center gap-2 rounded-lg border border-sky/30 bg-sky/8 px-3 py-2">
                                                    <Key className="h-3.5 w-3.5 shrink-0 text-sky" />
                                                    <span className="font-mono text-sm tracking-widest text-sky">{partido.pin}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="ml-auto h-6 w-6 text-sky hover:bg-sky/15"
                                                        title="Copiar enlace de acceso"
                                                        onClick={() => void handleCopyPinLink(partido.pin!)}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-sub hover:bg-red-500/10 hover:text-red-400"
                                                        title="Revocar PIN"
                                                        disabled={pinLoading[partido.id]}
                                                        onClick={() => void handleRevokePin(partido.id)}
                                                    >
                                                        {pinLoading[partido.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 border-sky/30 text-sky hover:border-sky/50 hover:bg-sky/8"
                                                    disabled={pinLoading[partido.id]}
                                                    onClick={() => void handleGeneratePin(partido.id)}
                                                >
                                                    {pinLoading[partido.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                                                    Generar enlace alumnado
                                                </Button>
                                            )}
                                            {/* Acciones principales */}
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" asChild className="gap-2">
                                                    <Link to={`/ligas/${leagueId}/partidos/${partido.id}`}>
                                                        <Edit className="h-4 w-4" />
                                                        Ver / Editar
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-sub hover:bg-red-500/10 hover:text-red-400"
                                                    onClick={() => handleDelete(partido.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
