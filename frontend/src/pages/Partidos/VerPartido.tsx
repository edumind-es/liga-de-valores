/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { partidosApi } from '../../api/partidos';
import { type PartidoDetailed, type PartidoResponse, type Marcador, type PartidoNota } from '../../types/liga';
import { Trophy, Medal, FileText, Users, Eye, WifiOff, Download, Upload, MessageSquare } from 'lucide-react';
import ScoreboardDisplay from '../Express/scoreboard/ScoreboardDisplay';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/workspace/MetricCard';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLiga } from '@/hooks/useLigas';
import EvaluacionDinamica from '@/components/evaluacion/EvaluacionDinamica';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStore } from '@/hooks/useNetworkStatus';
import { getRecord, isLeaguePreparedOffline, saveRecord } from '@/lib/offline/offlineDB';
import { getImageUrl } from '@/utils/url';
import SportAvatar from '@/components/SportAvatar';
import axios from 'axios';
import { authenticatedFetch } from '@/api/client';
import { getRolesPerMatch, getSlotRoleLabel } from '@/utils/matchRoleSchema';
import { RoleEvaluationMap } from './partido/RoleEvaluationMap';
import { EvaluacionClasicaForm } from './partido/EvaluacionClasicaForm';
import { NotasPartido } from './partido/NotasPartido';

type SaveEvaluacionOptions = {
    silent?: boolean;
    allowBackup?: boolean;
};

const mergeSaveEvaluacionOptions = (
    current: SaveEvaluacionOptions | null,
    incoming: SaveEvaluacionOptions
): SaveEvaluacionOptions => ({
    silent: Boolean(current?.silent ?? true) && Boolean(incoming.silent ?? true),
    allowBackup: Boolean(current?.allowBackup) || Boolean(incoming.allowBackup),
});

export default function VerPartido() {
    const { ligaId, partidoId } = useParams<{ ligaId: string; partidoId: string }>();
    const queryClient = useQueryClient();
    const [partido, setPartido] = useState<PartidoDetailed | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'marcador' | 'evaluacion' | 'notas'>('marcador');
    const [notas, setNotas] = useState<PartidoNota[]>([]);
    const [isLoadingNotas, setIsLoadingNotas] = useState(false);
    const [isModeratingNota, setIsModeratingNota] = useState<number | null>(null);
    const [isOfflineData, setIsOfflineData] = useState(false);

    // Offline sync support
    const { saveWithOfflineSupport, isOnline } = useOfflineSync();
    const { pendingCount, conflictCount } = useNetworkStore();
    const canUseNetworkActions = isOnline;

    // Obtener liga para determinar modo de evaluación
    const { data: liga } = useLiga(ligaId ? parseInt(ligaId) : 0);
    const rolesPerMatch = getRolesPerMatch(liga?.match_role_schema);
    const showSlot4 = rolesPerMatch >= 4;
    const showSlot5 = rolesPerMatch >= 5;
    const slot3Label = getSlotRoleLabel(liga?.match_role_schema, 'slot_3', 'Arbitro');
    const slot4Label = getSlotRoleLabel(liga?.match_role_schema, 'slot_4', 'Rol local de apoyo');
    const slot5Label = getSlotRoleLabel(liga?.match_role_schema, 'slot_5', 'Rol visitante de apoyo');
    const roleCardsGridClass = showSlot5 ? 'md:grid-cols-3' : showSlot4 ? 'md:grid-cols-2' : 'md:grid-cols-1';
    const supportRoleGridClass = showSlot4 && showSlot5 ? 'md:grid-cols-2' : 'md:grid-cols-1';
    const detailCardClassName = 'border-lme-border/90 bg-[rgba(30,27,22,0.74)] shadow-[0_18px_40px_rgba(10,9,7,0.18)]';
    const sectionPanelClassName = 'rounded-2xl border border-lme-border/80 bg-[rgba(30,27,22,0.52)] p-6 shadow-[0_12px_28px_rgba(10,9,7,0.12)]';

    // Marcador state
    const [marcador, setMarcador] = useState<Marcador>({});
    const [marcadorVersion, setMarcadorVersion] = useState<string | undefined>(undefined);
    const marcadorRef = useRef<Marcador>({});

    // Evaluación state
    const [evaluacion, setEvaluacion] = useState({
        puntos_juego_limpio_local: 0,
        puntos_juego_limpio_visitante: 0,
        arbitro_conocimiento: 0,
        arbitro_gestion: 0,
        arbitro_apoyo: 0,
        grada_animar_local: 0,
        grada_respeto_local: 0,
        grada_participacion_local: 0,
        grada_animar_visitante: 0,
        grada_respeto_visitante: 0,
        grada_participacion_visitante: 0
    });
    const [evaluacionVersion, setEvaluacionVersion] = useState<string | undefined>(undefined);
    const lastBackupDownloadRef = useRef<number>(0);
    const lastSaveErrorToastRef = useRef<number>(0);
    const backupFileInputRef = useRef<HTMLInputElement | null>(null);
    const lastEvaluacionSavedRef = useRef<string>('');
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const marcadorVersionRef = useRef<string | undefined>(undefined);
    const marcadorSaveInFlightRef = useRef(false);
    const pendingMarcadorRef = useRef<Marcador | null>(null);
    const marcadorConflictRetryRef = useRef(0);
    const evaluacionSavePromiseRef = useRef<Promise<{ success: boolean; isOffline: boolean; serverData?: unknown }> | null>(null);
    const pendingEvaluacionSaveRef = useRef<SaveEvaluacionOptions | null>(null);

    const invalidateLeagueDerivedQueries = useCallback((targetLigaId?: number) => {
        void queryClient.invalidateQueries({ queryKey: ['partidos'] });
        void queryClient.invalidateQueries({ queryKey: ['clasificacion'] });
        void queryClient.invalidateQueries({ queryKey: ['ligas'] });
        if (targetLigaId) {
            void queryClient.invalidateQueries({ queryKey: ['ligas', targetLigaId] });
        }
    }, [queryClient]);

    const descargarBackupPartido = useCallback((reason: string, backupMarcador?: Marcador, force = false) => {
        if (!partido) return false;

        const now = Date.now();
        if (!force && now - lastBackupDownloadRef.current < 60000) {
            return false;
        }
        lastBackupDownloadRef.current = now;

        const payload = {
            generated_at: new Date(now).toISOString(),
            reason,
            partido: {
                id: partido.id,
                liga_id: partido.liga_id,
                finalizado: partido.finalizado,
                tipo_deporte: {
                    id: partido.tipo_deporte.id,
                    nombre: partido.tipo_deporte.nombre,
                    tipo_marcador: partido.tipo_deporte.tipo_marcador,
                    config: partido.tipo_deporte.config ?? {},
                },
                equipos: {
                    local: { id: partido.equipo_local.id, nombre: partido.equipo_local.nombre },
                    visitante: { id: partido.equipo_visitante.id, nombre: partido.equipo_visitante.nombre },
                },
            },
            marcador: backupMarcador ?? marcador,
            evaluacion,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date(now).toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `backup_partido_${partido.id}_${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
    }, [partido, marcador, evaluacion]);

    const showSaveErrorToast = useCallback((message: string) => {
        const now = Date.now();
        if (now - lastSaveErrorToastRef.current < 12000) {
            return;
        }
        lastSaveErrorToastRef.current = now;
        toast.error(message);
    }, []);

    // Helper to populate state from partido data
    const populateFromData = useCallback((data: PartidoDetailed) => {
        setPartido(data);
        const nextMarcador = data.marcador || {};
        marcadorRef.current = nextMarcador;
        setMarcador(nextMarcador);
        pendingMarcadorRef.current = null;
        marcadorSaveInFlightRef.current = false;
        marcadorConflictRetryRef.current = 0;
        setMarcadorVersion(data.marcador_version);
        marcadorVersionRef.current = data.marcador_version;
        const nextEvaluacion = {
            puntos_juego_limpio_local: data.puntos_juego_limpio_local || 0,
            puntos_juego_limpio_visitante: data.puntos_juego_limpio_visitante || 0,
            arbitro_conocimiento: data.arbitro_conocimiento || 0,
            arbitro_gestion: data.arbitro_gestion || 0,
            arbitro_apoyo: data.arbitro_apoyo || 0,
            grada_animar_local: data.grada_animar_local || 0,
            grada_respeto_local: data.grada_respeto_local || 0,
            grada_participacion_local: data.grada_participacion_local || 0,
            grada_animar_visitante: data.grada_animar_visitante || 0,
            grada_respeto_visitante: data.grada_respeto_visitante || 0,
            grada_participacion_visitante: data.grada_participacion_visitante || 0
        };
        setEvaluacion(nextEvaluacion);
        lastEvaluacionSavedRef.current = JSON.stringify({ ...nextEvaluacion, id: data.id });
        setEvaluacionVersion(data.evaluacion_version);
    }, []);

    useEffect(() => {
        marcadorVersionRef.current = marcadorVersion ?? partido?.marcador_version;
    }, [marcadorVersion, partido?.marcador_version]);

    const loadPartido = useCallback(async (id: number) => {
        setIsLoading(true);
        setIsOfflineData(false);
        setError(null);

        // Try online first
        let onlineAttempted = false;
        let onlineError: unknown = null;
        if (canUseNetworkActions) {
            onlineAttempted = true;
            try {
                const data = await partidosApi.getById(id);
                populateFromData(data);
                if (await isLeaguePreparedOffline(data.liga_id)) {
                    await saveRecord('partidos', 'partido', id, data, { syncStatus: 'synced' });
                }
                setIsLoading(false);
                return;
            } catch (err) {
                onlineError = err;
                console.warn('Online load failed, trying offline cache:', err);
            }
        }

        // Fallback to offline cache
        try {
            const cached = await getRecord<PartidoDetailed>('partidos', 'partido', id);
            if (cached?.data) {
                populateFromData(cached.data);
                setIsOfflineData(true);
                if (!canUseNetworkActions) {
                    toast.info('Cargado desde caché local (modo offline)');
                }
            } else {
                if (!onlineAttempted || !canUseNetworkActions) {
                    setError('Sin conexión. Necesitas preparar esta liga para modo offline antes de poder usar este partido sin red.');
                } else if (axios.isAxiosError(onlineError)) {
                    const status = onlineError.response?.status;
                    if (status === 401 || status === 403) {
                        setError('No tienes sesión activa. Inicia sesión y vuelve a abrir el partido.');
                    } else if (status === 404) {
                        setError('Partido no encontrado en el servidor.');
                    } else {
                        setError('No se pudo cargar el partido desde el servidor y no hay caché local.');
                    }
                } else {
                    setError('No se pudo cargar el partido desde el servidor y no hay caché local.');
                }
            }
        } catch {
            setError('Error al cargar el partido');
        } finally {
            setIsLoading(false);
        }
    }, [canUseNetworkActions, populateFromData]);

    const restaurarBackupPartido = useCallback(async (file: File) => {
        if (!partido) return;

        try {
            const raw = await file.text();
            const parsed = JSON.parse(raw) as {
                partido?: { id?: number };
                marcador?: Marcador;
                evaluacion?: Record<string, number>;
            };

            const backupMatchId = parsed?.partido?.id;
            if (backupMatchId && backupMatchId !== partido.id) {
                const shouldContinue = window.confirm(
                    `Este backup pertenece al partido ${backupMatchId}. ¿Quieres aplicarlo igualmente sobre el partido ${partido.id}?`
                );
                if (!shouldContinue) {
                    return;
                }
            }

            const restoredMarcador = (parsed?.marcador && typeof parsed.marcador === 'object')
                ? parsed.marcador
                : {};

            const restoredEvaluacion = (parsed?.evaluacion && typeof parsed.evaluacion === 'object')
                ? parsed.evaluacion
                : {};

            marcadorRef.current = restoredMarcador;
            setMarcador(restoredMarcador);
            setEvaluacion((prev) => ({ ...prev, ...restoredEvaluacion }));

            const marcadorExpected = marcadorVersion ?? partido.marcador_version;
            const evaluacionExpected = evaluacionVersion ?? partido.evaluacion_version;
            if (!marcadorExpected || !evaluacionExpected) {
                toast.error('No se pudo restaurar: falta versión actual del partido. Recarga y prueba de nuevo.');
                return;
            }

            const marcadorResult = await saveWithOfflineSupport(
                'partidos',
                'partido',
                partido.id,
                { marcador: restoredMarcador, expected_version: marcadorExpected },
                {
                    endpoint: `/partidos/${partido.id}/marcador`,
                    method: 'PUT',
                }
            );

            const evaluacionPayload = {
                ...evaluacion,
                ...restoredEvaluacion,
                id: partido.id,
                expected_version: evaluacionExpected,
            };

            const evaluacionResult = await saveWithOfflineSupport(
                'partidos',
                'evaluacion',
                partido.id,
                evaluacionPayload,
                {
                    endpoint: `/partidos/${partido.id}/evaluacion`,
                    method: 'PUT',
                }
            );

            if (!marcadorResult.success || !evaluacionResult.success) {
                showSaveErrorToast('Backup restaurado localmente. Inicia sesión o revisa conexión para sincronizar.');
                if (descargarBackupPartido('restauracion_con_sincronizacion_pendiente', restoredMarcador)) {
                    toast.info('Se descargó una copia de seguridad tras la restauración.');
                }
                return;
            }

            if (marcadorResult.isOffline || evaluacionResult.isOffline) {
                toast.success('Backup restaurado localmente. Se sincronizará al recuperar conexión.');
            } else {
                toast.success('Backup restaurado y sincronizado correctamente.');
                const marcadorServer = marcadorResult.serverData as Partial<PartidoResponse> | undefined;
                const evaluacionServer = evaluacionResult.serverData as Partial<PartidoResponse> | undefined;
                if (marcadorServer?.marcador_version) {
                    marcadorVersionRef.current = marcadorServer.marcador_version;
                    setMarcadorVersion(marcadorServer.marcador_version);
                }
                if (evaluacionServer?.evaluacion_version) {
                    setEvaluacionVersion(evaluacionServer.evaluacion_version);
                }
                loadPartido(partido.id);
            }
        } catch {
            toast.error('El archivo de backup no es válido.');
        }
    }, [partido, saveWithOfflineSupport, evaluacion, evaluacionVersion, marcadorVersion, showSaveErrorToast, descargarBackupPartido, loadPartido, setMarcadorVersion, setEvaluacionVersion]);

    useEffect(() => {
        if (partidoId) {
            loadPartido(parseInt(partidoId));
        }
    }, [partidoId, loadPartido]);

    useEffect(() => {
        if (activeTab !== 'notas' || !partido) return;
        let cancelled = false;
        setIsLoadingNotas(true);
        partidosApi.getNotas(partido.id)
            .then((data) => { if (!cancelled) setNotas(data); })
            .catch(() => { if (!cancelled) toast.error('No se pudieron cargar las anotaciones'); })
            .finally(() => { if (!cancelled) setIsLoadingNotas(false); });
        return () => { cancelled = true; };
    }, [activeTab, partido]);

    const handleModerarNota = async (notaId: number, estado: 'aprobada' | 'rechazada') => {
        if (!partido) return;
        setIsModeratingNota(notaId);
        try {
            const updated = await partidosApi.updateEstadoNota(partido.id, notaId, estado);
            setNotas((prev) => prev.map((n) => n.id === notaId ? updated : n));
            toast.success(estado === 'aprobada' ? 'Anotación aprobada' : 'Anotación rechazada');
        } catch {
            toast.error('No se pudo moderar la anotación');
        } finally {
            setIsModeratingNota(null);
        }
    };

    const handleEliminarNota = async (notaId: number) => {
        if (!partido) return;
        setIsModeratingNota(notaId);
        try {
            await partidosApi.deleteNota(partido.id, notaId);
            setNotas((prev) => prev.filter((n) => n.id !== notaId));
            toast.success('Anotación eliminada');
        } catch {
            toast.error('No se pudo eliminar la anotación');
        } finally {
            setIsModeratingNota(null);
        }
    };

    useEffect(() => {
        // Keep list views fresh after leaving this detail page (cache staleTime is 5m).
        return () => {
            invalidateLeagueDerivedQueries(partido?.liga_id);
        };
    }, [invalidateLeagueDerivedQueries, partido?.liga_id]);

    const saveEvaluacion = useCallback(async (options: SaveEvaluacionOptions = {}) => {
        if (evaluacionSavePromiseRef.current) {
            pendingEvaluacionSaveRef.current = mergeSaveEvaluacionOptions(pendingEvaluacionSaveRef.current, options);
            return evaluacionSavePromiseRef.current;
        }

        const runSave = async () => {
            if (!partido) return { success: false, isOffline: false };

            const expectedVersion = evaluacionVersion ?? partido.evaluacion_version;
            if (!expectedVersion) {
                toast.error('Sincronizando evaluación. Inténtalo de nuevo en unos segundos.');
                return { success: false, isOffline: false };
            }

            const evaluacionData = {
                ...evaluacion,
                id: partido.id,
                expected_version: expectedVersion,
            };

            const result = await saveWithOfflineSupport(
                'partidos',
                'evaluacion',
                partido.id,
                evaluacionData,
                {
                    endpoint: `/partidos/${partido.id}/evaluacion`,
                    method: 'PUT',
                }
            );

            if (!result.success) {
                showSaveErrorToast('No se pudo guardar la evaluación. Revisa tu sesión e inténtalo de nuevo.');
                if (options.allowBackup && descargarBackupPartido('error_guardado_evaluacion')) {
                    toast.info('Se ha descargado una copia de seguridad local del partido.');
                }
                return result;
            }

            lastEvaluacionSavedRef.current = JSON.stringify({ ...evaluacion, id: partido.id });
            const serverPayload = result.serverData as Partial<PartidoResponse> | undefined;
            if (serverPayload?.evaluacion_version) {
                setEvaluacionVersion(serverPayload.evaluacion_version);
            }

            if (!options.silent) {
                if (result.isOffline) {
                    toast.success('Evaluación guardada localmente. Se sincronizará cuando haya conexión.');
                    if (options.allowBackup && descargarBackupPartido('guardado_offline_evaluacion')) {
                        toast.info('Copia de seguridad descargada automáticamente.');
                    }
                } else {
                    toast.success('Evaluación actualizada correctamente');
                    invalidateLeagueDerivedQueries(partido.liga_id);
                    loadPartido(partido.id);
                }
            }

            return result;
        };

        const promise = runSave();
        evaluacionSavePromiseRef.current = promise;
        try {
            return await promise;
        } finally {
            if (evaluacionSavePromiseRef.current === promise) {
                evaluacionSavePromiseRef.current = null;
            }
            const pendingOptions = pendingEvaluacionSaveRef.current;
            pendingEvaluacionSaveRef.current = null;
            if (pendingOptions) {
                void saveEvaluacion(pendingOptions);
            }
        }
    }, [partido, evaluacion, evaluacionVersion, saveWithOfflineSupport, showSaveErrorToast, descargarBackupPartido, loadPartido, invalidateLeagueDerivedQueries]);

    const handleUpdateEvaluacion = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveEvaluacion({ silent: false, allowBackup: true });
    };

    useEffect(() => {
        if (!partido) return;
        if (partido.finalizado) return;
        if (liga?.modo_evaluacion === 'personalizado') return;

        const serialized = JSON.stringify({ ...evaluacion, id: partido.id });
        if (serialized === lastEvaluacionSavedRef.current) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            saveEvaluacion({ silent: true, allowBackup: false });
        }, 1200);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [evaluacion, partido, liga?.modo_evaluacion, saveEvaluacion]);

    const flushMarcadorQueue = useCallback(async () => {
        if (!partido || marcadorSaveInFlightRef.current) return;

        const queuedMarcador = pendingMarcadorRef.current;
        if (!queuedMarcador) return;

        marcadorSaveInFlightRef.current = true;
        pendingMarcadorRef.current = null;

        const expectedVersion = marcadorVersionRef.current ?? partido.marcador_version;
        if (!expectedVersion) {
            pendingMarcadorRef.current = queuedMarcador;
            marcadorSaveInFlightRef.current = false;
            toast.error('Sincronizando marcador. Inténtalo de nuevo en unos segundos.');
            return;
        }

        const { success, isOffline, serverData } = await saveWithOfflineSupport(
            'partidos',
            'partido',
            partido.id,
            { marcador: queuedMarcador, expected_version: expectedVersion },
            {
                endpoint: `/partidos/${partido.id}/marcador`,
                method: 'PUT',
            }
        );

        if (!success) {
            const serverPayload = serverData as Partial<PartidoResponse> | undefined;
            const serverVersion = serverPayload?.marcador_version;
            const shouldAutoRetryConflict = !isOffline && Boolean(serverVersion) && marcadorConflictRetryRef.current < 1;

            if (shouldAutoRetryConflict && serverVersion) {
                marcadorConflictRetryRef.current += 1;
                marcadorVersionRef.current = serverVersion;
                setMarcadorVersion(serverVersion);
                pendingMarcadorRef.current = pendingMarcadorRef.current ?? queuedMarcador;
            } else {
                marcadorConflictRetryRef.current = 0;
                showSaveErrorToast('No se pudo guardar el marcador. Revisa tu sesión e inténtalo de nuevo.');
                if (descargarBackupPartido('error_guardado_marcador', queuedMarcador)) {
                    toast.info('Se ha descargado una copia de seguridad local del partido.');
                }
            }
        } else if (isOffline) {
            marcadorConflictRetryRef.current = 0;
            if (descargarBackupPartido('guardado_offline_marcador', queuedMarcador)) {
                toast.info('Copia de seguridad descargada automáticamente.');
            }
        } else {
            marcadorConflictRetryRef.current = 0;
            const serverPayload = serverData as Partial<PartidoResponse> | undefined;
            if (serverPayload?.marcador_version) {
                marcadorVersionRef.current = serverPayload.marcador_version;
                setMarcadorVersion(serverPayload.marcador_version);
            }
            invalidateLeagueDerivedQueries(partido.liga_id);
        }

        marcadorSaveInFlightRef.current = false;
        if (pendingMarcadorRef.current) {
            void flushMarcadorQueue();
        }
    }, [partido, saveWithOfflineSupport, showSaveErrorToast, descargarBackupPartido, invalidateLeagueDerivedQueries]);

    const handleMarcadorUpdate = useCallback((updates: Record<string, unknown>) => {
        if (!partido) return;
        const mergedMarcador = { ...marcadorRef.current, ...updates };
        marcadorRef.current = mergedMarcador;
        pendingMarcadorRef.current = mergedMarcador;
        setMarcador(mergedMarcador);
        void flushMarcadorQueue();
    }, [partido, flushMarcadorQueue]);

    if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
    if (error) {
        return (
            <div className="p-8 max-w-2xl mx-auto space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
                    {error}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => {
                            if (partidoId) {
                                loadPartido(parseInt(partidoId));
                            }
                        }}
                    >
                        Reintentar carga
                    </Button>
                    <Button variant="outline" onClick={() => backupFileInputRef.current?.click()}>
                        Restaurar backup
                    </Button>
                </div>
                <input
                    ref={backupFileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await restaurarBackupPartido(file);
                        event.currentTarget.value = '';
                    }}
                />
                <p className="text-xs text-gray-500">
                    Consejo: si visitas la lista de partidos con conexión, se guardará una copia local y no verás este aviso en modo offline.
                </p>
            </div>
        );
    }
    if (!partido) return <div className="p-8 text-center">Partido no encontrado</div>;
    const evaluacionCompleta = Boolean(partido.evaluacion_completa);
    const formattedMatchDate = partido.fecha_hora
        ? new Date(partido.fecha_hora).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : 'Fecha pendiente';
    const syncStatusLabel = !isOnline
        ? 'Offline'
        : isOfflineData
            ? 'Cache local'
            : pendingCount > 0 || conflictCount > 0
                ? 'Pendiente'
                : 'Online';
    const syncSupportText = !isOnline
        ? 'Guardado local'
        : isOfflineData
            ? 'Cargado desde cache'
            : pendingCount > 0 || conflictCount > 0
                ? `${pendingCount} pendientes`
                : 'Sincronizado';
    const evaluationModeLabel = liga?.modo_evaluacion === 'personalizado' ? 'Personalizada' : 'Clasica';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {(!isOnline || isOfflineData || pendingCount > 0 || conflictCount > 0) && (
                <Card className="mb-4 border-amber-400/30 bg-amber-400/10">
                    <CardContent className="flex items-center gap-3 p-4">
                        <WifiOff className="h-5 w-5 flex-shrink-0 text-amber-300" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-200">
                                {!isOnline ? 'Modo sin conexión' : isOfflineData ? 'Datos desde caché' : 'Sincronización pendiente'}
                            </p>
                            <p className="text-xs text-amber-100/80">
                                Los cambios se guardan localmente y se sincronizarán automáticamente al recuperar conexión.
                            </p>
                            {(pendingCount > 0 || conflictCount > 0) && (
                                <p className="mt-1 text-xs text-amber-200">
                                    Pendientes: {pendingCount} · Conflictos: {conflictCount}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="mb-6">
                <Link to={`/ligas/${ligaId}/partidos`} className="inline-flex items-center text-sm text-lme-muted hover:text-lme-primary transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver a partidos
                </Link>
            </div>

            <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                    <SportAvatar nombre={partido.tipo_deporte.nombre} logoFile={partido.tipo_deporte.logo_file} className="h-16 w-16 shrink-0" />
                    <PageHeader
                        eyebrow="Detalle de partido"
                        title={`${partido.equipo_local.nombre} vs ${partido.equipo_visitante.nombre}`}
                        description={`${partido.tipo_deporte.nombre} · ${formattedMatchDate}`}
                        className="mb-0"
                    >
                        <Badge variant={partido.finalizado ? 'success' : 'warning'}>
                            {partido.finalizado ? 'Finalizado' : 'Pendiente'}
                        </Badge>
                        <Badge variant="outline">{evaluationModeLabel}</Badge>
                        <Badge variant={syncStatusLabel === 'Online' ? 'success' : 'secondary'}>
                            {syncStatusLabel}
                        </Badge>
                    </PageHeader>
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-[44rem] xl:justify-end">
                    {partido.tipo_deporte.vt_file && (
                        <Button
                            variant="outline"
                            onClick={() => window.open(getImageUrl(partido.tipo_deporte.vt_file), '_blank')}
                            className="shadow-sm hover:shadow-md transition-all"
                        disabled={!canUseNetworkActions}
                    >
                            <Eye className="h-4 w-4 mr-2" />
                            Visual Thinking
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        disabled={!canUseNetworkActions}
                        onClick={async () => {
                            if (!canUseNetworkActions) {
                                toast.warning('Necesitas conexión para descargar el acta');
                                return;
                            }
                            try {
                                const response = await authenticatedFetch(
                                    `${import.meta.env.VITE_API_URL || '/api/v1'}/partidos/${partido.id}/export/acta`
                                );

                                if (!response.ok) {
                                    toast.error('Error al descargar acta');
                                    return;
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `acta_partido_${partido.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } catch (error) {
                                console.error('Error downloading PDF:', error);
                                toast.error('Error al descargar acta');
                            }
                        }}
                        className="shadow-sm hover:shadow-md transition-all"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Descargar Acta
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            const downloaded = descargarBackupPartido('backup_manual', marcador, true);
                            if (downloaded) {
                                toast.success('Copia de seguridad descargada.');
                            }
                        }}
                        className="shadow-sm hover:shadow-md transition-all"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Backup Marcador
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => backupFileInputRef.current?.click()}
                        className="shadow-sm hover:shadow-md transition-all"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Restaurar Backup
                    </Button>
                    <input
                        ref={backupFileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            await restaurarBackupPartido(file);
                            event.currentTarget.value = '';
                        }}
                    />
                    {!partido.finalizado && (
                        <Button
                            onClick={async () => {
                                // Finalizar requires connection to calculate standings
                                if (!canUseNetworkActions) {
                                    toast.warning('Necesitas conexión para finalizar el partido. Los datos del marcador y evaluación ya están guardados localmente.');
                                    return;
                                }

                                if (!evaluacionCompleta) {
                                    setActiveTab('evaluacion');
                                    toast.info('Por favor, completa y guarda la evaluación educativa antes de finalizar.');
                                    return;
                                }

                                if (!window.confirm('¿Estás seguro de finalizar este partido? Esta acción calculará los puntos finales y actualizará la clasificación.')) {
                                    return;
                                }
                                try {
                                    // Auto-save evaluation before finalizing to ensure data persistence
                                    if (liga?.modo_evaluacion !== 'personalizado') {
                                        const expectedVersion = evaluacionVersion ?? partido.evaluacion_version;
                                        if (!expectedVersion) {
                                            toast.error('No se pudo sincronizar la evaluación. Recarga el partido e inténtalo de nuevo.');
                                            return;
                                        }
                                        const evalResult = await saveWithOfflineSupport(
                                            'partidos',
                                            'evaluacion',
                                            partido.id,
                                            { ...evaluacion, id: partido.id, expected_version: expectedVersion },
                                            {
                                                endpoint: `/partidos/${partido.id}/evaluacion`,
                                                method: 'PUT',
                                            }
                                        );

                                        if (!evalResult.success || evalResult.isOffline) {
                                            showSaveErrorToast('No se pudo sincronizar la evaluación antes de finalizar. Revisa sesión/conexión.');
                                            if (descargarBackupPartido('error_finalizar_evaluacion_pendiente')) {
                                                toast.info('Se descargó una copia de seguridad antes de finalizar.');
                                            }
                                            return;
                                        }
                                        const evalServer = evalResult.serverData as Partial<PartidoResponse> | undefined;
                                        if (evalServer?.evaluacion_version) {
                                            setEvaluacionVersion(evalServer.evaluacion_version);
                                        }
                                    }

                                    await partidosApi.finalizar(partido.id);
                                    toast.success('Partido finalizado correctamente');
                                    loadPartido(partido.id);
                                    invalidateLeagueDerivedQueries(partido.liga_id);
                                } catch (error) {
                                    console.error('Error finalizing match:', error);
                                    toast.error('Error al finalizar el partido');
                                }
                            }}
                            disabled={!canUseNetworkActions || !evaluacionCompleta}
                            className="bg-gradient-to-r from-mint to-sky shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                        >
                            <Trophy className="h-4 w-4 mr-2" />
                            {!canUseNetworkActions
                                ? 'Finalizar (requiere conexión)'
                                : !evaluacionCompleta
                                    ? 'Finalizar (completa evaluación)'
                                    : 'Finalizar Partido'}
                        </Button>
                    )}
                    {partido.finalizado && (
                        <div className="px-4 py-2 rounded-lg bg-mint/20 text-mint font-semibold flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Partido Finalizado
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Estado"
                    value={partido.finalizado ? 'Cerrado' : 'Abierto'}
                    support={evaluacionCompleta ? 'Evaluacion completa' : 'Evaluacion pendiente'}
                    icon={Trophy}
                    tone={partido.finalizado ? 'mint' : 'amber'}
                />
                <MetricCard
                    label="Sincronizacion"
                    value={syncStatusLabel}
                    support={syncSupportText}
                    icon={WifiOff}
                    tone={syncStatusLabel === 'Online' ? 'sky' : 'amber'}
                />
                <MetricCard
                    label="Evaluacion"
                    value={evaluationModeLabel}
                    support={liga?.modo_evaluacion === 'personalizado' ? 'Rubrica dinamica' : 'Bloque clasico'}
                    icon={Medal}
                    tone="vio"
                />
                <MetricCard
                    label="Formato"
                    value={`${rolesPerMatch} roles`}
                    support="Distribucion activa del partido"
                    icon={Users}
                    tone="slate"
                />
            </div>

            {!partido.finalizado && (
                <Card className="mb-6 border-sky/30 bg-sky/10">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-sky-100">
                            El marcador y la evaluación se guardan en tiempo real, pero la clasificación y el acta final se consolidan al pulsar "Finalizar Partido".
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="mb-6">
                <RoleEvaluationMap
                    localName={partido.equipo_local.nombre}
                    visitanteName={partido.equipo_visitante.nombre}
                    arbitroName={partido.arbitro?.nombre}
                    tutorLocalName={partido.tutor_grada_local?.nombre}
                    tutorVisitanteName={partido.tutor_grada_visitante?.nombre}
                    slot3Label={slot3Label}
                    slot4Label={slot4Label}
                    slot5Label={slot5Label}
                    showSlot4={showSlot4}
                    showSlot5={showSlot5}
                />
            </div>

            {/* Sport-Specific Scoreboard with Timer */}
            <div className="mb-8">
                <ScoreboardDisplay
                    tipo={partido.tipo_deporte.tipo_marcador}
                    marcador={marcador}
                    config={partido.tipo_deporte.config ?? undefined}
                    onUpdate={handleMarcadorUpdate}
                    equipoLocalNombre={partido.equipo_local.nombre}
                    equipoVisitanteNombre={partido.equipo_visitante.nombre}
                />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'marcador' | 'evaluacion' | 'notas')} className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border-lme-border/90 bg-[rgba(30,27,22,0.74)] p-1.5 shadow-[0_18px_40px_rgba(10,9,7,0.18)]">
                    <TabsTrigger value="marcador" className="min-h-[3rem] rounded-xl">
                        <Trophy className="mr-2 h-4 w-4" />
                        Marcador deportivo
                    </TabsTrigger>
                    <TabsTrigger value="evaluacion" className="min-h-[3rem] rounded-xl">
                        <Medal className="mr-2 h-4 w-4" />
                        Evaluacion educativa
                    </TabsTrigger>
                    <TabsTrigger value="notas" className="relative min-h-[3rem] rounded-xl">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Anotaciones
                        {notas.filter((n) => n.estado === 'pendiente').length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                                {notas.filter((n) => n.estado === 'pendiente').length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <Card className={`${detailCardClassName} overflow-hidden`}>
                    <CardContent className="p-6">
                    <TabsContent value="marcador" className="mt-0">
                        <div className="text-center py-12">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sub">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <p className="mb-2 font-medium text-lme-text">Control del marcador</p>
                            <p className="text-sm text-sub">Utiliza los controles en el marcador superior para actualizar los resultados en tiempo real.</p>
                            <p className="mt-2 text-xs text-sub">
                                Los cambios se guardan automáticamente{!isOnline && ' (modo offline - se sincronizará al recuperar conexión)'}.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="evaluacion" className="mt-0">
                        <>
                            {/* Evaluación Personalizada */}
                            {liga?.modo_evaluacion === 'personalizado' && partido && (
                                <EvaluacionDinamica
                                    partidoId={partido.id}
                                    ligaId={partido.liga_id}
                                    equipoLocalNombre={partido.equipo_local.nombre}
                                    equipoVisitanteNombre={partido.equipo_visitante.nombre}
                                    arbitroNombre={partido.arbitro?.nombre}
                                    tutorGradaLocalNombre={partido.tutor_grada_local?.nombre}
                                    tutorGradaVisitanteNombre={partido.tutor_grada_visitante?.nombre}
                                    matchRoleSchema={liga?.match_role_schema}
                                    onSaved={() => loadPartido(partido.id)}
                                    disabled={partido.finalizado}
                                />
                            )}

                            {/* Evaluación Clásica */}
                            {liga?.modo_evaluacion !== 'personalizado' && (
                                <EvaluacionClasicaForm
                                    partido={partido}
                                    evaluacion={evaluacion}
                                    setEvaluacion={setEvaluacion}
                                    isOnline={isOnline}
                                    onSubmit={handleUpdateEvaluacion}
                                    slot3Label={slot3Label}
                                    slot4Label={slot4Label}
                                    slot5Label={slot5Label}
                                    showSlot4={showSlot4}
                                    showSlot5={showSlot5}
                                    roleCardsGridClass={roleCardsGridClass}
                                    supportRoleGridClass={supportRoleGridClass}
                                    sectionPanelClassName={sectionPanelClassName}
                                />
                            )}
                        </>
                    </TabsContent>

                    <TabsContent value="notas" className="mt-0">
                        <NotasPartido
                            notas={notas}
                            isLoadingNotas={isLoadingNotas}
                            isModeratingNota={isModeratingNota}
                            onModerar={handleModerarNota}
                            onEliminar={handleEliminarNota}
                        />
                    </TabsContent>
                </CardContent>
            </Card>
            </Tabs>
        </div>
    );
}

