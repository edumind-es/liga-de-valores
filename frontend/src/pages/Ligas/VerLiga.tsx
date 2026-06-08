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
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Copy,
    FileSpreadsheet,
    FileText,
    Inbox,
    Key,
    Loader2,
    Send,
    Settings,
    Trash2,
    Trophy,
    UserPlus,
    Users,
    Wifi,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { ligasApi } from '@/api/ligas';
import { useLiga } from '@/hooks/useLigas';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionTile } from '@/components/workspace/ActionTile';
import PendingActionsPanel from '@/components/PendingActionsPanel';
import { getErrorMessage } from '@/utils/apiUtils';
import { toast } from 'sonner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
    clearLeagueOfflineData,
    getOfflineLeagueMeta,
    getPendingOperationCount,
    type OfflineLeagueMeta,
} from '@/lib/offline/offlineDB';
import { prepareLeagueOffline } from '@/lib/offline/prepareLeagueOffline';
import { useAuthStore } from '@/store/authStore';

type LeagueAreaCard = {
    title: string;
    description: string;
    value: string | number;
    actionLabel: string;
    to: string;
    icon: LucideIcon;
    tone: 'mint' | 'sky' | 'vio' | 'amber';
};

export default function VerLiga() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const ligaId = id ? parseInt(id, 10) : 0;
    const { data: liga, isLoading, error } = useLiga(ligaId);
    const { isOnline } = useOfflineSync();
    const { user } = useAuthStore();
    const canPrepareOffline = isOnline;
    const [offlineMeta, setOfflineMeta] = useState<OfflineLeagueMeta | null>(null);
    const [offlineProgress, setOfflineProgress] = useState({
        step: '',
        completed: 0,
        total: 0,
        errors: 0,
        running: false,
    });
    const [pendingCount, setPendingCount] = useState(0);
    const [teacherPendingCount, setTeacherPendingCount] = useState(0);
    const progressText = useMemo(() => {
        if (!offlineProgress.running) return null;
        if (!offlineProgress.total) return `${offlineProgress.step}...`;
        return `${offlineProgress.step}: ${offlineProgress.completed}/${offlineProgress.total}`;
    }, [offlineProgress]);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicGameSheetUrl = useMemo(
        () => (origin ? `${origin}/public/${ligaId}/fichas/generar` : `/public/${ligaId}/fichas/generar`),
        [origin, ligaId]
    );
    const formattedOfflineUpdatedAt = offlineMeta
        ? new Date(offlineMeta.updatedAt).toLocaleString('es-ES')
        : null;
    const formattedOfflineExpiry = offlineMeta
        ? new Date(offlineMeta.expiresAt).toLocaleString('es-ES')
        : null;

    useEffect(() => {
        if (!ligaId) return;

        const loadMeta = async () => {
            const meta = await getOfflineLeagueMeta(ligaId);
            setOfflineMeta(meta ?? null);
            const count = await getPendingOperationCount();
            setPendingCount(count);
        };

        void loadMeta();
    }, [ligaId]);

    useEffect(() => {
        if (!ligaId) return;

        const loadTeacherPendingCount = async () => {
            try {
                const response = await apiClient.client.get('/pending-actions/count', {
                    params: { liga_id: ligaId },
                });
                setTeacherPendingCount(Number(response.data?.count ?? 0));
            } catch {
                setTeacherPendingCount(0);
            }
        };

        void loadTeacherPendingCount();
        const intervalId = window.setInterval(() => {
            void loadTeacherPendingCount();
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [ligaId]);

    const copyToClipboard = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copiado al portapapeles`);
        } catch {
            toast.error('No se pudo copiar al portapapeles');
        }
    };

    const handleDelete = async () => {
        if (!liga) return;
        if (!window.confirm('¿Estás seguro de eliminar esta liga? Se borrarán todos los equipos y partidos.')) {
            return;
        }
        try {
            await ligasApi.delete(liga.id);
            toast.success('Liga eliminada correctamente');
            navigate('/ligas');
        } catch {
            toast.error('Error al eliminar la liga');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-mint" />
                        <p className="text-sub text-sm">Cargando liga...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !liga) {
        return (
            <div className="p-8 text-center rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="font-semibold text-red-400">{error ? 'Error al cargar la liga' : 'Liga no encontrada'}</p>
                {error && <p className="text-sm mt-1 text-red-300">{getErrorMessage(error)}</p>}
            </div>
        );
    }

    const handlePrepareLigaOffline = async () => {
        if (!liga) return;
        if (!canPrepareOffline) {
            toast.warning('Necesitas conexión para preparar el modo offline.');
            return;
        }
        setOfflineProgress({ step: 'Iniciando', completed: 0, total: 0, errors: 0, running: true });
        try {
            const result = await prepareLeagueOffline(liga.id, {
                includeEvaluacionesPersonalizadas: liga.modo_evaluacion === 'personalizado',
                preparedBy: user?.codigo ?? null,
                onProgress: (payload) => {
                    setOfflineProgress((prev) => ({
                        ...prev,
                        step: payload.step,
                        completed: payload.completed,
                        total: payload.total,
                        errors: payload.errors,
                        running: true,
                    }));
                },
            });

            const updatedMeta = await getOfflineLeagueMeta(liga.id);
            setOfflineMeta(updatedMeta ?? null);
            toast.success(
                `Liga preparada offline (${result.counts.partidos} partidos, ${result.counts.equipos} equipos)`
            );
        } catch (err) {
            console.error('Error preparando liga offline:', err);
            toast.error('No se pudo preparar la liga offline.');
        } finally {
            setOfflineProgress((prev) => ({ ...prev, running: false }));
        }
    };

    const handleClearLigaOffline = async () => {
        if (!liga) return;
        const pendingOperations = await getPendingOperationCount();
        if (pendingOperations > 0) {
            toast.warning('Hay cambios pendientes de sincronizar. Sincroniza antes de borrar la copia offline.');
            return;
        }

        if (!window.confirm('Se borrará la copia offline de esta liga en este dispositivo. ¿Continuar?')) {
            return;
        }

        try {
            await clearLeagueOfflineData(liga.id);
            setOfflineMeta(null);
            toast.success('Copia offline eliminada de este dispositivo');
        } catch (offlineError) {
            console.error('Error limpiando copia offline:', offlineError);
            toast.error('No se pudo borrar la copia offline');
        }
    };

    const handleExportPDF = async () => {
        if (!liga) return;
        try {
            await ligasApi.exportPDF(liga.id);
            toast.success('PDF descargado correctamente');
        } catch (exportError) {
            console.error(exportError);
            toast.error('Error al exportar PDF');
        }
    };

    const handleExportCSV = async () => {
        if (!liga) return;
        try {
            await ligasApi.exportCSV(liga.id);
            toast.success('CSV descargado correctamente');
        } catch (exportError) {
            console.error(exportError);
            toast.error('Error al exportar CSV');
        }
    };

    const leagueAreas: LeagueAreaCard[] = [
        {
            title: 'Equipos',
            description: 'Gestion de alumnado y plantillas',
            value: liga.total_equipos,
            actionLabel: 'Gestionar equipos',
            to: `/ligas/${liga.id}/equipos`,
            icon: Users,
            tone: 'mint',
        },
        {
            title: 'Jornadas',
            description: 'Planificacion de calendario',
            value: liga.total_jornadas,
            actionLabel: 'Ver jornadas',
            to: `/ligas/${liga.id}/jornadas`,
            icon: Calendar,
            tone: 'vio',
        },
        {
            title: 'Partidos',
            description: 'Resultados y seguimiento',
            value: liga.total_partidos,
            actionLabel: 'Ver partidos',
            to: `/ligas/${liga.id}/partidos`,
            icon: Trophy,
            tone: 'sky',
        },
        {
            title: 'Clasificacion',
            description: 'Tabla oficial por equipos',
            value: liga.total_equipos,
            actionLabel: 'Abrir clasificacion',
            to: `/ligas/${liga.id}/clasificacion`,
            icon: FileSpreadsheet,
            tone: 'amber',
        },
        {
            title: 'Fase Final',
            description: 'Cruces eliminatorios entre equipos clasificados',
            value: '→',
            actionLabel: 'Gestionar fase final',
            to: `/ligas/${liga.id}/fase-final`,
            icon: Trophy,
            tone: 'vio',
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to="/ligas">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a mis ligas
                </Link>
            </Button>

            <PageHeader
                eyebrow="Centro de operacion"
                title={liga.nombre}
                description={liga.descripcion || 'Gestiona operativa, recursos y exportaciones de esta liga.'}
            >
                <Badge variant={liga.modo_evaluacion === 'personalizado' ? 'accent' : 'secondary'}>
                    {liga.modo_evaluacion === 'personalizado' ? 'Evaluacion personalizada' : 'Evaluacion clasica'}
                </Badge>
                {liga.temporada && <Badge variant="outline">{liga.temporada}</Badge>}
                <Badge variant={isOnline ? 'success' : 'warning'}>
                    {isOnline ? 'Red online' : 'Sin conexion'}
                </Badge>
            </PageHeader>

            {/* ══ Hub unificado de liga ══ */}
            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardContent className="space-y-6 p-6">

                    {/* Sección operativa */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-lme-border/25" />
                            <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-sub/60">Operativa</p>
                            <div className="h-px flex-1 bg-lme-border/25" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {leagueAreas.map((item) => (
                                <ActionTile
                                    key={item.title}
                                    title={item.title}
                                    description={item.description}
                                    value={item.value}
                                    icon={item.icon}
                                    tone={item.tone}
                                >
                                    <Button asChild className="w-full" variant="outline">
                                        <Link to={item.to}>{item.actionLabel}</Link>
                                    </Button>
                                </ActionTile>
                            ))}
                        </div>
                    </div>

                    {/* Sección gestión docente */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-lme-border/25" />
                            <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-sub/60">Gestión docente</p>
                            <div className="h-px flex-1 bg-lme-border/25" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                    <ActionTile
                        title="Acceso PIN del alumnado"
                        description={
                            liga.public_pin
                                ? <span>PIN activo: <strong className="font-mono tracking-widest text-ink">{liga.public_pin}</strong></span>
                                : 'Sin PIN configurado. El alumnado no puede acceder aún.'
                        }
                        icon={Key}
                        tone="sky"
                    >
                        {liga.public_pin ? (
                            <Button variant="outline" className="w-full" onClick={() => void copyToClipboard(liga.public_pin ?? '', 'PIN de acceso')}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar PIN
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full" asChild>
                                <Link to={`/ligas/${liga.id}/configuracion`}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configurar acceso
                                </Link>
                            </Button>
                        )}
                    </ActionTile>

                    <ActionTile
                        title="Fichas de juegos"
                        description={
                            liga.email_fichas
                                ? <span>Envío activo a <strong className="text-ink">{liga.email_fichas}</strong></span>
                                : 'Sin email de recepción. Configura el correo para recibir fichas del alumnado.'
                        }
                        icon={Send}
                        tone="mint"
                    >
                        {liga.email_fichas ? (
                            <div className="flex w-full gap-2">
                                <Button variant="outline" className="flex-1" asChild>
                                    <Link to={`/ligas/${liga.id}/fichas`}>
                                        <Inbox className="h-4 w-4 mr-2" />
                                        Ver fichas
                                    </Link>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => void copyToClipboard(publicGameSheetUrl, 'Enlace del generador')}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full" asChild>
                                <Link to={`/ligas/${liga.id}/configuracion`}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configurar email
                                </Link>
                            </Button>
                        )}
                    </ActionTile>

                    <ActionTile
                        title="Docentes asociados"
                        description="Colaboradores, suplencias y permisos de continuidad docente."
                        icon={UserPlus}
                        tone="sky"
                    >
                        <Button variant="outline" className="w-full" asChild>
                            <Link to={`/ligas/${liga.id}/configuracion?tab=docentes`}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Gestionar docentes
                            </Link>
                        </Button>
                    </ActionTile>

                    <ActionTile
                        title="Puntuaciones"
                        description={
                            <span>
                                V/E/D: <strong className="text-ink">{liga.config?.win_points ?? 3} / {liga.config?.draw_points ?? 2} / {liga.config?.loss_points ?? 1}</strong>
                                {' · '}Árbitro: <strong className="text-ink">{liga.config?.arbitro_points ?? 2}</strong> pts
                            </span>
                        }
                        icon={Trophy}
                        tone="amber"
                    >
                        <Button variant="outline" className="w-full" asChild>
                            <Link to={`/ligas/${liga.id}/configuracion`}>
                                <Settings className="h-4 w-4 mr-2" />
                                Cambiar puntuaciones
                            </Link>
                        </Button>
                    </ActionTile>

                    <ActionTile
                        title="Resultados pendientes"
                        description={
                            teacherPendingCount > 0
                                ? <span className="text-amber-300">{teacherPendingCount} {teacherPendingCount === 1 ? 'resultado enviado por alumnado' : 'resultados enviados por alumnado'} esperando revisión docente.</span>
                                : 'No hay resultados de alumnado pendientes de revisar en esta liga.'
                        }
                        icon={Inbox}
                        tone={teacherPendingCount > 0 ? 'amber' : 'mint'}
                    >
                        {teacherPendingCount > 0 && (
                            <Button variant="outline" className="w-full" asChild>
                                <a href="#gestiones-pendientes-liga">Revisar resultados</a>
                            </Button>
                        )}
                    </ActionTile>

                    <ActionTile
                        title="Sincronización local PWA"
                        description={
                            pendingCount > 0
                                ? <span className="text-amber-300">{pendingCount} {pendingCount === 1 ? 'operación pendiente' : 'operaciones pendientes'} de sincronizar.</span>
                                : 'Todo al día. No hay cambios locales sin guardar.'
                        }
                        icon={Clock}
                        tone={pendingCount > 0 ? 'amber' : 'vio'}
                    >
                        {pendingCount > 0 && (
                            <p className="text-xs text-amber-300/80">Conecta a internet para sincronizar automáticamente.</p>
                        )}
                    </ActionTile>

                        </div>
                    </div>

                </CardContent>
            </Card>

            <Card id="gestiones-pendientes-liga" className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_38px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Gestiones pendientes de esta liga</CardTitle>
                    <CardDescription>
                        Resultados enviados por PIN, logos u otras propuestas que necesitan revisión docente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                    <PendingActionsPanel ligaId={ligaId} />
                </CardContent>
            </Card>

            {/* Acciones secundarias: offline y exportaciones */}
            <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                        variant="outline"
                        onClick={handlePrepareLigaOffline}
                        disabled={!canPrepareOffline || offlineProgress.running}
                        className="justify-start border-sky/25 bg-sky/6 text-sky hover:border-sky/45 hover:bg-sky/10 hover:text-sky"
                    >
                        <Wifi className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">
                            {offlineProgress.running ? 'Preparando...' : offlineMeta ? 'Actualizar offline' : 'Preparar offline'}
                        </span>
                        {offlineMeta && !offlineProgress.running && (
                            <span className="text-[0.65rem] text-sky/60">{offlineMeta.counts.partidos}p · {offlineMeta.counts.equipos}e</span>
                        )}
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} className="justify-start">
                        <FileText className="h-4 w-4 shrink-0" />
                        Exportar PDF
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV} className="justify-start">
                        <FileSpreadsheet className="h-4 w-4 shrink-0" />
                        Exportar CSV
                    </Button>
                </div>
                {offlineMeta && (
                    <p className="text-center text-xs text-sub/50">
                        Offline: {formattedOfflineUpdatedAt} · Caduca {formattedOfflineExpiry}
                        {' · '}
                        <Button variant="ghost" size="sm" onClick={handleClearLigaOffline} className="h-auto p-0 text-xs underline hover:text-sub/80 hover:bg-transparent">Borrar copia</Button>
                    </p>
                )}
                {progressText && <p className="text-center text-xs text-sub/60">{progressText}</p>}
                {!canPrepareOffline && <p className="text-center text-xs text-amber-300/80">Sin conexión para preparar offline.</p>}
                {offlineProgress.errors > 0 && <p className="text-center text-xs text-amber-300/80">Aviso: {offlineProgress.errors} elementos no se pudieron descargar.</p>}
            </div>

            {/* Zona de riesgo compacta */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/6 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Trash2 className="h-4 w-4 shrink-0 text-red-400/50" />
                    <p className="text-sm text-red-300/80">Eliminar la liga borrará equipos, jornadas y partidos asociados.</p>
                </div>
                <Button variant="destructive" size="sm" className="shrink-0" onClick={handleDelete}>
                    Eliminar liga
                </Button>
            </div>
        </div>
    );
}
