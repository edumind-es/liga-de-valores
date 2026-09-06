/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Pestaña «Datos de liga»: información general, exportación estadística
 * y zona de riesgo. Extraída de ConfiguracionLiga.tsx sin cambios;
 * el estado vive en el padre.
 */
import { Download, FileSpreadsheet, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Equipo, JornadaWithStats, Liga } from '@/types/liga';
import { SETTINGS_HEADER_CLASSNAME, SETTINGS_PANEL_CLASSNAME } from './constants';

interface TabLigaProps {
    liga: Liga;
    jornadasDisponibles: JornadaWithStats[];
    equiposDisponibles: Equipo[];
    statsJornadaId: string;
    setStatsJornadaId: (value: string) => void;
    statsEquipoId: string;
    setStatsEquipoId: (value: string) => void;
    isExportingStats: boolean;
    isUpdating: boolean;
    onExportStats: (formato: 'csv' | 'pdf') => void;
    onDeleteLiga: () => void;
}

export function TabLiga({
    liga,
    jornadasDisponibles,
    equiposDisponibles,
    statsJornadaId,
    setStatsJornadaId,
    statsEquipoId,
    setStatsEquipoId,
    isExportingStats,
    isUpdating,
    onExportStats,
    onDeleteLiga,
}: TabLigaProps) {
    return (
        <>
            <Card className={SETTINGS_PANEL_CLASSNAME}>
                <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-mint" />
                        Informacion general
                    </CardTitle>
                    <CardDescription>Datos base de la liga para referencia de gestion.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-sub">Nombre de liga</p>
                        <p className="mt-2 text-lg font-semibold text-ink">{liga.nombre}</p>
                    </div>
                    <div className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-sub">Creada el</p>
                        <p className="mt-2 text-lg font-semibold text-ink">
                            {liga.created_at
                                ? new Date(liga.created_at).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })
                                : 'Sin fecha'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className={SETTINGS_PANEL_CLASSNAME}>
                <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-mint" />
                        Exportar datos estadísticos
                    </CardTitle>
                    <CardDescription>
                        Descarga los datos de partidos para análisis en clase: medias, totales, gráficos de evolución por jornada.
                        Compatible con Excel, Google Sheets y cualquier herramienta de cálculo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="stats-jornada">Filtrar por jornada</Label>
                            <Select
                                value={statsJornadaId || 'all'}
                                onValueChange={(v) => setStatsJornadaId(v === 'all' ? '' : v)}
                            >
                                <SelectTrigger id="stats-jornada">
                                    <SelectValue placeholder="Todas las jornadas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las jornadas</SelectItem>
                                    {jornadasDisponibles.map((j) => (
                                        <SelectItem key={j.id} value={String(j.id)}>
                                            {j.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="stats-equipo">Filtrar por equipo</Label>
                            <Select
                                value={statsEquipoId || 'all'}
                                onValueChange={(v) => setStatsEquipoId(v === 'all' ? '' : v)}
                            >
                                <SelectTrigger id="stats-equipo">
                                    <SelectValue placeholder="Todos los equipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los equipos</SelectItem>
                                    {equiposDisponibles.map((e) => (
                                        <SelectItem key={e.id} value={String(e.id)}>
                                            {e.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onExportStats('csv')}
                            disabled={isExportingStats}
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            CSV para Excel/Sheets
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => onExportStats('pdf')}
                            disabled={isExportingStats}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            PDF imprimible
                        </Button>
                    </div>
                    <p className="text-xs text-sub">
                        El CSV incluye: jornada, equipos, marcador, resultado, puntos deportivos, juego limpio, árbitro y grada por partido.
                        Ideal para trabajar medias, máximos y gráficas de evolución en el área de matemáticas.
                    </p>
                </CardContent>
            </Card>

            <Card className="border-red-500/35 bg-red-500/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-200">
                        <Trash2 className="h-5 w-5" />
                        Zona de riesgo
                    </CardTitle>
                    <CardDescription className="text-red-200/85">
                        Eliminar liga borra tambien equipos, jornadas y partidos vinculados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-red-100/90">
                        Usa esta accion solo cuando necesites reiniciar completamente esta competicion.
                    </p>
                    <Button variant="destructive" onClick={onDeleteLiga} disabled={isUpdating}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar liga
                    </Button>
                </CardContent>
            </Card>
        </>
    );
}
