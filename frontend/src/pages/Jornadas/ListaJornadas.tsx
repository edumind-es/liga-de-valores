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
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Trash2, Wand2, Loader2, ChevronDown, ChevronUp, Trophy, Clock, Edit } from 'lucide-react';
import { useJornadas, useDeleteJornada, useGenerateCalendarioJornada } from '@/hooks/useJornadas';
import { useLiga } from '@/hooks/useLigas';
import { usePartidos } from '@/hooks/usePartidos';
import { useTiposDeporte } from '@/hooks/useTiposDeporte';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/apiUtils';

export default function ListaJornadas() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const id = ligaId ? parseInt(ligaId) : 0;

    const { data: liga, isLoading: isLoadingLiga } = useLiga(id);
    const { data: jornadas, isLoading: isLoadingJornadas } = useJornadas(id);
    const { data: partidos, isLoading: isLoadingPartidos } = usePartidos(id);
    const { data: tiposDeporte } = useTiposDeporte();

    const deleteJornada = useDeleteJornada();
    const generateCalendario = useGenerateCalendarioJornada();

    const [selectedJornadaId, setSelectedJornadaId] = useState<number | null>(null);
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [selectedSport, setSelectedSport] = useState<string>('');
    const [expandedJornada, setExpandedJornada] = useState<number | null>(null);

    const toggleJornada = (jornadaId: number) => {
        if (expandedJornada === jornadaId) {
            setExpandedJornada(null);
        } else {
            setExpandedJornada(jornadaId);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta jornada? Se borrarán todos los partidos asociados.')) {
            return;
        }
        try {
            await deleteJornada.mutateAsync(id);
            toast.success('Jornada eliminada');
        } catch {
            toast.error('Error al eliminar la jornada');
        }
    };

    const handleOpenGenerate = (jornadaId: number) => {
        setSelectedJornadaId(jornadaId);
        setIsGenerateOpen(true);
    };

    const handleGenerateCalendar = async () => {
        if (!selectedSport || !selectedJornadaId) {
            toast.error('Debes seleccionar un deporte');
            return;
        }

        try {
            await generateCalendario.mutateAsync({
                jornadaId: selectedJornadaId,
                tipoDeporteId: parseInt(selectedSport)
            });
            toast.success('Partidos generados exitosamente para la jornada');
            setIsGenerateOpen(false);
            setSelectedSport('');
            setSelectedJornadaId(null);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    if (isLoadingLiga || isLoadingJornadas || isLoadingPartidos) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-mint" />
                    <p className="text-sub text-sm">Cargando jornadas...</p>
                </div>
            </div>
        );
    }

    if (!liga) {
        return (
            <div className="p-8 text-center rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="font-semibold text-red-400">Liga no encontrada</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="mb-6">
                <Link to={`/ligas/${liga.id}`} className="inline-flex items-center text-sm text-sub hover:text-mint transition-colors no-underline">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Volver a la liga
                </Link>
            </div>

            <PageHeader
                title="Calendario de Jornadas"
                description={`Gestiona los partidos y jornadas de ${liga.nombre}`}
            >
                <Link to={`/ligas/${liga.id}/jornadas/crear`}>
                    <Button className="gap-2">
                        <Plus className="h-5 w-5" />
                        Nueva Jornada
                    </Button>
                </Link>
            </PageHeader>

            <div className="grid gap-6">
                {jornadas?.map((jornada) => {
                    const jornadaPartidos = partidos?.filter(p => p.jornada_id === jornada.id) || [];
                    const isExpanded = expandedJornada === jornada.id;

                    return (
                        <Card key={jornada.id} variant="elevated" className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-mint/50' : ''}`}>
                            <CardContent className="p-0">
                                <div
                                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => toggleJornada(jornada.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl transition-colors ${isExpanded ? 'bg-mint/20 text-mint' : 'bg-vio/20 text-vio'}`}>
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-ink">{jornada.nombre}</h3>
                                            <div className="flex items-center gap-3 text-sm text-sub mt-1">
                                                <span>
                                                    {jornada.fecha_inicio ? new Date(jornada.fecha_inicio).toLocaleDateString() : 'Sin fecha'}
                                                </span>
                                                <span className="text-sub/30">|</span>
                                                <Badge variant="secondary" className="bg-lme-surface-soft border-lme-border">
                                                    {jornadaPartidos.length} partidos
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenGenerate(jornada.id);
                                            }}
                                            className="gap-2 hidden sm:flex"
                                        >
                                            <Wand2 className="h-4 w-4" />
                                            Generar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-sub hover:text-red-400 hover:bg-red-500/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(jornada.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className="text-sub px-2">
                                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content: Partidos List */}
                                {isExpanded && (
                                    <div className="border-t border-lme-border bg-lme-surface-soft/30 p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                        {jornadaPartidos.length > 0 ? (
                                            jornadaPartidos.map((partido) => (
                                                <div
                                                    key={partido.id}
                                                    className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-lme-surface border border-lme-border hover:border-mint/30 transition-all gap-4"
                                                >
                                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                                        {partido.finalizado ? (
                                                            <Badge className="bg-mint/10 text-mint border-mint/20 shrink-0">
                                                                <Trophy className="h-3 w-3 mr-1" /> Fin
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-sub shrink-0">
                                                                <Clock className="h-3 w-3 mr-1" /> Pendiente
                                                            </Badge>
                                                        )}
                                                        <span className="text-xs text-sub hidden md:inline-block">
                                                            {partido.tipo_deporte?.nombre}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-center flex-1 gap-4 md:gap-8 w-full md:w-auto">
                                                        <div className="flex-1 text-right font-semibold text-ink truncate">
                                                            {partido.equipo_local.nombre}
                                                        </div>

                                                        <div className="flex items-center gap-3 px-3 py-1 bg-bg0/50 rounded-lg border border-lme-border">
                                                            <span className={`text-xl font-bold ${partido.finalizado ? 'text-mint' : 'text-sub'}`}>
                                                                {partido.finalizado ? (partido.marcador_local ?? partido.puntos_local) : '-'}
                                                            </span>
                                                            <span className="text-sub/50 text-xs">vs</span>
                                                            <span className={`text-xl font-bold ${partido.finalizado ? 'text-mint' : 'text-sub'}`}>
                                                                {partido.finalizado ? (partido.marcador_visitante ?? partido.puntos_visitante) : '-'}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 text-left font-semibold text-ink truncate">
                                                            {partido.equipo_visitante.nombre}
                                                        </div>
                                                    </div>

                                                    <div className="w-full md:w-auto flex justify-end">
                                                        <Link to={`/ligas/${liga.id}/partidos/${partido.id}`}>
                                                            <Button size="sm" variant="ghost" className="hover:text-mint hover:bg-mint/10">
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Gestionar
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-sub">
                                                <p>No hay partidos en esta jornada.</p>
                                                <Button
                                                    variant="link"
                                                    onClick={() => handleOpenGenerate(jornada.id)}
                                                    className="text-mint hover:text-white"
                                                >
                                                    Generar partidos automáticamente
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {(!jornadas || jornadas.length === 0) && (
                    <Card variant="glass" className="text-center py-16 border-dashed">
                        <CardContent className="flex flex-col items-center">
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-vio/20 to-edufis-mental-end/20 border border-vio/20 mb-6">
                                <Calendar className="h-12 w-12 text-vio" />
                            </div>
                            <h3 className="text-2xl font-bold text-ink mb-2">No hay jornadas</h3>
                            <p className="text-sub max-w-md">
                                Genera un calendario automático o crea jornadas manualmente.
                            </p>
                            <Link to={`/ligas/${liga.id}/jornadas/crear`} className="mt-6">
                                <Button size="lg" className="gap-2">
                                    <Plus className="h-5 w-5" />
                                    Crear Jornada
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialog para generar calendario de una jornada */}
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generar Partidos Automáticamente</DialogTitle>
                        <DialogDescription>
                            Para ligas multideporte: se generan todas las combinaciones posibles con rotación equitativa de roles.
                            Para ligas de un solo deporte: se usa Round Robin tradicional.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="sport">Deporte</Label>
                            <SearchableSelect
                                value={selectedSport}
                                onValueChange={setSelectedSport}
                                placeholder="Selecciona un deporte"
                                searchPlaceholder="Buscar deporte para generar la jornada..."
                                emptyText="No se encontraron deportes"
                                options={(tiposDeporte ?? []).map((sport) => ({
                                    value: sport.id.toString(),
                                    label: sport.nombre,
                                    description: `${sport.codigo} · ${sport.tipo_marcador}`,
                                    keywords: [sport.codigo, sport.tipo_marcador],
                                }))}
                            />
                            <p className="text-sm text-sub">
                                Se requieren mínimo 3 equipos para ligas multideporte o 4 para ligas de un solo deporte.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleGenerateCalendar}
                            disabled={generateCalendario.isPending || !selectedSport}
                        >
                            {generateCalendario.isPending ? 'Generando...' : 'Generar Partidos'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
