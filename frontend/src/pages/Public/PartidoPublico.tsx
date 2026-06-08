/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Loader2, Medal, MessageSquare, Send, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { partidoPublicoApi, type EvaluacionPublica, type PartidoPublico } from '@/api/partidoPublico';
import { usePartidoManifest } from '@/hooks/usePartidoManifest';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useNetworkStore } from '@/hooks/useNetworkStatus';
import { getPendingOperationCount, queueOperation } from '@/lib/offline/offlineDB';
import ScoreboardDisplay from '@/pages/Express/scoreboard/ScoreboardDisplay';

const DEFAULT_EVALUACION_PUBLICA: EvaluacionPublica = {
    puntos_juego_limpio_local: 0,
    puntos_juego_limpio_visitante: 0,
    cumple_minimos_local: 0,
    cumple_minimos_visitante: 0,
    arbitro_conocimiento: 5,
    arbitro_gestion: 5,
    arbitro_apoyo: 5,
    grada_animar_local: 2,
    grada_respeto_local: 2,
    grada_participacion_local: 2,
    grada_animar_visitante: 2,
    grada_respeto_visitante: 2,
    grada_participacion_visitante: 2,
};

function normalizarEvaluacionPendiente(raw: Record<string, unknown> | null | undefined): EvaluacionPublica {
    const next = { ...DEFAULT_EVALUACION_PUBLICA };
    if (!raw) return next;

    (Object.keys(next) as Array<keyof EvaluacionPublica>).forEach((key) => {
        const value = raw[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            next[key] = value;
        } else if (typeof value === 'boolean') {
            next[key] = value ? 1 : 0;
        }
    });

    return next;
}

function MapaRolesPartido({ partido }: { partido: PartidoPublico }) {
    return (
        <Card variant="editorial" className="editorial-card">
            <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#b9c9df] bg-[#f5f8fc] p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#315b8e]">
                        <ShieldCheck className="h-4 w-4" />
                        Equipo arbitral
                    </div>
                    <p className="text-base font-bold text-[#1f3555]">{partido.arbitro_nombre || 'No asignado'}</p>
                    <p className="mt-1 text-xs text-[#5c6f88]">El docente valida su evaluación educativa.</p>
                </div>
                <div className="rounded-xl border border-[#b9c9df] bg-[#f5f8fc] p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#315b8e]">
                        <Users className="h-4 w-4" />
                        Tutoría grada local
                    </div>
                    <p className="text-base font-bold text-[#1f3555]">{partido.tutor_grada_local_nombre || 'No asignada'}</p>
                    <p className="mt-1 text-xs text-[#5c6f88]">Observa la grada de {partido.equipo_local}.</p>
                </div>
                <div className="rounded-xl border border-[#b9c9df] bg-[#f5f8fc] p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#315b8e]">
                        <Users className="h-4 w-4" />
                        Tutoría grada visitante
                    </div>
                    <p className="text-base font-bold text-[#1f3555]">{partido.tutor_grada_visitante_nombre || 'No asignada'}</p>
                    <p className="mt-1 text-xs text-[#5c6f88]">Observa la grada de {partido.equipo_visitante}.</p>
                </div>
            </CardContent>
        </Card>
    );
}

function ControlEscala({
    label,
    value,
    max,
    onChange,
}: {
    label: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <Label className="text-[#284563]">{label}</Label>
                <span className="min-w-10 rounded-md bg-[#dce9f8] px-2 py-1 text-center text-sm font-bold text-[#1f3555]">
                    {value}/{max}
                </span>
            </div>
            <Slider value={[value]} max={max} step={1} onValueChange={(values) => onChange(values[0] ?? 0)} />
        </div>
    );
}

function EvaluacionEducativaPublica({
    partido,
    evaluacion,
    observaciones,
    onChange,
    onObservacionesChange,
}: {
    partido: PartidoPublico;
    evaluacion: EvaluacionPublica;
    observaciones: string;
    onChange: (updates: Partial<EvaluacionPublica>) => void;
    onObservacionesChange: (value: string) => void;
}) {
    const checked = (value: number) => value === 1;

    return (
        <Card variant="editorial" className="editorial-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#1f3555]">
                    <Medal className="h-5 w-5 text-[#bf7a14]" />
                    Evaluación educativa
                </CardTitle>
                <CardDescription className="text-[#5c6f88]">
                    Indicad qué se ha observado. El docente recibirá esta propuesta y podrá validarla o modificarla.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    {[{
                        team: partido.equipo_local,
                        limpioKey: 'puntos_juego_limpio_local' as const,
                        minimosKey: 'cumple_minimos_local' as const,
                    }, {
                        team: partido.equipo_visitante,
                        limpioKey: 'puntos_juego_limpio_visitante' as const,
                        minimosKey: 'cumple_minimos_visitante' as const,
                    }].map((item) => (
                        <div key={item.team} className="rounded-xl border border-[#b9c9df] bg-[#f5f8fc] p-4">
                            <p className="mb-3 font-bold text-[#1f3555]">{item.team}</p>
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 text-sm text-[#284563]">
                                    <Checkbox
                                        checked={checked(evaluacion[item.limpioKey])}
                                        onCheckedChange={(value) => onChange({ [item.limpioKey]: value ? 1 : 0 })}
                                    />
                                    <span>Juego limpio: respeta normas, rivales, material y decisiones arbitrales.</span>
                                </label>
                                <label className="flex items-start gap-3 text-sm text-[#284563]">
                                    <Checkbox
                                        checked={checked(evaluacion[item.minimosKey])}
                                        onCheckedChange={(value) => onChange({ [item.minimosKey]: value ? 1 : 0 })}
                                    />
                                    <span>Cumple mínimos deportivos: participación real, continuidad y actitud segura.</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-[#b9c9df] bg-white p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="font-bold text-[#1f3555]">Equipo arbitral</p>
                            <p className="text-sm text-[#5c6f88]">{partido.arbitro_nombre || 'No asignado'}</p>
                        </div>
                        <Badge variant="outline">0-10</Badge>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                        <ControlEscala label="Conoce y aplica reglas" value={evaluacion.arbitro_conocimiento} max={10} onChange={(value) => onChange({ arbitro_conocimiento: value })} />
                        <ControlEscala label="Gestiona el juego con calma" value={evaluacion.arbitro_gestion} max={10} onChange={(value) => onChange({ arbitro_gestion: value })} />
                        <ControlEscala label="Ayuda a que todos aprendan" value={evaluacion.arbitro_apoyo} max={10} onChange={(value) => onChange({ arbitro_apoyo: value })} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[#b9c9df] bg-white p-4">
                        <p className="font-bold text-[#1f3555]">Grada local</p>
                        <p className="mb-4 text-sm text-[#5c6f88]">
                            Evalúa {partido.tutor_grada_local_nombre || 'equipo no asignado'} sobre la grada de {partido.equipo_local}.
                        </p>
                        <div className="space-y-5">
                            <ControlEscala label="Anima de forma positiva" value={evaluacion.grada_animar_local} max={4} onChange={(value) => onChange({ grada_animar_local: value })} />
                            <ControlEscala label="Respeta a todos" value={evaluacion.grada_respeto_local} max={4} onChange={(value) => onChange({ grada_respeto_local: value })} />
                            <ControlEscala label="Participa sin invadir" value={evaluacion.grada_participacion_local} max={4} onChange={(value) => onChange({ grada_participacion_local: value })} />
                        </div>
                    </div>
                    <div className="rounded-xl border border-[#b9c9df] bg-white p-4">
                        <p className="font-bold text-[#1f3555]">Grada visitante</p>
                        <p className="mb-4 text-sm text-[#5c6f88]">
                            Evalúa {partido.tutor_grada_visitante_nombre || 'equipo no asignado'} sobre la grada de {partido.equipo_visitante}.
                        </p>
                        <div className="space-y-5">
                            <ControlEscala label="Anima de forma positiva" value={evaluacion.grada_animar_visitante} max={4} onChange={(value) => onChange({ grada_animar_visitante: value })} />
                            <ControlEscala label="Respeta a todos" value={evaluacion.grada_respeto_visitante} max={4} onChange={(value) => onChange({ grada_respeto_visitante: value })} />
                            <ControlEscala label="Participa sin invadir" value={evaluacion.grada_participacion_visitante} max={4} onChange={(value) => onChange({ grada_participacion_visitante: value })} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[#284563]">
                        <MessageSquare className="h-4 w-4" />
                        Observaciones para el docente
                    </Label>
                    <Textarea
                        value={observaciones}
                        maxLength={500}
                        onChange={(event) => onObservacionesChange(event.target.value)}
                        placeholder="Ej.: hubo dudas con una norma, faltó tiempo, un equipo ayudó a resolver un conflicto..."
                        className="border-[#b9c9df] bg-white text-[#1f3555] placeholder:text-[#7b8fa8]"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Vista de confirmación
// ---------------------------------------------------------------------------

function isRetryableSendError(error: unknown): boolean {
    const maybeHttpError = error as { response?: unknown; request?: unknown };
    return !maybeHttpError.response || !navigator.onLine;
}

function Confirmacion({ onReset, isQueued }: { onReset: () => void; isQueued: boolean }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--editorial-bg)] p-4">
            <Card variant="editorial" className="editorial-card w-full max-w-md text-center">
                <CardContent className="space-y-4 pt-8 pb-8">
                    <div className="flex justify-center">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--editorial-ink)]">
                        {isQueued ? '¡Marcador guardado!' : '¡Marcador enviado!'}
                    </h2>
                    <p className="text-[var(--editorial-muted)]">
                        {isQueued
                            ? 'No había conexión. Se enviará automáticamente cuando este dispositivo vuelva a tener internet.'
                            : 'El/la docente recibirá tu propuesta y la verificará al finalizar el partido.'}
                    </p>
                    <Button
                        variant="editorialOutline"
                        className="w-full"
                        onClick={onReset}
                    >
                        Enviar otro partido
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PartidoPublico() {
    const { pin: pinParam } = useParams<{ pin?: string }>();
    const navigate = useNavigate();

    // Swap del manifest al manifest de alumno para instalación como mini-app
    usePartidoManifest();
    const { canInstall, install } = usePwaInstall();
    const setPendingCount = useNetworkStore((state) => state.setPendingCount);

    const [pinInput, setPinInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [partido, setPartido] = useState<PartidoPublico | null>(null);
    const [marcador, setMarcador] = useState<Record<string, unknown>>({});
    const [evaluacion, setEvaluacion] = useState<EvaluacionPublica>(DEFAULT_EVALUACION_PUBLICA);
    const [observaciones, setObservaciones] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [envioEnCola, setEnvioEnCola] = useState(false);
    const [pinActivo, setPinActivo] = useState('');

    // Estado del formulario de anotación
    const [notaContenido, setNotaContenido] = useState('');
    const [notaTipo, setNotaTipo] = useState<'observacion' | 'incidencia' | 'evidencia'>('observacion');
    const [notaConsentimiento, setNotaConsentimiento] = useState(false);
    const [isEnviandoNota, setIsEnviandoNota] = useState(false);
    const [notaEnviada, setNotaEnviada] = useState(false);

    const cargarPartido = useCallback(async (pin: string) => {
        setIsSearching(true);
        try {
            const data = await partidoPublicoApi.getByPin(pin);
            const base = data.marcador_pendiente ?? data.marcador_actual;
            setPartido(data);
            setMarcador(base || {});
            setEvaluacion(normalizarEvaluacionPendiente(data.evaluacion_pendiente));
            setPinActivo(pin);
        } catch {
            toast.error('PIN no encontrado o partido ya finalizado');
            // Si el PIN venía en la URL, volver al formulario
            if (pinParam) navigate('/partido');
        } finally {
            setIsSearching(false);
        }
    }, [pinParam, navigate]);

    // Carga automática si el PIN viene en la URL
    useEffect(() => {
        if (pinParam && pinParam.length === 6) {
            void cargarPartido(pinParam);
        }
    }, [pinParam, cargarPartido]);

    const handleBuscar = async (e: React.FormEvent) => {
        e.preventDefault();
        const pin = pinInput.trim();
        if (pin.length !== 6) return;
        await cargarPartido(pin);
    };

    const handleCambioMarcador = (updates: Record<string, unknown>) => {
        setMarcador((prev) => ({ ...prev, ...updates }));
    };

    const handleCambioEvaluacion = (updates: Partial<EvaluacionPublica>) => {
        setEvaluacion((prev) => ({ ...prev, ...updates }));
    };

    const handleEnviar = async () => {
        if (!partido || !pinActivo) return;
        setIsSubmitting(true);
        try {
            await partidoPublicoApi.submitMarcador(pinActivo, marcador, evaluacion, observaciones);
            setEnvioEnCola(false);
            setEnviado(true);
        } catch (error) {
            if (!isRetryableSendError(error)) {
                toast.error('Error al enviar el marcador. Inténtalo de nuevo.');
                return;
            }

            await queueOperation({
                entityType: 'public_partido_marcador',
                entityId: partido.id,
                operation: 'update',
                endpoint: `/public/partido/${pinActivo}/marcador`,
                method: 'POST',
                payload: {
                    marcador,
                    evaluacion,
                    observaciones,
                },
            });
            setPendingCount(await getPendingOperationCount());
            setEnvioEnCola(true);
            setEnviado(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setPartido(null);
        setMarcador({});
        setEvaluacion(DEFAULT_EVALUACION_PUBLICA);
        setObservaciones('');
        setEnviado(false);
        setEnvioEnCola(false);
        setPinActivo('');
        setPinInput('');
        navigate('/partido');
    };

    const handleEnviarNota = async () => {
        if (!notaConsentimiento) {
            toast.error('Debes aceptar el aviso de privacidad para enviar la anotación.');
            return;
        }
        const contenido = notaContenido.trim();
        if (!contenido) {
            toast.error('La anotación no puede estar vacía.');
            return;
        }
        if (contenido.length > 500) {
            toast.error('La anotación no puede superar los 500 caracteres.');
            return;
        }
        setIsEnviandoNota(true);
        try {
            await partidoPublicoApi.submitNota(pinActivo, contenido, notaTipo, true);
            setNotaEnviada(true);
            setNotaContenido('');
            setNotaConsentimiento(false);
            toast.success('Anotación enviada. El docente la revisará antes de hacerla visible.');
        } catch {
            toast.error('No se pudo enviar la anotación. Inténtalo de nuevo.');
        } finally {
            setIsEnviandoNota(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Render: confirmación
    if (enviado) return <Confirmacion onReset={handleReset} isQueued={envioEnCola} />;

    // ---------------------------------------------------------------------------
    // Render: formulario PIN
    if (!partido) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--editorial-bg)] p-4 gap-4">
                <Card variant="editorial" className="editorial-card w-full max-w-md">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-2xl text-[var(--editorial-ink)]">Acceso al partido</CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Introduce el PIN de 6 dígitos del partido que os ha dado el/la docente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleBuscar} className="space-y-4">
                            <Input
                                type="tel"
                                inputMode="numeric"
                                placeholder="000000"
                                maxLength={6}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="h-14 text-center text-2xl md:text-3xl tracking-[0.4em] font-bold"
                                autoFocus
                                autoComplete="one-time-code"
                                aria-label="Código PIN de 6 dígitos del partido"
                            />
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={isSearching || pinInput.length !== 6}
                            >
                                {isSearching ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> Buscando...</>
                                ) : 'Acceder al partido'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Banner de instalación — aparece solo si el navegador lo permite */}
                {canInstall && (
                    <button
                        type="button"
                        onClick={install}
                        className="flex w-full max-w-md items-center gap-3 rounded-xl border border-[#a9c0e2] bg-[#edf4ff] px-4 py-3 text-left text-sm text-[#2b4f80] hover:bg-[#dce9ff] transition-colors"
                        aria-label="Instalar la app de partidos en este dispositivo"
                    >
                        <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="font-semibold">Instalar en este dispositivo</p>
                            <p className="text-xs text-[#3a6aad]">
                                Abre los partidos directamente desde la pantalla de inicio, sin el navegador.
                            </p>
                        </div>
                    </button>
                )}
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[var(--editorial-bg)] p-4">
            <div className="mx-auto max-w-5xl space-y-5">

                {/* Cabecera */}
                <div className="text-center space-y-1 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--editorial-muted)]">
                        {partido.liga_nombre}
                    </p>
                    <h1 className="text-2xl font-bold text-[var(--editorial-ink)]">Marcador del partido</h1>
                    <Badge variant="outline" className="border-[#a9bfdc] bg-[#edf4ff] text-[#2f4f7f]">
                        {partido.tipo_deporte.nombre}
                    </Badge>
                </div>

                {/* Aviso si ya hay propuesta pendiente */}
                {partido.hay_propuesta_pendiente && (
                    <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Ya hay una propuesta enviada para este partido. Puedes actualizarla con el nuevo marcador.
                    </div>
                )}

                <MapaRolesPartido partido={partido} />

                <ScoreboardDisplay
                    tipo={partido.tipo_deporte.tipo_marcador}
                    marcador={marcador}
                    config={partido.tipo_deporte.config}
                    onUpdate={handleCambioMarcador}
                    equipoLocalNombre={partido.equipo_local}
                    equipoVisitanteNombre={partido.equipo_visitante}
                />

                <EvaluacionEducativaPublica
                    partido={partido}
                    evaluacion={evaluacion}
                    observaciones={observaciones}
                    onChange={handleCambioEvaluacion}
                    onObservacionesChange={setObservaciones}
                />

                {/* Botón enviar */}
                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleEnviar}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
                    ) : (
                        <><Send className="h-5 w-5" /> Enviar resultado al docente</>
                    )}
                </Button>

                <p className="text-center text-xs text-[var(--editorial-muted)]">
                    El resultado quedará pendiente de verificación. El docente lo confirmará al finalizar el partido.
                </p>

                {/* Sección de anotación anónima — LOPD/RGPD compliant */}
                <Card variant="editorial" className="editorial-card border-[#a9bfdc]/50">
                    <CardHeader className="space-y-1 pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-[var(--editorial-ink)]">
                            <MessageSquare className="h-5 w-5 text-[#3a6aad]" />
                            Añadir anotación del partido
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)] text-xs">
                            Observaciones, incidencias o evidencias de evaluación que quieras transmitir al docente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Aviso LOPD/RGPD */}
                        <div className="rounded-lg border border-[#a9bfdc]/40 bg-[#edf4ff] p-3">
                            <div className="flex items-start gap-2">
                                <ShieldCheck className="h-4 w-4 text-[#3a6aad] flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-[#2f4f7f] space-y-1">
                                    <p className="font-semibold">Privacidad — LOPD/RGPD</p>
                                    <p>
                                        Esta anotación es completamente <strong>anónima</strong>: no se almacena ningún dato personal
                                        (sin nombre, sin identificador de sesión, sin dirección IP).
                                        Solo se guarda el contenido que escribas aquí.
                                        El/la docente la revisará antes de hacerla visible. Si no la aprueba, se eliminará automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {notaEnviada ? (
                            <div className="rounded-lg border border-green-400/40 bg-green-50 p-4 text-center space-y-2">
                                <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                                <p className="text-sm font-semibold text-green-800">Anotación enviada correctamente</p>
                                <p className="text-xs text-green-700">El docente la revisará. Si la aprueba, quedará registrada en el partido.</p>
                                <Button
                                    variant="editorialOutline"
                                    size="sm"
                                    onClick={() => { setNotaEnviada(false); setNotaContenido(''); setNotaConsentimiento(false); }}
                                >
                                    Enviar otra anotación
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Tipo de anotación */}
                                <div className="grid grid-cols-3 gap-2">
                                    {(['observacion', 'incidencia', 'evidencia'] as const).map((tipo) => (
                                        <button
                                            key={tipo}
                                            type="button"
                                            onClick={() => setNotaTipo(tipo)}
                                            className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                                                notaTipo === tipo
                                                    ? 'border-[#3a6aad] bg-[#edf4ff] text-[#2f4f7f]'
                                                    : 'border-[#a9bfdc]/40 bg-white text-[#5c6f88] hover:border-[#a9bfdc]'
                                            }`}
                                        >
                                            {tipo}
                                        </button>
                                    ))}
                                </div>

                                {/* Área de texto */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="nota-contenido" className="text-xs text-[var(--editorial-muted)]">
                                        Contenido <span className="text-[#a9bfdc]">({notaContenido.length}/500)</span>
                                    </Label>
                                    <Textarea
                                        id="nota-contenido"
                                        placeholder="Escribe aquí tu observación, incidencia o evidencia..."
                                        rows={3}
                                        maxLength={500}
                                        value={notaContenido}
                                        onChange={(e) => setNotaContenido(e.target.value)}
                                        className="resize-none text-sm"
                                    />
                                </div>

                                {/* Checkbox de consentimiento LOPD */}
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="nota-consentimiento"
                                        checked={notaConsentimiento}
                                        onCheckedChange={(checked) => setNotaConsentimiento(Boolean(checked))}
                                    />
                                    <Label
                                        htmlFor="nota-consentimiento"
                                        className="text-xs text-[#5c6f88] leading-relaxed cursor-pointer"
                                    >
                                        Entiendo que esta anotación es anónima, que el docente la revisará antes de hacerla visible,
                                        y que no debo incluir datos personales de ningún alumno o alumna en el texto.
                                    </Label>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleEnviarNota}
                                    disabled={isEnviandoNota || !notaConsentimiento || !notaContenido.trim()}
                                >
                                    {isEnviandoNota ? (
                                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</>
                                    ) : (
                                        <><Send className="h-4 w-4 mr-2" /> Enviar anotación al docente</>
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
