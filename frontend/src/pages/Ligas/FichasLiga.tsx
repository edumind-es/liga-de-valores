/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Download,
    AlertTriangle,
    FileText,
    Filter,
    Loader2,
    Package,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/workspace/MetricCard';
import { buildApiUrl } from '@/utils/url';

interface FichaItem {
    id: number;
    title: string;
    sport_name: string | null;
    created_at: string | null;
    email_enviado: boolean;
    email_error: string | null;
    is_public: boolean;
    moderation_required: boolean;
    has_graphics: boolean;
}

interface FichasResponse {
    items: FichaItem[];
    total: number;
    page: number;
    pages: number;
    summary: {
        total: number;
        email_ok: number;
        email_fail: number;
    };
}

type FiltroEmail = 'todos' | 'ok' | 'fallo';

export default function FichasLiga() {
    const { id: ligaId } = useParams<{ id: string }>();
    const [data, setData] = useState<FichasResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filtro, setFiltro] = useState<FiltroEmail>('todos');
    const [page, setPage] = useState(1);
    const [reenviando, setReenviando] = useState<number | null>(null);
    const [exportandoZip, setExportandoZip] = useState(false);

    const fetchFichas = async (currentPage: number, currentFiltro: FiltroEmail) => {
        if (!ligaId) return;
        setIsLoading(true);
        try {
            const params: Record<string, string | number> = { page: currentPage, limit: 30 };
            if (currentFiltro === 'ok') params.email_enviado = 'true';
            if (currentFiltro === 'fallo') params.email_enviado = 'false';

            const res = await axios.get(
                buildApiUrl(`/game-resources/ligas/${ligaId}/fichas`),
                { params, withCredentials: true }
            );
            setData(res.data);
        } catch {
            toast.error('Error al cargar las fichas');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        void fetchFichas(1, filtro);
        // fetchFichas se declara en el scope del componente; ligaId y filtro son las dependencias reales
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ligaId, filtro]);

    const handleResend = async (fichaId: number) => {
        if (!ligaId) return;
        setReenviando(fichaId);
        try {
            await axios.post(
                buildApiUrl(`/game-resources/ligas/${ligaId}/fichas/${fichaId}/resend-email`),
                {},
                { withCredentials: true }
            );
            toast.success('Reenvío en proceso. Recibirás el email en breves segundos.');
            // Actualizar localmente el estado para feedback inmediato
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    items: prev.items.map(f =>
                        f.id === fichaId ? { ...f, email_enviado: true, email_error: null } : f
                    ),
                };
            });
        } catch {
            toast.error('Error al reenviar. Inténtalo de nuevo.');
        } finally {
            setReenviando(null);
        }
    };

    const handleDownloadPdf = (fichaId: number) => {
        const url = buildApiUrl(`/game-resources/ligas/${ligaId}/fichas/${fichaId}/pdf`);
        window.open(url, '_blank');
    };

    const handleExportZip = async () => {
        if (!ligaId) return;
        setExportandoZip(true);
        toast.info('Generando ZIP... puede tardar hasta 1 minuto para ligas grandes.');
        try {
            const response = await axios.get(
                buildApiUrl(`/game-resources/ligas/${ligaId}/fichas/export-zip`),
                { responseType: 'blob', withCredentials: true, timeout: 300_000 }
            );
            // Obtener nombre del archivo desde la cabecera Content-Disposition
            const disposition = response.headers['content-disposition'] as string | undefined;
            let filename = 'fichas_export.zip';
            if (disposition) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match) filename = match[1];
            }
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('ZIP descargado correctamente');
        } catch {
            toast.error('Error al generar el ZIP. Inténtalo de nuevo.');
        } finally {
            setExportandoZip(false);
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const summary = data?.summary;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${ligaId}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a la liga
                </Link>
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <PageHeader
                    eyebrow="Panel docente"
                    title="Fichas recibidas"
                    description="Fichas de juego enviadas por el alumnado. Puedes reenviar las que no llegaron por email."
                />
                <Button
                    onClick={handleExportZip}
                    disabled={exportandoZip || !data?.summary?.total}
                    className="shrink-0 gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                >
                    {exportandoZip
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando ZIP...</>
                        : <><Package className="h-4 w-4" /> Descargar todas en ZIP</>
                    }
                </Button>
            </div>

            {/* Métricas resumen */}
            {summary && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard
                        label="Total recibidas"
                        value={summary.total}
                        support="Fichas guardadas en base de datos"
                        icon={FileText}
                        tone="sky"
                    />
                    <MetricCard
                        label="Email entregado"
                        value={summary.email_ok}
                        support="Confirmado que llegó al docente"
                        icon={CheckCircle2}
                        tone="mint"
                    />
                    <MetricCard
                        label="Sin confirmar"
                        value={summary.email_fail}
                        support={summary.email_fail > 0 ? 'Usa el botón de reenvío' : 'Todo correcto'}
                        icon={summary.email_fail > 0 ? XCircle : CheckCircle2}
                        tone={summary.email_fail > 0 ? 'amber' : 'mint'}
                    />
                </div>
            )}

            {/* Filtros */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter className="h-4 w-4" /> Filtrar fichas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {(['todos', 'ok', 'fallo'] as FiltroEmail[]).map(f => (
                            <Button
                                key={f}
                                size="sm"
                                variant={filtro === f ? 'default' : 'outline'}
                                onClick={() => setFiltro(f)}
                            >
                                {f === 'todos' && 'Todas'}
                                {f === 'ok' && <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />Email OK</>}
                                {f === 'fallo' && <><XCircle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />Sin confirmar</>}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de fichas */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {isLoading ? 'Cargando...' : `${data?.total ?? 0} fichas`}
                    </CardTitle>
                    <CardDescription>
                        {filtro === 'fallo' && (
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                                Estas fichas están guardadas en BD pero el email pudo no llegar. Usa el botón de reenvío.
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : !data?.items.length ? (
                        <p className="text-center text-muted-foreground py-12">
                            No hay fichas con este filtro.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="text-left py-2 pr-4 font-medium">Juego</th>
                                        <th className="text-left py-2 pr-4 font-medium hidden md:table-cell">Deporte</th>
                                        <th className="text-left py-2 pr-4 font-medium hidden lg:table-cell">Fecha</th>
                                        <th className="text-left py-2 pr-4 font-medium">Estado</th>
                                        <th className="text-right py-2 font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.items.map(ficha => (
                                        <tr key={ficha.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{ficha.title}</span>
                                                    <div className="flex gap-1">
                                                        {ficha.is_public && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Wiki</Badge>
                                                        )}
                                                        {ficha.moderation_required && (
                                                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">Revisión</Badge>
                                                        )}
                                                        {ficha.has_graphics && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Dibujo</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                                                {ficha.sport_name ?? '—'}
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                                                {formatDate(ficha.created_at)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                {ficha.email_enviado ? (
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Entregado</span>
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
                                                        title={ficha.email_error ?? 'Error desconocido'}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Sin confirmar</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title="Descargar PDF"
                                                        onClick={() => handleDownloadPdf(ficha.id)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    {!ficha.email_enviado && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            title="Reenviar email"
                                                            disabled={reenviando === ficha.id}
                                                            onClick={() => handleResend(ficha.id)}
                                                            className="gap-1.5"
                                                        >
                                                            {reenviando === ficha.id
                                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                : <RefreshCw className="h-3.5 w-3.5" />
                                                            }
                                                            <span className="hidden sm:inline">Reenviar</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    {data && data.pages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-6">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => {
                                    const prev = page - 1;
                                    setPage(prev);
                                    void fetchFichas(prev, filtro);
                                }}
                            >
                                Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Página {page} de {data.pages}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === data.pages}
                                onClick={() => {
                                    const next = page + 1;
                                    setPage(next);
                                    void fetchFichas(next, filtro);
                                }}
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
