/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Formulario de evaluación educativa clásica (juego limpio, árbitro y
 * roles de apoyo). Extraído de VerPartido.tsx sin cambios; el estado
 * vive en el padre.
 */
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Medal, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { EvaluationRadarChart } from '@/components/charts/EvaluationRadarChart';
import type { PartidoDetailed } from '../../../types/liga';

export interface EvaluacionClasicaState {
    puntos_juego_limpio_local: number;
    puntos_juego_limpio_visitante: number;
    arbitro_conocimiento: number;
    arbitro_gestion: number;
    arbitro_apoyo: number;
    grada_animar_local: number;
    grada_respeto_local: number;
    grada_participacion_local: number;
    grada_animar_visitante: number;
    grada_respeto_visitante: number;
    grada_participacion_visitante: number;
}

interface EvaluacionClasicaFormProps {
    partido: PartidoDetailed;
    evaluacion: EvaluacionClasicaState;
    setEvaluacion: Dispatch<SetStateAction<EvaluacionClasicaState>>;
    isOnline: boolean;
    onSubmit: (e: FormEvent) => void;
    slot3Label: string;
    slot4Label: string;
    slot5Label: string;
    showSlot4: boolean;
    showSlot5: boolean;
    roleCardsGridClass: string;
    supportRoleGridClass: string;
    sectionPanelClassName: string;
}

export function EvaluacionClasicaForm({
    partido,
    evaluacion,
    setEvaluacion,
    isOnline,
    onSubmit,
    slot3Label,
    slot4Label,
    slot5Label,
    showSlot4,
    showSlot5,
    roleCardsGridClass,
    supportRoleGridClass,
    sectionPanelClassName,
}: EvaluacionClasicaFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* Roles Display */}
            <div className={`grid grid-cols-1 ${roleCardsGridClass} gap-6 mb-8`}>
                <Card className="border-lme-border/80 bg-[rgba(30,27,22,0.58)]">
                    <div className="p-4 flex flex-col items-center text-center">
                        <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 mb-2">
                            <User className="h-6 w-6" />
                        </div>
                        <p className="text-sm text-ink/70 mb-1">{slot3Label} asignado</p>
                        <p className="font-bold text-ink text-lg">{partido.arbitro?.nombre || 'No asignado'}</p>
                    </div>
                </Card>
                {showSlot4 && (
                    <Card className="border-lme-border/80 bg-[rgba(30,27,22,0.58)]">
                        <div className="p-4 flex flex-col items-center text-center">
                            <div className="p-2 rounded-full bg-green-500/10 text-green-400 mb-2">
                                <Users className="h-6 w-6" />
                            </div>
                            <p className="text-sm text-ink/70 mb-1">{slot4Label} (por {partido.equipo_local.nombre})</p>
                            <p className="font-bold text-ink text-lg">{partido.tutor_grada_local?.nombre || 'No asignado'}</p>
                        </div>
                    </Card>
                )}
                {showSlot5 && (
                    <Card className="border-lme-border/80 bg-[rgba(30,27,22,0.58)]">
                        <div className="p-4 flex flex-col items-center text-center">
                            <div className="p-2 rounded-full bg-green-500/10 text-green-400 mb-2">
                                <Users className="h-6 w-6" />
                            </div>
                            <p className="text-sm text-ink/70 mb-1">{slot5Label} (por {partido.equipo_visitante.nombre})</p>
                            <p className="font-bold text-ink text-lg">{partido.tutor_grada_visitante?.nombre || 'No asignado'}</p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Juego Limpio */}
            <div className={sectionPanelClassName}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-lme-text">
                    <Medal size={20} className="text-yellow-500" /> Juego Limpio (0-1)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label>{partido.equipo_local.nombre}</Label>
                        <Select
                            value={evaluacion.puntos_juego_limpio_local.toString()}
                            onValueChange={(value) => setEvaluacion({ ...evaluacion, puntos_juego_limpio_local: parseInt(value) })}
                        >
                            <SelectTrigger className="bg-lme-surface-soft/50 border-lme-border">
                                <SelectValue placeholder="Puntos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">0 Puntos</SelectItem>
                                <SelectItem value="1">1 Punto (Juego Limpio)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{partido.equipo_visitante.nombre}</Label>
                        <Select
                            value={evaluacion.puntos_juego_limpio_visitante.toString()}
                            onValueChange={(value) => setEvaluacion({ ...evaluacion, puntos_juego_limpio_visitante: parseInt(value) })}
                        >
                            <SelectTrigger className="bg-lme-surface-soft/50 border-lme-border">
                                <SelectValue placeholder="Puntos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">0 Puntos</SelectItem>
                                <SelectItem value="1">1 Punto (Juego Limpio)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Árbitro */}
            <div className={sectionPanelClassName}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-lme-text">
                        <User size={20} className="text-blue-500" /> Evaluación {slot3Label} (0-10)
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                        Evaluado: {partido.arbitro?.nombre || `Sin ${slot3Label.toLowerCase()}`}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Conocimiento</Label>
                                <span className="text-lg font-bold text-mint">{evaluacion.arbitro_conocimiento}</span>
                            </div>
                            <Slider
                                value={[evaluacion.arbitro_conocimiento]}
                                max={10}
                                step={1}
                                onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, arbitro_conocimiento: v[0] })}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Gestión</Label>
                                <span className="text-lg font-bold text-mint">{evaluacion.arbitro_gestion}</span>
                            </div>
                            <Slider
                                value={[evaluacion.arbitro_gestion]}
                                max={10}
                                step={1}
                                onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, arbitro_gestion: v[0] })}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Apoyo Educativo</Label>
                                <span className="text-lg font-bold text-mint">{evaluacion.arbitro_apoyo}</span>
                            </div>
                            <Slider
                                value={[evaluacion.arbitro_apoyo]}
                                max={10}
                                step={1}
                                onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, arbitro_apoyo: v[0] })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-center items-center">
                        <EvaluationRadarChart
                            data={[
                                { subject: 'Conocimiento', A: evaluacion.arbitro_conocimiento, fullMark: 10 },
                                { subject: 'Gestión', A: evaluacion.arbitro_gestion, fullMark: 10 },
                                { subject: 'Apoyo', A: evaluacion.arbitro_apoyo, fullMark: 10 },
                            ]}
                            color="#3b82f6" // blue-500
                        />
                    </div>
                </div>
            </div>

            {(showSlot4 || showSlot5) && (
                <div className={sectionPanelClassName}>
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-lme-text">
                        <Users size={20} className="text-green-500" /> Evaluación roles de apoyo (0-4)
                    </h3>
                    <div className={`grid grid-cols-1 ${supportRoleGridClass} gap-8 md:gap-12`}>
                        {showSlot4 && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-lme-border pb-2">
                                    <h4 className="font-semibold text-sm text-lme-text">{slot4Label} ({partido.equipo_local.nombre})</h4>
                                    <span className="text-xs text-emerald-200 text-right block max-w-[240px]">
                                        Observa/evalúa: {partido.tutor_grada_local?.nombre || 'Sin asignar'}
                                    </span>
                                </div>

                                <EvaluationRadarChart
                                    data={[
                                        { subject: 'Animación', A: evaluacion.grada_animar_local, fullMark: 4 },
                                        { subject: 'Respeto', A: evaluacion.grada_respeto_local, fullMark: 4 },
                                        { subject: 'Participación', A: evaluacion.grada_participacion_local, fullMark: 4 },
                                    ]}
                                    color="#10b981"
                                />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-lme-muted">Animación</Label>
                                        <span className="text-sm font-bold text-mint">{evaluacion.grada_animar_local}</span>
                                    </div>
                                    <Slider
                                        value={[evaluacion.grada_animar_local]}
                                        max={4}
                                        step={1}
                                        onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, grada_animar_local: v[0] })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-lme-muted">Respeto</Label>
                                        <span className="text-sm font-bold text-mint">{evaluacion.grada_respeto_local}</span>
                                    </div>
                                    <Slider
                                        value={[evaluacion.grada_respeto_local]}
                                        max={4}
                                        step={1}
                                        onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, grada_respeto_local: v[0] })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-lme-muted">Participación</Label>
                                        <span className="text-sm font-bold text-mint">{evaluacion.grada_participacion_local}</span>
                                    </div>
                                    <Slider
                                        value={[evaluacion.grada_participacion_local]}
                                        max={4}
                                        step={1}
                                        onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, grada_participacion_local: v[0] })}
                                    />
                                </div>
                            </div>
                        )}

                        {showSlot5 && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-lme-border pb-2">
                                    <h4 className="font-semibold text-sm text-lme-text">{slot5Label} ({partido.equipo_visitante.nombre})</h4>
                                    <span className="text-xs text-emerald-200 text-right block max-w-[240px]">
                                        Observa/evalúa: {partido.tutor_grada_visitante?.nombre || 'Sin asignar'}
                                    </span>
                                </div>

                                <EvaluationRadarChart
                                    data={[
                                        { subject: 'Animación', A: evaluacion.grada_animar_visitante, fullMark: 4 },
                                        { subject: 'Respeto', A: evaluacion.grada_respeto_visitante, fullMark: 4 },
                                        { subject: 'Participación', A: evaluacion.grada_participacion_visitante, fullMark: 4 },
                                    ]}
                                    color="#f59e0b"
                                />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-lme-muted">Animación</Label>
                                        <span className="text-sm font-bold text-mint">{evaluacion.grada_animar_visitante}</span>
                                    </div>
                                    <Slider
                                        value={[evaluacion.grada_animar_visitante]}
                                        max={4}
                                        step={1}
                                        onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, grada_animar_visitante: v[0] })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-lme-muted">Respeto</Label>
                                        <span className="text-sm font-bold text-mint">{evaluacion.grada_respeto_visitante}</span>
                                    </div>
                                    <Slider
                                        value={[evaluacion.grada_respeto_visitante]}
                                        max={4}
                                        step={1}
                                        onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, grada_respeto_visitante: v[0] })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-lme-muted">Participación</Label>
                                        <span className="text-sm font-bold text-mint">{evaluacion.grada_participacion_visitante}</span>
                                    </div>
                                    <Slider
                                        value={[evaluacion.grada_participacion_visitante]}
                                        max={4}
                                        step={1}
                                        onValueChange={(v: number[]) => setEvaluacion({ ...evaluacion, grada_participacion_visitante: v[0] })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="text-center pt-4 border-t border-lme-border">
                <Button
                    type="submit"
                    size="lg"
                    className="shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
                >
                    {isOnline ? 'Guardar Evaluación' : 'Guardar Localmente'}
                </Button>
                {!isOnline && (
                    <p className="text-xs text-amber-400 mt-2">
                        Se sincronizará automáticamente al recuperar conexión
                    </p>
                )}
            </div>
        </form>
    );
}
