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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Minus, Plus, Share2, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import SportAvatar from '@/components/SportAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { ExpressMatch } from '@/types/express';

type TeamSide = 'local' | 'visitante';
type ArbitroCriteria = 'conocimiento' | 'gestion' | 'apoyo';
type GradaCriteria = 'animar' | 'respeto' | 'participacion';

interface EvaluacionesState {
    juego_limpio: Record<TeamSide, number>;
    arbitro: Record<ArbitroCriteria, number>;
    grada: {
        local: Record<GradaCriteria, number>;
        visitante: Record<GradaCriteria, number>;
    };
}

const DEFAULT_EVALUACIONES: EvaluacionesState = {
    juego_limpio: { local: 5, visitante: 5 },
    arbitro: { conocimiento: 5, gestion: 5, apoyo: 5 },
    grada: {
        local: { animar: 5, respeto: 5, participacion: 5 },
        visitante: { animar: 5, respeto: 5, participacion: 5 },
    },
};

const ARBITRO_CRITERIA: ArbitroCriteria[] = ['conocimiento', 'gestion', 'apoyo'];
const GRADA_CRITERIA: GradaCriteria[] = ['animar', 'respeto', 'participacion'];

const ARBITRO_LABELS: Record<ArbitroCriteria, string> = {
    conocimiento: 'Conocimiento',
    gestion: 'Gestión',
    apoyo: 'Apoyo',
};

const GRADA_LABELS: Record<GradaCriteria, string> = {
    animar: 'Anima con respeto',
    respeto: 'Respeta a rivales y árbitro',
    participacion: 'Participa y cuida el ambiente',
};

const readMatchFromSession = (matchId?: string): ExpressMatch | null => {
    if (!matchId) return null;
    const data = sessionStorage.getItem(`express_match_${matchId}`);
    if (!data) return null;
    try {
        return JSON.parse(data) as ExpressMatch;
    } catch {
        return null;
    }
};

const mergeEvaluaciones = (input?: ExpressMatch['evaluaciones']): EvaluacionesState => ({
    juego_limpio: {
        local: input?.juego_limpio?.local ?? DEFAULT_EVALUACIONES.juego_limpio.local,
        visitante: input?.juego_limpio?.visitante ?? DEFAULT_EVALUACIONES.juego_limpio.visitante,
    },
    arbitro: {
        conocimiento: input?.arbitro?.conocimiento ?? DEFAULT_EVALUACIONES.arbitro.conocimiento,
        gestion: input?.arbitro?.gestion ?? DEFAULT_EVALUACIONES.arbitro.gestion,
        apoyo: input?.arbitro?.apoyo ?? DEFAULT_EVALUACIONES.arbitro.apoyo,
    },
    grada: {
        local: {
            animar: input?.grada?.local?.animar ?? DEFAULT_EVALUACIONES.grada.local.animar,
            respeto: input?.grada?.local?.respeto ?? DEFAULT_EVALUACIONES.grada.local.respeto,
            participacion: input?.grada?.local?.participacion ?? DEFAULT_EVALUACIONES.grada.local.participacion,
        },
        visitante: {
            animar: input?.grada?.visitante?.animar ?? DEFAULT_EVALUACIONES.grada.visitante.animar,
            respeto: input?.grada?.visitante?.respeto ?? DEFAULT_EVALUACIONES.grada.visitante.respeto,
            participacion: input?.grada?.visitante?.participacion ?? DEFAULT_EVALUACIONES.grada.visitante.participacion,
        },
    },
});

const clampScore = (value: number) => Math.min(10, Math.max(0, value));

const average = (values: number[]) => {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((total, current) => total + current, 0) / values.length) * 10) / 10;
};

function formatRoleLabel(role: string) {
    switch (role) {
        case 'local':
            return 'Equipo local';
        case 'visitante':
            return 'Equipo visitante';
        case 'arbitro':
            return 'Arbitraje';
        case 'grada_local':
            return 'Grada local';
        case 'grada_visitante':
            return 'Grada visitante';
        default:
            return role.replace('_', ' ');
    }
}

export default function ExpressActa() {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const [match, setMatch] = useState<ExpressMatch | null>(() => readMatchFromSession(matchId));
    const [evaluaciones, setEvaluaciones] = useState<EvaluacionesState>(() => {
        const storedMatch = readMatchFromSession(matchId);
        return mergeEvaluaciones(storedMatch?.evaluaciones);
    });
    const actaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!matchId) return;

        if (!match) {
            toast.error('Partido no encontrado');
            navigate('/express');
        }
    }, [match, matchId, navigate]);

    const localTeam = useMemo(() => match?.equipos.find((equipo) => equipo.rol === 'local') || null, [match]);
    const visitanteTeam = useMemo(() => match?.equipos.find((equipo) => equipo.rol === 'visitante') || null, [match]);
    const arbitroTeam = useMemo(() => match?.equipos.find((equipo) => equipo.rol === 'arbitro') || null, [match]);
    const gradaLocalTeam = useMemo(() => match?.equipos.find((equipo) => equipo.rol === 'grada_local') || null, [match]);
    const gradaVisitanteTeam = useMemo(() => match?.equipos.find((equipo) => equipo.rol === 'grada_visitante') || null, [match]);

    const fairPlayAverage = useMemo(
        () => average([evaluaciones.juego_limpio.local, evaluaciones.juego_limpio.visitante]),
        [evaluaciones.juego_limpio.local, evaluaciones.juego_limpio.visitante],
    );
    const arbitrajeAverage = useMemo(
        () => average(ARBITRO_CRITERIA.map((criteria) => evaluaciones.arbitro[criteria])),
        [evaluaciones.arbitro],
    );
    const gradaLocalAverage = useMemo(
        () => average(GRADA_CRITERIA.map((criteria) => evaluaciones.grada.local[criteria])),
        [evaluaciones.grada.local],
    );
    const gradaVisitanteAverage = useMemo(
        () => average(GRADA_CRITERIA.map((criteria) => evaluaciones.grada.visitante[criteria])),
        [evaluaciones.grada.visitante],
    );

    const persistEvaluaciones = (next: EvaluacionesState) => {
        setEvaluaciones(next);
        setMatch((current) => {
            if (!current || !matchId) return current;
            const updatedMatch: ExpressMatch = { ...current, evaluaciones: next };
            sessionStorage.setItem(`express_match_${matchId}`, JSON.stringify(updatedMatch));
            return updatedMatch;
        });
    };

    const updateJuegoLimpio = (team: TeamSide, value: number) => {
        persistEvaluaciones({
            ...evaluaciones,
            juego_limpio: {
                ...evaluaciones.juego_limpio,
                [team]: clampScore(value),
            },
        });
    };

    const updateArbitro = (criteria: ArbitroCriteria, value: number) => {
        persistEvaluaciones({
            ...evaluaciones,
            arbitro: {
                ...evaluaciones.arbitro,
                [criteria]: clampScore(value),
            },
        });
    };

    const updateGrada = (team: TeamSide, criteria: GradaCriteria, value: number) => {
        persistEvaluaciones({
            ...evaluaciones,
            grada: {
                ...evaluaciones.grada,
                [team]: {
                    ...evaluaciones.grada[team],
                    [criteria]: clampScore(value),
                },
            },
        });
    };

    const exportPDF = async () => {
        if (!actaRef.current || !match) return;

        try {
            toast.loading('Generando PDF...');

            const canvas = await html2canvas(actaRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`acta_partido_${match.deporte.codigo}_${new Date().toLocaleDateString('es-ES')}.pdf`);

            toast.dismiss();
            toast.success('PDF descargado correctamente');
        } catch (err) {
            console.error('Error generating PDF:', err);
            toast.dismiss();
            toast.error('Error al generar PDF');
        }
    };

    const handleCompartir = async () => {
        if (!match) return;

        try {
            const encoded = btoa(JSON.stringify(match));
            const url = `${window.location.origin}/express/partido/${match.id}?d=${encoded}`;

            if (navigator.share) {
                await navigator.share({
                    title: `Acta: ${match.deporte.nombre}`,
                    text: 'Resultado final del partido',
                    url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success('Enlace copiado');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    if (!match) {
        return null;
    }

    const marcadorLocal = getMarcadorValue(match.marcador, match.deporte.tipo_marcador, match.deporte.config, 'local');
    const marcadorVisitante = getMarcadorValue(match.marcador, match.deporte.tipo_marcador, match.deporte.config, 'visitante');

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#040614] via-[#0a0f24] to-[#040614] p-4 py-8 pb-24">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link to="/express" className="inline-flex items-center text-sm text-sub transition-colors hover:text-mint">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Nueva partida
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        <AccessibilityMenu />
                        <Button variant="outline" size="sm" onClick={handleCompartir}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Compartir
                        </Button>
                        <Button size="sm" onClick={exportPDF}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar PDF
                        </Button>
                    </div>
                </div>

                <Card variant="glass">
                    <CardContent className="space-y-5 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <SportAvatar nombre={match.deporte.nombre} logoFile={match.deporte.logo_file} className="h-20 w-20" />
                                <div>
                                    <p className="text-xs uppercase tracking-[0.16em] text-sub">Acta exprés</p>
                                    <h1 className="mt-1 text-3xl font-bold text-ink">{match.deporte.nombre}</h1>
                                    <p className="mt-2 text-sm text-sub">{new Date(match.fecha).toLocaleString('es-ES')}</p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-lme-border bg-white/5 px-4 py-3">
                                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                    <Shield className="h-4 w-4 text-mint" />
                                    Acta lista para cerrar evaluación
                                </p>
                                <p className="mt-1 text-sm text-sub">
                                    Ajusta juego limpio, arbitraje y grada antes de descargar o compartir.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryStat
                                label="Juego limpio"
                                value={`${fairPlayAverage}/10`}
                                support="Media global de ambos equipos"
                                toneClassName="text-mint"
                            />
                            <SummaryStat
                                label="Arbitraje"
                                value={arbitroTeam ? `${arbitrajeAverage}/10` : 'Sin equipo'}
                                support={arbitroTeam ? arbitroTeam.nombre : 'No asignado'}
                                toneClassName="text-amber-300"
                            />
                            <SummaryStat
                                label="Grada local"
                                value={gradaLocalTeam ? `${gradaLocalAverage}/10` : 'Sin equipo'}
                                support={gradaLocalTeam ? gradaLocalTeam.nombre : 'No asignado'}
                                toneClassName="text-vio"
                            />
                            <SummaryStat
                                label="Grada visitante"
                                value={gradaVisitanteTeam ? `${gradaVisitanteAverage}/10` : 'Sin equipo'}
                                support={gradaVisitanteTeam ? gradaVisitanteTeam.nombre : 'No asignado'}
                                toneClassName="text-sky"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="overflow-x-auto pb-2">
                    <div
                        ref={actaRef}
                        className="min-w-[760px] rounded-[28px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-8"
                        style={{ minHeight: '297mm' }}
                    >
                        <div className="mb-8 border-b-2 border-slate-200 pb-6 text-center">
                            <div className="mb-3 flex justify-center">
                                <SportAvatar nombre={match.deporte.nombre} logoFile={match.deporte.logo_file} className="h-20 w-20" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900">Acta de Partido</h1>
                            <h2 className="mt-2 text-xl text-slate-700">{match.deporte.nombre}</h2>
                            <p className="mt-2 text-sm text-slate-500">{new Date(match.fecha).toLocaleString('es-ES')}</p>
                        </div>

                        <div className="mb-6 grid grid-cols-2 gap-4">
                            {match.equipos.map((equipo) => (
                                <div key={equipo.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                        {formatRoleLabel(equipo.rol)}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">{equipo.nombre}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mb-6 rounded-3xl bg-slate-50 p-6">
                            <h3 className="text-center text-lg font-semibold text-slate-900">Resultado Final</h3>
                            <div className="mt-4 grid grid-cols-3 items-center gap-4">
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                                    <div className="text-sm font-medium text-emerald-700">Local · {localTeam?.nombre}</div>
                                    <div className="mt-2 text-4xl font-bold text-emerald-800">{marcadorLocal}</div>
                                </div>
                                <div className="text-center text-2xl font-bold text-slate-400">-</div>
                                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center">
                                    <div className="text-sm font-medium text-sky-700">Visitante · {visitanteTeam?.nombre}</div>
                                    <div className="mt-2 text-4xl font-bold text-sky-800">{marcadorVisitante}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <section>
                                <h3 className="text-lg font-semibold text-slate-900">Juego limpio</h3>
                                <div className="mt-3 grid grid-cols-2 gap-4">
                                    <PrintableScoreCard
                                        label={`Local · ${localTeam?.nombre || 'Equipo local'}`}
                                        value={`${evaluaciones.juego_limpio.local}/10`}
                                        toneClassName="border-emerald-200 bg-emerald-50 text-emerald-800"
                                    />
                                    <PrintableScoreCard
                                        label={`Visitante · ${visitanteTeam?.nombre || 'Equipo visitante'}`}
                                        value={`${evaluaciones.juego_limpio.visitante}/10`}
                                        toneClassName="border-sky-200 bg-sky-50 text-sky-800"
                                    />
                                </div>
                            </section>

                            {arbitroTeam && (
                                <section>
                                    <h3 className="text-lg font-semibold text-slate-900">Arbitraje · {arbitroTeam.nombre}</h3>
                                    <div className="mt-3 grid grid-cols-3 gap-4">
                                        {ARBITRO_CRITERIA.map((criteria) => (
                                            <PrintableScoreCard
                                                key={criteria}
                                                label={ARBITRO_LABELS[criteria]}
                                                value={`${evaluaciones.arbitro[criteria]}/10`}
                                                toneClassName="border-amber-200 bg-amber-50 text-amber-800"
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <h3 className="text-lg font-semibold text-slate-900">Tutoría de grada</h3>
                                <div className="mt-3 grid grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                                        <p className="text-sm font-semibold text-violet-800">
                                            {gradaLocalTeam ? `Grada local · ${gradaLocalTeam.nombre}` : 'Grada local sin equipo asignado'}
                                        </p>
                                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                                            {GRADA_CRITERIA.map((criteria) => (
                                                <div key={criteria} className="flex items-center justify-between gap-3">
                                                    <span>{GRADA_LABELS[criteria]}</span>
                                                    <span className="font-semibold text-violet-900">{evaluaciones.grada.local[criteria]}/10</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 border-t border-violet-200 pt-3 text-sm font-semibold text-violet-900">
                                            Media: {gradaLocalAverage}/10
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                        <p className="text-sm font-semibold text-sky-800">
                                            {gradaVisitanteTeam ? `Grada visitante · ${gradaVisitanteTeam.nombre}` : 'Grada visitante sin equipo asignado'}
                                        </p>
                                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                                            {GRADA_CRITERIA.map((criteria) => (
                                                <div key={criteria} className="flex items-center justify-between gap-3">
                                                    <span>{GRADA_LABELS[criteria]}</span>
                                                    <span className="font-semibold text-sky-900">{evaluaciones.grada.visitante[criteria]}/10</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 border-t border-sky-200 pt-3 text-sm font-semibold text-sky-900">
                                            Media: {gradaVisitanteAverage}/10
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
                            <p>Liga EDUmind - Marcador Express</p>
                            <p className="mt-1">Generado el {new Date().toLocaleString('es-ES')}</p>
                        </div>
                    </div>
                </div>

                <Card variant="glass">
                    <CardContent className="space-y-6 p-5 sm:p-6">
                        <div>
                            <h3 className="text-lg font-semibold text-ink">Ajustar evaluaciones</h3>
                            <p className="mt-1 text-sm text-sub">
                                Usa los controles rápidos para afinar la valoración sin perder el contexto del acta.
                            </p>
                        </div>

                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-mint" />
                                <Label className="text-ink">Juego limpio</Label>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <ScoreAdjuster
                                    label={localTeam?.nombre || 'Equipo local'}
                                    value={evaluaciones.juego_limpio.local}
                                    onChange={(value) => updateJuegoLimpio('local', value)}
                                    toneClassName="text-mint"
                                />
                                <ScoreAdjuster
                                    label={visitanteTeam?.nombre || 'Equipo visitante'}
                                    value={evaluaciones.juego_limpio.visitante}
                                    onChange={(value) => updateJuegoLimpio('visitante', value)}
                                    toneClassName="text-sky"
                                />
                            </div>
                        </section>

                        {arbitroTeam && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-amber-300" />
                                    <Label className="text-ink">Arbitraje · {arbitroTeam.nombre}</Label>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-3">
                                    {ARBITRO_CRITERIA.map((criteria) => (
                                        <ScoreAdjuster
                                            key={criteria}
                                            label={ARBITRO_LABELS[criteria]}
                                            value={evaluaciones.arbitro[criteria]}
                                            onChange={(value) => updateArbitro(criteria, value)}
                                            toneClassName="text-amber-300"
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-vio" />
                                <Label className="text-ink">Tutoría de grada</Label>
                            </div>
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3 rounded-2xl border border-lme-border bg-white/5 p-4">
                                    <div>
                                        <p className="text-sm font-semibold text-ink">
                                            {gradaLocalTeam ? `Grada local · ${gradaLocalTeam.nombre}` : 'Grada local'}
                                        </p>
                                        <p className="text-xs text-sub">Evalúa animación, respeto y participación.</p>
                                    </div>
                                    <div className="space-y-3">
                                        {GRADA_CRITERIA.map((criteria) => (
                                            <ScoreAdjuster
                                                key={`local-${criteria}`}
                                                label={GRADA_LABELS[criteria]}
                                                value={evaluaciones.grada.local[criteria]}
                                                onChange={(value) => updateGrada('local', criteria, value)}
                                                toneClassName="text-vio"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-2xl border border-lme-border bg-white/5 p-4">
                                    <div>
                                        <p className="text-sm font-semibold text-ink">
                                            {gradaVisitanteTeam ? `Grada visitante · ${gradaVisitanteTeam.nombre}` : 'Grada visitante'}
                                        </p>
                                        <p className="text-xs text-sub">Ajusta el comportamiento de la grada acompañante.</p>
                                    </div>
                                    <div className="space-y-3">
                                        {GRADA_CRITERIA.map((criteria) => (
                                            <ScoreAdjuster
                                                key={`visitante-${criteria}`}
                                                label={GRADA_LABELS[criteria]}
                                                value={evaluaciones.grada.visitante[criteria]}
                                                onChange={(value) => updateGrada('visitante', criteria, value)}
                                                toneClassName="text-sky"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SummaryStat({
    label,
    value,
    support,
    toneClassName,
}: {
    label: string;
    value: string;
    support: string;
    toneClassName: string;
}) {
    return (
        <div className="rounded-2xl border border-lme-border bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-sub">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${toneClassName}`}>{value}</p>
            <p className="mt-1 text-sm text-sub">{support}</p>
        </div>
    );
}

function PrintableScoreCard({
    label,
    value,
    toneClassName,
}: {
    label: string;
    value: string;
    toneClassName: string;
}) {
    return (
        <div className={`rounded-2xl border p-4 ${toneClassName}`}>
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
    );
}

function ScoreAdjuster({
    label,
    value,
    onChange,
    toneClassName,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    toneClassName: string;
}) {
    return (
        <div className="rounded-2xl border border-lme-border bg-white/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="text-xs text-sub">Ajusta la puntuación entre 0 y 10.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onChange(value - 1)}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <div className={`min-w-[4.5rem] text-center text-lg font-bold ${toneClassName}`}>{value}/10</div>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onChange(value + 1)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <input
                type="range"
                min="0"
                max="10"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-4 w-full"
            />
        </div>
    );
}

function getMarcadorValue(
    marcador: Record<string, unknown>,
    tipo: string,
    config: Record<string, unknown> | undefined,
    team: 'local' | 'visitante'
): number {
    const safeNumber = (value: unknown): number => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    };
    const getTryValue = (key: string, fallback: number): number => {
        const raw = config?.[key];
        const parsed = safeNumber(raw);
        return parsed > 0 ? parsed : fallback;
    };

    switch (tipo) {
        case 'goles':
            return safeNumber(marcador[`goles_${team}`]);
        case 'puntos':
            return safeNumber(marcador[`puntos_${team}`]);
        case 'sets':
            return safeNumber(marcador[`sets_${team}`]);
        case 'tries': {
            const valorTry = getTryValue('valor_try', getTryValue('puntos_por_try', 5));
            const valorConv = getTryValue('valor_conversion', getTryValue('puntos_por_conversion', 2));
            const tries = safeNumber(marcador[`tries_${team}`]);
            const conversions = safeNumber(marcador[`conversiones_${team}`]);
            return tries * valorTry + conversions * valorConv;
        }
        case 'carreras':
            return safeNumber(marcador[`carreras_${team}`]);
        case 'towertouchball':
            return safeNumber(marcador[`puntos_${team}`]);
        default:
            return safeNumber(marcador[`puntos_${team}`] ?? marcador[`goles_${team}`]);
    }
}
