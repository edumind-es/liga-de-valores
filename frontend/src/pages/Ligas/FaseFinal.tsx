/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, ChevronRight, Loader2, Plus, Shuffle, Trash2, Trophy, Users,
} from 'lucide-react';
import { useLiga } from '@/hooks/useLigas';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fasesFinalApi } from '@/api/fasesFinal';
import type { CruceFase } from '@/types/faseFinal';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ESTADO_BADGE: Record<string, 'outline' | 'secondary' | 'success' | 'warning'> = {
    borrador: 'secondary',
    activa: 'warning',
    finalizada: 'success',
};

function CruceCard({
    cruce,
    ligaId,
    faseId,
    onResuelto,
}: {
    cruce: CruceFase;
    ligaId: number;
    faseId: number;
    onResuelto: () => void;
}) {
    const [resolving, setResolving] = useState(false);

    const handleResolver = async (ganadorId: number) => {
        if (!window.confirm(`¿Confirmar ganador: ${ganadorId === cruce.equipo_a.id ? cruce.equipo_a.nombre : cruce.equipo_b.nombre}?`)) return;
        setResolving(true);
        try {
            await fasesFinalApi.resolverCruce(ligaId, faseId, cruce.id, ganadorId);
            toast.success('Cruce resuelto');
            onResuelto();
        } catch {
            toast.error('No se pudo resolver el cruce');
        } finally {
            setResolving(false);
        }
    };

    const isGanadorA = cruce.ganador_id === cruce.equipo_a.id;
    const isGanadorB = cruce.ganador_id === cruce.equipo_b.id;

    return (
        <div className="rounded-xl border border-lme-border/70 bg-[rgba(10,20,38,0.60)] p-4 space-y-3">
            <div className="flex items-center gap-3">
                <div className={`flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-colors
                    ${isGanadorA ? 'border-mint/60 bg-mint/12 text-mint' : 'border-lme-border/50 text-ink'}`}>
                    {cruce.equipo_a.nombre}
                    {cruce.partidos_ids.length > 0 && (
                        <div className="mt-1 text-xs text-sub font-normal">
                            {cruce.partidos_ids.length} partido{cruce.partidos_ids.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                <div className="text-xs font-bold uppercase tracking-widest text-sub">vs</div>

                <div className={`flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-colors
                    ${isGanadorB ? 'border-mint/60 bg-mint/12 text-mint' : 'border-lme-border/50 text-ink'}`}>
                    {cruce.equipo_b.nombre}
                    {cruce.partidos_ids.length > 0 && (
                        <div className="mt-1 text-xs text-sub font-normal">
                            {cruce.partidos_ids.length} partido{cruce.partidos_ids.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                <Badge variant={cruce.estado === 'finalizado' ? 'success' : 'secondary'}>
                    {cruce.estado === 'finalizado' ? 'Finalizado' : cruce.estado === 'en_curso' ? 'En curso' : 'Pendiente'}
                </Badge>

                {cruce.partidos_ids.length > 0 && (
                    <Link
                        to={`/ligas/${ligaId}/partidos/${cruce.partidos_ids[0]}`}
                        className="flex items-center gap-1 text-xs text-sky hover:underline"
                    >
                        Ver partidos <ChevronRight className="h-3 w-3" />
                    </Link>
                )}

                {cruce.estado !== 'finalizado' && !cruce.ganador_id && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={resolving}
                            onClick={() => handleResolver(cruce.equipo_a.id)}
                            className="text-xs"
                        >
                            {resolving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Gana {cruce.equipo_a.nombre}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={resolving}
                            onClick={() => handleResolver(cruce.equipo_b.id)}
                            className="text-xs"
                        >
                            Gana {cruce.equipo_b.nombre}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FaseFinalPage() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const leagueId = ligaId ? parseInt(ligaId, 10) : 0;
    const { data: liga } = useLiga(leagueId);
    const queryClient = useQueryClient();

    const { data: fases = [], isLoading } = useQuery({
        queryKey: ['fases-finales', leagueId],
        queryFn: () => fasesFinalApi.list(leagueId),
        enabled: !!leagueId,
    });

    const [creando, setCreando] = useState(false);
    const [generando, setGenerando] = useState<number | null>(null);
    const [topN, setTopN] = useState(4);
    const [numPartidos, setNumPartidos] = useState(1);

    const invalidar = () => queryClient.invalidateQueries({ queryKey: ['fases-finales', leagueId] });

    const handleCrearFase = async () => {
        setCreando(true);
        try {
            await fasesFinalApi.create(leagueId, {
                nombre: 'Fase Final',
                num_partidos_por_cruce: numPartidos,
                asignar_roles_auto: true,
            });
            toast.success('Fase final creada');
            invalidar();
        } catch {
            toast.error('No se pudo crear la fase');
        } finally {
            setCreando(false);
        }
    };

    const handleGenerarCruces = async (faseId: number) => {
        if (!window.confirm(`Se generarán cruces con los ${topN} mejores equipos de la clasificación. Los partidos de cruce se crearán automáticamente. ¿Continuar?`)) return;
        setGenerando(faseId);
        try {
            await fasesFinalApi.generarCruces(leagueId, faseId, { top_n: topN });
            toast.success('Cruces generados con deportes asignados aleatoriamente');
            invalidar();
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(detail ?? 'No se pudieron generar los cruces');
        } finally {
            setGenerando(null);
        }
    };

    const handleEliminarFase = async (faseId: number) => {
        if (!window.confirm('Eliminar la fase borrará todos los cruces y partidos de playoff. ¿Continuar?')) return;
        try {
            await fasesFinalApi.delete(leagueId, faseId);
            toast.success('Fase eliminada');
            invalidar();
        } catch {
            toast.error('No se pudo eliminar la fase');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${leagueId}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a la liga
                </Link>
            </Button>

            <PageHeader
                eyebrow="Fase eliminatoria"
                title={`Fase Final · ${liga?.nombre ?? ''}`}
                description="Gestiona los cruces entre equipos clasificados con asignación automática de deportes y roles."
            />

            {/* Configuración y creación */}
            {fases.length === 0 && (
                <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-300" />
                            Crear fase final
                        </CardTitle>
                        <CardDescription>
                            Define cuántos equipos pasan de fase y cuántos partidos se juegan por cruce.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-sub">
                                    Equipos clasificados (top N)
                                </label>
                                <select
                                    value={topN}
                                    onChange={(e) => setTopN(Number(e.target.value))}
                                    className="form-control"
                                >
                                    {[2, 4, 8, 16].map((n) => (
                                        <option key={n} value={n}>{n} equipos</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-sub">
                                    Partidos por cruce
                                </label>
                                <select
                                    value={numPartidos}
                                    onChange={(e) => setNumPartidos(Number(e.target.value))}
                                    className="form-control"
                                >
                                    {[1, 2, 3].map((n) => (
                                        <option key={n} value={n}>{n} partido{n > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-sub/70">
                            Los deportes se asignan aleatoriamente entre los usados en la liga regular.
                            Los equipos eliminados actúan como árbitros y tutores de grada en cruces posteriores.
                        </p>
                        <Button onClick={handleCrearFase} disabled={creando} className="gap-2">
                            {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Crear fase final
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Listado de fases */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-mint" />
                </div>
            ) : (
                fases.map((fase) => (
                    <Card key={fase.id} className="border-t-2 border-lme-border/90 bg-[rgba(10,20,38,0.72)]" style={{ borderTopColor: 'var(--amber-300, #fbbf24)' }}>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Trophy className="h-5 w-5 text-amber-300" />
                                        {fase.nombre}
                                    </CardTitle>
                                    <CardDescription>
                                        {fase.num_partidos_por_cruce} partido{fase.num_partidos_por_cruce > 1 ? 's' : ''} por cruce
                                        {fase.asignar_roles_auto ? ' · Roles automáticos' : ''}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={ESTADO_BADGE[fase.estado] ?? 'secondary'}>
                                        {fase.estado}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-sub hover:text-red-400 hover:bg-red-500/10"
                                        onClick={() => handleEliminarFase(fase.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fase.cruces.length === 0 ? (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-lme-border/50 bg-[rgba(9,18,36,0.52)] p-3 text-xs text-sub">
                                        <p className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-sub/60" />
                                            Aún no hay cruces. Genera los emparejamientos desde la clasificación actual.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={topN}
                                            onChange={(e) => setTopN(Number(e.target.value))}
                                            className="form-control w-auto"
                                        >
                                            {[2, 4, 8, 16].map((n) => (
                                                <option key={n} value={n}>Top {n}</option>
                                            ))}
                                        </select>
                                        <Button
                                            onClick={() => handleGenerarCruces(fase.id)}
                                            disabled={generando === fase.id}
                                            className="gap-2"
                                        >
                                            {generando === fase.id
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <Shuffle className="h-4 w-4" />}
                                            Generar cruces
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs uppercase tracking-widest text-sub/60">
                                        {fase.cruces.length} cruce{fase.cruces.length > 1 ? 's' : ''}
                                    </p>
                                    {fase.cruces.map((cruce) => (
                                        <CruceCard
                                            key={cruce.id}
                                            cruce={cruce}
                                            ligaId={leagueId}
                                            faseId={fase.id}
                                            onResuelto={invalidar}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
