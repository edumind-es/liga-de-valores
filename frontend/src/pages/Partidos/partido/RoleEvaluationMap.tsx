/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Mapa de roles y evaluación del partido. Extraído de VerPartido.tsx sin cambios. */
import { ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function RoleEvaluationMap({
    localName,
    visitanteName,
    arbitroName,
    tutorLocalName,
    tutorVisitanteName,
    slot3Label,
    slot4Label,
    slot5Label,
    showSlot4,
    showSlot5,
}: {
    localName: string;
    visitanteName: string;
    arbitroName?: string;
    tutorLocalName?: string;
    tutorVisitanteName?: string;
    slot3Label: string;
    slot4Label: string;
    slot5Label: string;
    showSlot4: boolean;
    showSlot5: boolean;
}) {
    return (
        <Card className="border-lme-border/90 bg-[rgba(30,27,22,0.74)] shadow-[0_18px_40px_rgba(10,9,7,0.18)]">
            <CardContent className="p-5">
                <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sub">Mapa de roles y evaluación</p>
                        <h2 className="text-lg font-bold text-lme-text">Quién participa y quién evalúa a quién</h2>
                    </div>
                    <p className="text-sm text-sub">El docente valida el resultado deportivo y educativo final.</p>
                </div>
                <div className={`grid grid-cols-1 gap-3 ${showSlot5 ? 'md:grid-cols-3' : showSlot4 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                    <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
                            <ShieldCheck className="h-4 w-4" />
                            {slot3Label}
                        </div>
                        <p className="text-base font-bold text-ink">{arbitroName || 'No asignado'}</p>
                        <p className="mt-1 text-sm text-sub">El docente evalúa su arbitraje: conocimiento, gestión y apoyo educativo.</p>
                    </div>
                    {showSlot4 && (
                        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                                <Users className="h-4 w-4" />
                                {slot4Label}
                            </div>
                            <p className="text-base font-bold text-ink">{tutorLocalName || 'No asignado'}</p>
                            <p className="mt-1 text-sm text-sub">Observa y aporta información sobre la grada de {localName}.</p>
                        </div>
                    )}
                    {showSlot5 && (
                        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                                <Users className="h-4 w-4" />
                                {slot5Label}
                            </div>
                            <p className="text-base font-bold text-ink">{tutorVisitanteName || 'No asignado'}</p>
                            <p className="mt-1 text-sm text-sub">Observa y aporta información sobre la grada de {visitanteName}.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
