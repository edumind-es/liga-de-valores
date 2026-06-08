/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * PendingActionsPanel - Panel for teachers to review pending actions
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    CheckCircle, XCircle, Clock, Image, FileText,
    Loader2, AlertCircle, Trophy, ShieldCheck, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

interface PendingAction {
    id: number;
    action_type: string;
    status: string;
    liga_id: number;
    target_id: number;
    data_json: Record<string, unknown> | null;
    description: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer_notes: string | null;
}

interface PendingActionsPanelProps {
    ligaId?: number;
}

const ACTION_TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    logo: { label: 'Logo de equipo', icon: Image },
    marcador_partido: { label: 'Resultado de partido', icon: Trophy },
    match_data: { label: 'Datos de partido', icon: FileText },
    contract: { label: 'Contrato', icon: FileText },
    game_submission: { label: 'Propuesta de juego', icon: FileText },
};

const EVALUACION_LABELS: Record<string, string> = {
    puntos_juego_limpio_local: 'Juego limpio local',
    puntos_juego_limpio_visitante: 'Juego limpio visitante',
    cumple_minimos_local: 'Mínimos local',
    cumple_minimos_visitante: 'Mínimos visitante',
    arbitro_conocimiento: 'Árbitro: reglas',
    arbitro_gestion: 'Árbitro: gestión',
    arbitro_apoyo: 'Árbitro: apoyo educativo',
    grada_animar_local: 'Grada local: animación',
    grada_respeto_local: 'Grada local: respeto',
    grada_participacion_local: 'Grada local: participación',
    grada_animar_visitante: 'Grada visitante: animación',
    grada_respeto_visitante: 'Grada visitante: respeto',
    grada_participacion_visitante: 'Grada visitante: participación',
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function renderValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

export default function PendingActionsPanel({ ligaId }: PendingActionsPanelProps) {
    const [actions, setActions] = useState<PendingAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchPendingActions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.client.get('/pending-actions', {
                params: {
                    status_filter: 'pending',
                    ...(ligaId ? { liga_id: ligaId } : {}),
                },
            });
            setActions(response.data);
        } catch (error) {
            console.error('Error fetching pending actions:', error);
            toast.error('Error al cargar gestiones pendientes');
        } finally {
            setLoading(false);
        }
    }, [ligaId]);

    useEffect(() => {
        void fetchPendingActions();
        const intervalId = window.setInterval(() => {
            void fetchPendingActions();
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [fetchPendingActions]);

    const handleApprove = async () => {
        if (!selectedAction) return;

        try {
            setProcessing(true);
            await apiClient.client.put(`/pending-actions/${selectedAction.id}/approve`, {
                notes: reviewNotes,
            });
            toast.success('Acción aprobada correctamente');
            setSelectedAction(null);
            setReviewNotes('');
            await fetchPendingActions();
        } catch (error) {
            console.error('Error approving action:', error);
            toast.error('Error al aprobar la acción');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedAction) return;

        try {
            setProcessing(true);
            await apiClient.client.put(`/pending-actions/${selectedAction.id}/reject`, {
                notes: reviewNotes,
            });
            toast.success('Acción rechazada');
            setSelectedAction(null);
            setReviewNotes('');
            await fetchPendingActions();
        } catch (error) {
            console.error('Error rejecting action:', error);
            toast.error('Error al rechazar la acción');
        } finally {
            setProcessing(false);
        }
    };

    const filteredActions = filter === 'all'
        ? actions
        : actions.filter(a => a.action_type === filter);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-lme-border">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Gestiones Pendientes
                        </div>
                        {actions.length > 0 && (
                            <Badge variant="destructive" className="text-sm">
                                {actions.length}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {actions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                            <p>No hay gestiones pendientes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Tabs value={filter} onValueChange={setFilter} className="w-full">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="all">Todas ({actions.length})</TabsTrigger>
                                    <TabsTrigger value="logo">
                                        Logos ({actions.filter(a => a.action_type === 'logo').length})
                                    </TabsTrigger>
                                    <TabsTrigger value="match_data">
                                        Partidos ({actions.filter(a => a.action_type === 'match_data').length})
                                    </TabsTrigger>
                                    <TabsTrigger value="marcador_partido">
                                        Resultados ({actions.filter(a => a.action_type === 'marcador_partido').length})
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="space-y-3">
                                {filteredActions.map(action => {
                                    const typeInfo = ACTION_TYPE_LABELS[action.action_type] ||
                                        { label: action.action_type, icon: AlertCircle };
                                    const TypeIcon = typeInfo.icon;

                                    return (
                                        <div
                                            key={action.id}
                                            className="flex items-center justify-between p-4 bg-lme-surface-soft rounded-lg border border-lme-border hover:border-amber-400/50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedAction(action)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                                    <TypeIcon className="h-5 w-5 text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{typeInfo.label}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {action.description || `ID: ${action.target_id}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm text-muted-foreground">
                                                {formatDate(action.created_at)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Revisar Solicitud</DialogTitle>
                        <DialogDescription>
                            {selectedAction && ACTION_TYPE_LABELS[selectedAction.action_type]?.label}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAction && (
                        <div className="space-y-4">
                            {selectedAction.action_type === 'logo' && selectedAction.data_json?.logo_url ? (
                                <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <img
                                        src={String(selectedAction.data_json.logo_url)}
                                        alt="Logo preview"
                                        className="max-w-[200px] max-h-[200px] rounded"
                                    />
                                </div>
                            ) : null}

                            <div className="text-sm space-y-2">
                                <p><strong>Descripción:</strong> {selectedAction.description || 'Sin descripción'}</p>
                                <p><strong>Fecha:</strong> {formatDate(selectedAction.created_at)}</p>
                                <p><strong>ID destino:</strong> {selectedAction.target_id}</p>
                            </div>

                            {selectedAction.action_type === 'marcador_partido' && (() => {
                                const data = asRecord(selectedAction.data_json);
                                const marcador = asRecord(data.marcador);
                                const evaluacion = asRecord(data.evaluacion);

                                return (
                                    <div className="space-y-4 rounded-lg border border-lme-border bg-lme-surface-soft p-4">
                                        <div className="grid gap-3 text-sm md:grid-cols-2">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Local</p>
                                                <p className="font-semibold">{renderValue(data.equipo_local)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitante</p>
                                                <p className="font-semibold">{renderValue(data.equipo_visitante)}</p>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 text-sm md:grid-cols-3">
                                            <div className="rounded-md border border-lme-border p-3">
                                                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Equipo arbitral
                                                </p>
                                                <p className="font-semibold">{renderValue(data.arbitro || 'No asignado')}</p>
                                            </div>
                                            <div className="rounded-md border border-lme-border p-3">
                                                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                                    <Users className="h-4 w-4" />
                                                    Grada local
                                                </p>
                                                <p className="font-semibold">{renderValue(data.tutor_grada_local || 'No asignada')}</p>
                                            </div>
                                            <div className="rounded-md border border-lme-border p-3">
                                                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                                    <Users className="h-4 w-4" />
                                                    Grada visitante
                                                </p>
                                                <p className="font-semibold">{renderValue(data.tutor_grada_visitante || 'No asignada')}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-2 text-sm font-semibold">Marcador propuesto</p>
                                            <div className="grid max-h-40 gap-2 overflow-auto rounded-md bg-background/60 p-3 text-xs md:grid-cols-2">
                                                {Object.entries(marcador).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between gap-3">
                                                        <span className="text-muted-foreground">{key}</span>
                                                        <span className="font-semibold">{renderValue(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {Object.keys(evaluacion).length > 0 && (
                                            <div>
                                                <p className="mb-2 text-sm font-semibold">Evaluación educativa propuesta</p>
                                                <div className="grid gap-2 rounded-md bg-background/60 p-3 text-xs md:grid-cols-2">
                                                    {Object.entries(evaluacion).map(([key, value]) => (
                                                        <div key={key} className="flex justify-between gap-3">
                                                            <span className="text-muted-foreground">{EVALUACION_LABELS[key] || key}</span>
                                                            <span className="font-semibold">{renderValue(value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {data.observaciones ? (
                                            <div className="rounded-md bg-background/60 p-3 text-sm">
                                                <p className="font-semibold">Observaciones</p>
                                                <p className="text-muted-foreground">{renderValue(data.observaciones)}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })()}

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas (opcional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Añade comentarios sobre tu decisión..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={processing}
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Rechazar
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Aprobar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
