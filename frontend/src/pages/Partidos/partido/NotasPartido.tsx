/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Pestaña de anotaciones del partido (moderación LOPD/RGPD).
 * Extraída de VerPartido.tsx sin cambios; el estado vive en el padre.
 */
import { CheckCircle2, MessageSquare, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PartidoNota } from '../../../types/liga';

interface NotasPartidoProps {
    notas: PartidoNota[];
    isLoadingNotas: boolean;
    isModeratingNota: number | null;
    onModerar: (notaId: number, estado: 'aprobada' | 'rechazada') => void;
    onEliminar: (notaId: number) => void;
}

export function NotasPartido({ notas, isLoadingNotas, isModeratingNota, onModerar, onEliminar }: NotasPartidoProps) {
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-lme-border/60 bg-[rgba(30,27,22,0.52)] p-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-mint flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">Privacidad y LOPD/RGPD</p>
                        <p className="text-xs text-sub leading-relaxed">
                            Las anotaciones son anónimas: no se almacenan datos personales del alumno (sin nombre, sin IP, sin identificador de sesión).
                            Ninguna anotación es visible sin tu aprobación previa. Las rechazadas se eliminan automáticamente a los 30 días.
                        </p>
                    </div>
                </div>
            </div>

            {isLoadingNotas ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-20 rounded-lg border border-lme-border animate-pulse bg-[rgba(30,27,22,0.4)]" />
                    ))}
                </div>
            ) : notas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-lme-border bg-[rgba(28,25,21,0.45)] p-8 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-sub/60 mb-3" />
                    <p className="text-sm text-sub">Sin anotaciones todavía.</p>
                    <p className="text-xs text-sub/70 mt-1">El alumnado puede enviar observaciones desde la vista pública del partido (PIN).</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(['pendiente', 'aprobada', 'rechazada'] as const).map((seccion) => {
                        const notasSeccion = notas.filter((n) => n.estado === seccion);
                        if (notasSeccion.length === 0) return null;
                        const seccionLabel = seccion === 'pendiente' ? 'Pendientes de revisión' : seccion === 'aprobada' ? 'Aprobadas' : 'Rechazadas';
                        const seccionColor = seccion === 'pendiente' ? 'text-amber-300' : seccion === 'aprobada' ? 'text-mint' : 'text-red-300';
                        return (
                            <div key={seccion} className="space-y-2">
                                <p className={`text-xs font-semibold uppercase tracking-wider ${seccionColor}`}>{seccionLabel}</p>
                                {notasSeccion.map((nota) => (
                                    <div key={nota.id} className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.58)] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="inline-flex items-center rounded-md border border-lme-border/60 bg-[rgba(32,28,23,0.6)] px-2 py-0.5 text-[10px] text-sub uppercase tracking-wider">
                                                        {nota.tipo}
                                                    </span>
                                                    <span className="text-[10px] text-sub">
                                                        {nota.origen === 'publico' ? 'Vía PIN (alumnado)' : 'Docente'}
                                                    </span>
                                                    <span className="text-[10px] text-sub ml-auto">
                                                        {new Date(nota.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-ink leading-relaxed break-words">{nota.contenido}</p>
                                            </div>
                                        </div>
                                        {nota.estado === 'pendiente' && (
                                            <div className="mt-3 flex gap-2 border-t border-lme-border/50 pt-3">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-mint/40 text-mint hover:border-mint/70 hover:bg-mint/8"
                                                    onClick={() => onModerar(nota.id, 'aprobada')}
                                                    disabled={isModeratingNota === nota.id}
                                                >
                                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                                    Aprobar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-500/35 text-red-300 hover:border-red-500/60 hover:bg-red-500/10"
                                                    onClick={() => onModerar(nota.id, 'rechazada')}
                                                    disabled={isModeratingNota === nota.id}
                                                >
                                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                                    Rechazar
                                                </Button>
                                            </div>
                                        )}
                                        {nota.estado !== 'pendiente' && (
                                            <div className="mt-3 flex justify-end border-t border-lme-border/50 pt-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-sub hover:text-red-300"
                                                    onClick={() => onEliminar(nota.id)}
                                                    disabled={isModeratingNota === nota.id}
                                                >
                                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                                    Eliminar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
