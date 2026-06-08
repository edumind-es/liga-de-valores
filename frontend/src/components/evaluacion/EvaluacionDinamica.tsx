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

/**
 * Componente de evaluación dinámica para partidos con criterios personalizados.
 * Renderiza sliders basados en los criterios definidos en la liga.
 */
import { useState, useEffect, useCallback } from 'react';
import { criteriosApi } from '@/api/criterios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EvaluationRadarChart } from '@/components/charts/EvaluationRadarChart';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getRecord, isLeaguePreparedOffline, saveRecord } from '@/lib/offline/offlineDB';
import type { MatchRoleSchema } from '@/types/liga';
import { getSlotRoleLabel } from '@/utils/matchRoleSchema';

interface CriterioConValor {
    id: number;
    nombre: string;
    codigo: string;
    categoria: string;
    escala_min: number;
    escala_max: number;
    icono?: string;
    valor: number | null;
    equipo_id?: number;
}

interface EvaluacionDinamicaProps {
    partidoId: number;
    ligaId: number;
    equipoLocalNombre?: string;
    equipoVisitanteNombre?: string;
    arbitroNombre?: string;
    tutorGradaLocalNombre?: string;
    tutorGradaVisitanteNombre?: string;
    matchRoleSchema?: MatchRoleSchema;
    onSaved?: () => void;
    disabled?: boolean;
}

export default function EvaluacionDinamica({
    partidoId,
    ligaId,
    equipoLocalNombre = 'Local',
    equipoVisitanteNombre = 'Visitante',
    arbitroNombre,
    tutorGradaLocalNombre,
    tutorGradaVisitanteNombre,
    matchRoleSchema,
    onSaved,
    disabled = false
}: EvaluacionDinamicaProps) {
    const [criterios, setCriterios] = useState<CriterioConValor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modoEvaluacion, setModoEvaluacion] = useState<string>('clasico');
    const [valores, setValores] = useState<Record<string, number>>({});
    const [evaluacionVersion, setEvaluacionVersion] = useState<string | undefined>(undefined);
    const { saveWithOfflineSupport, isOnline } = useOfflineSync();

    const buildValoresFromCriterios = useCallback((criteriosData: CriterioConValor[]) => {
        const initialValores: Record<string, number> = {};
        criteriosData.forEach((c: CriterioConValor) => {
            const key = c.equipo_id ? `${c.id}_${c.equipo_id}` : `${c.id}`;
            initialValores[key] = c.valor ?? Math.floor((c.escala_min + c.escala_max) / 2);
        });
        return initialValores;
    }, []);

    const loadEvaluacion = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await criteriosApi.getEvaluacionPartido(partidoId);
            setModoEvaluacion(data.modo_evaluacion);
            setCriterios(data.criterios);
            setEvaluacionVersion(data.evaluacion_version);

            setValores(buildValoresFromCriterios(data.criterios));
            if (await isLeaguePreparedOffline(ligaId)) {
                await saveRecord(
                    'evaluaciones',
                    'evaluacion_personalizada',
                    partidoId,
                    { partido_id: partidoId, ...data },
                    { syncStatus: 'synced' }
                );
            }
        } catch (error) {
            try {
                const cached = await getRecord<{
                    partido_id: number;
                    criterios: CriterioConValor[];
                    evaluacion_version?: string;
                    modo_evaluacion?: string;
                }>('evaluaciones', 'evaluacion_personalizada', partidoId);
                if (cached?.data?.criterios?.length) {
                    setModoEvaluacion(cached.data.modo_evaluacion || 'personalizado');
                    setCriterios(cached.data.criterios);
                    setEvaluacionVersion(cached.data.evaluacion_version);
                    setValores(buildValoresFromCriterios(cached.data.criterios));
                    if (!isOnline) {
                        toast.info('Cargado desde caché local (modo offline)');
                    }
                    return;
                }
            } catch {
                // ignore cache errors
            }
            console.error('Error loading evaluacion:', error);
            toast.error('Error al cargar los criterios de evaluación');
        } finally {
            setIsLoading(false);
        }
    }, [partidoId, ligaId, buildValoresFromCriterios, isOnline]);

    useEffect(() => {
        loadEvaluacion();
    }, [loadEvaluacion]);

    const handleValorChange = (criterioId: number, equipoId: number | undefined, newValue: number) => {
        const key = equipoId ? `${criterioId}_${equipoId}` : `${criterioId}`;
        setValores(prev => ({ ...prev, [key]: newValue }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (!evaluacionVersion) {
                toast.error('Sincronizando criterios. Inténtalo de nuevo en unos segundos.');
                await loadEvaluacion();
                return;
            }
            const evaluaciones = criterios.map(c => ({
                criterio_id: c.id,
                equipo_id: c.equipo_id,
                valor: valores[c.equipo_id ? `${c.id}_${c.equipo_id}` : `${c.id}`] ?? 0
            }));

            const endpoint = `/partidos/${partidoId}/evaluacion-personalizada?expected_version=${encodeURIComponent(evaluacionVersion)}`;
            const localData = { criterios: evaluaciones, evaluacion_version: evaluacionVersion };

            const result = await saveWithOfflineSupport(
                'evaluaciones',
                'evaluacion_personalizada',
                partidoId,
                evaluaciones,
                {
                    endpoint,
                    method: 'PUT',
                    localData,
                }
            );

            if (!result.success && !result.isOffline) {
                toast.error('Conflicto detectado. Se recargó la versión más reciente.');
                await loadEvaluacion();
                return;
            }

            if (result.isOffline) {
                toast.success('Evaluación guardada localmente. Se sincronizará al recuperar conexión.');
                return;
            }

            const serverData = result.serverData as { criterios?: CriterioConValor[]; evaluacion_version?: string } | undefined;
            if (serverData?.criterios) {
                setCriterios(serverData.criterios);
                setValores(buildValoresFromCriterios(serverData.criterios));
            }
            if (serverData?.evaluacion_version) {
                setEvaluacionVersion(serverData.evaluacion_version);
            }

            toast.success('Evaluación guardada correctamente');
            onSaved?.();
        } catch (error) {
            console.error('Error saving evaluacion:', error);
            toast.error('Error al guardar la evaluación');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (modoEvaluacion === 'clasico') {
        return null; // El modo clásico usa el formulario existente
    }

    if (criterios.length === 0) {
        return (
            <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-6 text-center">
                    <p className="text-sub">
                        Esta liga tiene evaluación personalizada pero no hay criterios definidos.
                        Ve a la configuración de la liga para añadir criterios.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Agrupar criterios por categoría
    const criteriosPorCategoria = criterios.reduce((acc, c) => {
        const cat = c.categoria;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(c);
        return acc;
    }, {} as Record<string, CriterioConValor[]>);

    const categoriaTitulos: Record<string, string> = {
        'general': '📊 Evaluación General',
        'arbitro': `👨‍⚖️ ${getSlotRoleLabel(matchRoleSchema, 'slot_3', 'Arbitro')}`,
        'grada_local': `📣 ${getSlotRoleLabel(matchRoleSchema, 'slot_4', 'Rol local de apoyo')} (${equipoLocalNombre})`,
        'grada_visitante': `📣 ${getSlotRoleLabel(matchRoleSchema, 'slot_5', 'Rol visitante de apoyo')} (${equipoVisitanteNombre})`,
        'jugador': '🏃 Jugadores'
    };

    const slot3Label = getSlotRoleLabel(matchRoleSchema, 'slot_3', 'Arbitro');
    const slot4Label = getSlotRoleLabel(matchRoleSchema, 'slot_4', 'Rol local de apoyo');
    const slot5Label = getSlotRoleLabel(matchRoleSchema, 'slot_5', 'Rol visitante de apoyo');

    // Preparar datos para el radar
    const radarData = criterios.map(c => {
        const key = c.equipo_id ? `${c.id}_${c.equipo_id}` : `${c.id}`;
        // Acortar nombres largos para el gráfico
        let subject = c.nombre;
        if (c.nombre.length > 15) subject = c.nombre.substring(0, 12) + '...';
        if (c.equipo_id && c.categoria.includes('local')) subject += ` (${equipoLocalNombre.substring(0, 3)})`;
        if (c.equipo_id && c.categoria.includes('visitante')) subject += ` (${equipoVisitanteNombre.substring(0, 3)})`;

        return {
            subject,
            A: valores[key] ?? c.escala_min,
            fullMark: c.escala_max
        };
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    ✏️ Evaluación Personalizada
                </CardTitle>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadEvaluacion}
                        disabled={isSaving}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={disabled || isSaving}
                        size="sm"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
                            <ShieldCheck className="h-4 w-4" />
                            {slot3Label}
                        </div>
                        <p className="font-bold text-ink">{arbitroNombre || 'No asignado'}</p>
                        <p className="mt-1 text-xs text-sub">Criterios de arbitraje evaluados por el docente.</p>
                    </div>
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                            <Users className="h-4 w-4" />
                            {slot4Label}
                        </div>
                        <p className="font-bold text-ink">{tutorGradaLocalNombre || 'No asignado'}</p>
                        <p className="mt-1 text-xs text-sub">Observa la grada de {equipoLocalNombre}.</p>
                    </div>
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                            <Users className="h-4 w-4" />
                            {slot5Label}
                        </div>
                        <p className="font-bold text-ink">{tutorGradaVisitanteNombre || 'No asignado'}</p>
                        <p className="mt-1 text-xs text-sub">Observa la grada de {equipoVisitanteNombre}.</p>
                    </div>
                </div>

                {/* Visualización Radar */}
                {criterios.length >= 3 && (
                    <div className="mb-8 flex justify-center">
                        <div className="w-full max-w-md bg-slate-900/20 rounded-xl p-4 border border-slate-700/30">
                            <EvaluationRadarChart data={radarData} color="#10b981" />
                        </div>
                    </div>
                )}

                {Object.entries(criteriosPorCategoria).map(([categoria, criteriosCat]) => (
                    <div key={categoria} className="space-y-4">
                        <h3 className="font-semibold text-ink border-b border-paper/20 pb-2">
                            {categoriaTitulos[categoria] || categoria}
                        </h3>
                        <div className="space-y-4">
                            {criteriosCat.map(criterio => {
                                const key = criterio.equipo_id
                                    ? `${criterio.id}_${criterio.equipo_id}`
                                    : `${criterio.id}`;
                                const valor = valores[key] ?? criterio.escala_min;

                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-ink flex items-center gap-2">
                                                {criterio.icono && <span>{criterio.icono}</span>}
                                                {criterio.nombre}
                                            </label>
                                            <span className="text-lg font-bold text-mint min-w-[3rem] text-right">
                                                {valor}
                                            </span>
                                        </div>
                                        <Slider
                                            value={[valor]}
                                            min={criterio.escala_min}
                                            max={criterio.escala_max}
                                            step={1}
                                            onValueChange={([v]) => handleValorChange(criterio.id, criterio.equipo_id, v)}
                                            disabled={disabled}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-sub">
                                            <span>{criterio.escala_min}</span>
                                            <span>{criterio.escala_max}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
