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

import * as React from 'react';
import { TimerControls } from '@/components/TimerControls';
import { WhistleButton } from '@/components/WhistleButton';
import { playGoal, playWhistle } from '@/lib/audio';
import type { DeporteConfig, TipoMarcador } from '@/types/marcador';

/**
 * Marcador type uses 'any' intentionally because:
 * 1. Sport scoreboards have dynamic keys (goles_local, puntos_visitante, etc.)
 * 2. TypeScript cannot perform arithmetic on 'unknown' type
 * 3. Keys are computed at runtime (e.g., `goles_${team}`)
 * 
 * The typed interfaces in @/types/marcador.ts provide documentation
 * for the expected structure of each sport type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarcadorRecord = Record<string, any>;

interface ScoreboardDisplayProps {
    tipo: TipoMarcador | string;
    marcador: MarcadorRecord;
    config?: DeporteConfig;
    onUpdate: (updates: MarcadorRecord) => void;
    equipoLocalNombre?: string;
    equipoVisitanteNombre?: string;
}

// Sound effect utility
function playGoalSound() {
    playGoal();
}

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const getConfigNumber = (config: DeporteConfig | undefined, keys: string[]): number | null => {
    if (!config) return null;
    for (const key of keys) {
        const raw = (config as Record<string, unknown>)[key];
        const value = toNumber(raw);
        if (value !== null && value > 0) return value;
    }
    return null;
};

const getDefaultTimeSeconds = (config: DeporteConfig | undefined, fallbackMinutes: number): number => {
    const primaryMinutes = getConfigNumber(config, [
        'tiempo_limite',
        'tiempo_regulacion',
        'duracion_partido',
        'duracion_minutos',
        'duracion_tiempo_min',
    ]);

    if (primaryMinutes) {
        return primaryMinutes * 60;
    }

    const duracionCuarto = getConfigNumber(config, ['duracion_cuarto']);
    const cuartos = getConfigNumber(config, ['cuartos']);
    if (duracionCuarto && cuartos) {
        return duracionCuarto * cuartos * 60;
    }

    return fallbackMinutes * 60;
};

const getScoringButtons = (config: DeporteConfig | undefined, fallback: number[]): number[] => {
    const raw = config?.botones_puntuacion;
    if (Array.isArray(raw)) {
        const buttons = raw
            .map((value) => toNumber(value))
            .filter((value): value is number => value !== null && value > 0);
        const unique = Array.from(new Set(buttons));
        if (unique.length > 0) {
            return unique.sort((a, b) => a - b);
        }
    }
    return fallback;
};

const getSetsTotales = (config: DeporteConfig | undefined): number | null => {
    const explicit = getConfigNumber(config, ['sets_totales']);
    if (explicit) return explicit;
    const setsParaGanar = getConfigNumber(config, ['sets_para_ganar']);
    if (setsParaGanar) return Math.max(1, setsParaGanar * 2 - 1);
    return null;
};

const getSetTargetPoints = (config: DeporteConfig | undefined, setActual: number): number => {
    const puntosPorSet = (config as Record<string, unknown> | undefined)?.puntos_por_set
        ?? (config as Record<string, unknown> | undefined)?.puntos_para_ganar;

    let target: number | null = null;

    if (Array.isArray(puntosPorSet)) {
        const raw = puntosPorSet[setActual - 1] ?? puntosPorSet[puntosPorSet.length - 1];
        target = toNumber(raw);
    } else if (puntosPorSet !== undefined) {
        target = toNumber(puntosPorSet);
    }

    const setsTotales = getSetsTotales(config);
    const isDecisive = setsTotales ? setActual >= setsTotales : setActual >= 5;
    const decisivo = getConfigNumber(config, ['puntos_set_decisivo']);
    if (isDecisive && decisivo) {
        target = decisivo;
    }

    if (target && target > 0) return target;
    return isDecisive ? 15 : 25;
};

const getSetDifference = (config: DeporteConfig | undefined): number => {
    const diff = getConfigNumber(config, ['diferencia_minima']);
    return diff && diff > 0 ? diff : 2;
};

type LayoutVariant = 'classic' | 'arena' | 'tactical' | 'neon';

const isLayoutVariant = (value: unknown): value is LayoutVariant => (
    value === 'classic' || value === 'arena' || value === 'tactical' || value === 'neon'
);

const getLayoutVariant = (tipo: string, config?: DeporteConfig): LayoutVariant => {
    const configured = (config as Record<string, unknown> | undefined)?.layout_variant;
    if (isLayoutVariant(configured)) return configured;

    switch (tipo) {
        case 'puntos':
            return 'arena';
        case 'sets':
            return 'tactical';
        case 'towertouchball':
            return 'neon';
        default:
            return 'classic';
    }
};

type LayoutTheme = {
    background?: string;
    border?: string;
    accent?: string;
};

const getThemeColor = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const getLayoutTheme = (config?: DeporteConfig): LayoutTheme | null => {
    if (!config) return null;
    const rawPalette = (config as Record<string, unknown>).layout_palette;
    const palette = rawPalette && typeof rawPalette === 'object'
        ? (rawPalette as Record<string, unknown>)
        : null;

    const background = getThemeColor(
        palette?.background
        ?? palette?.fondo
        ?? (config as Record<string, unknown>).layout_background
        ?? (config as Record<string, unknown>).color_fondo
        ?? (config as Record<string, unknown>).fondo
    );
    const border = getThemeColor(
        palette?.border
        ?? palette?.borde
        ?? (config as Record<string, unknown>).layout_border
        ?? (config as Record<string, unknown>).color_borde
        ?? (config as Record<string, unknown>).borde
    );
    const accent = getThemeColor(
        palette?.accent
        ?? palette?.acento
        ?? (config as Record<string, unknown>).layout_accent
        ?? (config as Record<string, unknown>).color_acento
        ?? (config as Record<string, unknown>).color_primario
    );

    if (!background && !border && !accent) return null;
    return {
        background: background ?? undefined,
        border: border ?? undefined,
        accent: accent ?? undefined,
    };
};

const hasButtonPattern = (buttons: number[], expected: number[]) => (
    buttons.length === expected.length && buttons.every((v, i) => v === expected[i])
);

const isLikelyThreeXThree = (config?: DeporteConfig): boolean => {
    const pointsToWin = getConfigNumber(config, ['puntos_para_ganar']);
    const limitMinutes = getConfigNumber(config, ['tiempo_limite']);
    const buttons = getScoringButtons(config, []);
    return pointsToWin === 21 && limitMinutes === 10 && hasButtonPattern(buttons, [1, 2]);
};

const getPossessionSeconds = (config?: DeporteConfig): number | null => {
    const configured = getConfigNumber(config, [
        'tiempo_posesion_segundos',
        'reloj_posesion_segundos',
        'posesion_segundos',
        'tiempo_posesion'
    ]);
    if (configured) return configured;
    if (isLikelyThreeXThree(config)) return 12;
    return null;
};

const getTryValues = (config?: DeporteConfig): { valorTry: number; valorConversion: number } => {
    const readValue = (keys: string[], fallback: number, allowZero = false) => {
        for (const key of keys) {
            const raw = (config as Record<string, unknown> | undefined)?.[key];
            const value = toNumber(raw);
            if (value !== null && (allowZero ? value >= 0 : value > 0)) return value;
        }
        return fallback;
    };
    const valorTry = readValue(['valor_try', 'puntos_por_try'], 5);
    const valorConversion = readValue(['valor_conversion', 'puntos_por_conversion'], 2, true);
    return { valorTry, valorConversion };
};

const getCombinedScore = (tipo: string, marcador: MarcadorRecord, config?: DeporteConfig): number => {
    switch (tipo) {
        case 'goles':
            return n(marcador.goles_local) + n(marcador.goles_visitante);
        case 'puntos':
            return n(marcador.puntos_local) + n(marcador.puntos_visitante);
        case 'sets':
            return n(marcador.puntos_set_actual_local) + n(marcador.puntos_set_actual_visitante);
        case 'tries': {
            const { valorTry, valorConversion } = getTryValues(config);
            const local = (n(marcador.tries_local) * valorTry) + (n(marcador.conversiones_local) * valorConversion);
            const visitante = (n(marcador.tries_visitante) * valorTry) + (n(marcador.conversiones_visitante) * valorConversion);
            return local + visitante;
        }
        case 'carreras':
            return n(marcador.carreras_local) + n(marcador.carreras_visitante);
        case 'towertouchball':
            return n(marcador.puntos_local) + n(marcador.puntos_visitante);
        default:
            return n(marcador.local) + n(marcador.visitante);
    }
};

function n(v: unknown): number {
    return typeof v === 'number' ? v : 0;
}

export default function ScoreboardDisplay({ tipo, marcador, config, onUpdate, equipoLocalNombre, equipoVisitanteNombre }: ScoreboardDisplayProps) {
    const localName = equipoLocalNombre || 'Local';
    const visitanteName = equipoVisitanteNombre || 'Visitante';
    switch (tipo) {
        case 'goles':
            return <GolesScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'puntos':
            return <PuntosScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'sets':
            return <SetsScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'tries':
            return <TriesScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'carreras':
            return <CarrerasScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'towertouchball':
            return <TowerTouchballScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        default:
            return <GenericScoreboard marcador={marcador} />;
    }
}

// Component helpers
interface SubScoreboardProps {
    marcador: MarcadorRecord;
    onUpdate: (updates: MarcadorRecord) => void;
    config?: DeporteConfig;
    localName: string;
    visitanteName: string;
}

function SportFrame({
    variant,
    title,
    children,
    config
}: {
    variant: LayoutVariant;
    title: string;
    children: React.ReactNode;
    config?: DeporteConfig;
}) {
    const variantClasses: Record<LayoutVariant, string> = {
        classic: 'bg-paper/5 border-paper/20',
        arena: 'bg-gradient-to-br from-amber-500/10 via-paper/5 to-sky/10 border-amber-300/20',
        tactical: 'bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] border-slate-300/20',
        neon: 'bg-gradient-to-br from-cyan-500/10 via-paper/10 to-fuchsia-500/10 border-cyan-300/20',
    };
    const theme = getLayoutTheme(config);
    const style: React.CSSProperties = {};
    if (theme?.background) style.background = theme.background;
    if (theme?.border) style.borderColor = theme.border;
    if (theme?.accent) {
        (style as Record<string, string>)['--score-accent'] = theme.accent;
    }
    const titleStyle = theme?.accent ? { color: theme.accent } : undefined;

    return (
        <div
            className={`rounded-2xl border p-4 md:p-6 shadow-sm ${variantClasses[variant]}`}
            style={Object.keys(style).length ? style : undefined}
        >
            <div className="mb-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-sub" style={titleStyle}>{title}</span>
                <span className="text-[10px] text-sub/70">Layout: {variant}</span>
            </div>
            {children}
        </div>
    );
}

function MatchAlerts({
    tipo,
    marcador,
    config,
    defaultTime,
    localName,
    visitanteName,
}: {
    tipo: string;
    marcador: MarcadorRecord;
    config?: DeporteConfig;
    defaultTime: number;
    localName?: string;
    visitanteName?: string;
}) {
    const [message, setMessage] = React.useState<string | null>(null);
    const hideTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevScore = React.useRef(getCombinedScore(tipo, marcador, config));
    const prevServeBucket = React.useRef<number | null>(null);
    const initialRemaining = toNumber(marcador.tiempo_restante) ?? defaultTime;
    const prevElapsed = React.useRef(Math.max(0, defaultTime - initialRemaining));

    const showMessage = React.useCallback((text: string) => {
        setMessage(text);
        if (hideTimeout.current) {
            clearTimeout(hideTimeout.current);
        }
        hideTimeout.current = setTimeout(() => setMessage(null), 4500);
    }, []);

    React.useEffect(() => {
        const changeByPoints = getConfigNumber(config, ['cambio_campo_puntos']);
        const currentScore = getCombinedScore(tipo, marcador, config);
        if (changeByPoints && currentScore > prevScore.current) {
            const prevBucket = Math.floor(prevScore.current / changeByPoints);
            const currentBucket = Math.floor(currentScore / changeByPoints);
            if (currentBucket > prevBucket && currentScore > 0) {
                showMessage(`Cambio de campo: ${changeByPoints} puntos acumulados`);
            }
        }
        prevScore.current = currentScore;
    }, [config, marcador, showMessage, tipo]);

    React.useEffect(() => {
        const changeServePoints = getConfigNumber(config, ['cambio_saque_puntos']);
        if (!changeServePoints) return;
        const currentScore = getCombinedScore(tipo, marcador, config);
        const currentBucket = Math.floor(currentScore / changeServePoints);
        if (prevServeBucket.current !== null && currentBucket > prevServeBucket.current && currentScore > 0) {
            const nextTeam = currentBucket % 2 === 0 ? (localName || 'Local') : (visitanteName || 'Visitante');
            showMessage(`Cambio de saque: ${nextTeam}`);
        }
        prevServeBucket.current = currentBucket;
    }, [config, localName, marcador, showMessage, tipo, visitanteName]);

    React.useEffect(() => {
        const changeByMinutes = getConfigNumber(config, ['cambio_campo_tiempo_min', 'cambio_campo_minutos']);
        if (!changeByMinutes) return;

        const intervalSeconds = changeByMinutes * 60;
        const remaining = toNumber(marcador.tiempo_restante) ?? defaultTime;
        const elapsed = Math.max(0, defaultTime - remaining);
        const prevBucket = Math.floor(prevElapsed.current / intervalSeconds);
        const currentBucket = Math.floor(elapsed / intervalSeconds);

        if (currentBucket > prevBucket && elapsed > 0) {
            showMessage(`Cambio de campo: ${changeByMinutes} min transcurridos`);
        }
        prevElapsed.current = elapsed;
    }, [config, defaultTime, marcador, showMessage]);

    React.useEffect(() => () => {
        if (hideTimeout.current) {
            clearTimeout(hideTimeout.current);
        }
    }, []);

    if (!message) return null;

    return (
        <div className="rounded-lg border border-yellow-300/40 bg-yellow-500/10 p-2 text-center text-sm font-semibold text-yellow-200">
            {message}
        </div>
    );
}

function ServeIndicator({
    tipo,
    marcador,
    config,
    localName = 'Local',
    visitanteName = 'Visitante',
}: {
    tipo: string;
    marcador: MarcadorRecord;
    config?: DeporteConfig;
    localName?: string;
    visitanteName?: string;
}) {
    const changeServePoints = getConfigNumber(config, ['cambio_saque_puntos']);
    if (!changeServePoints) return null;
    const currentScore = getCombinedScore(tipo, marcador, config);
    const currentBucket = Math.floor(currentScore / changeServePoints);
    const team = currentBucket % 2 === 0 ? localName : visitanteName;

    return (
        <div className="text-center text-xs text-sub">
            Saque: <span className="font-semibold text-ink">{team}</span>
        </div>
    );
}

function PossessionClock({
    marcador,
    onUpdate,
    defaultSeconds,
    localName = 'Local',
    visitanteName = 'Visitante',
}: {
    marcador: MarcadorRecord;
    onUpdate: (updates: MarcadorRecord) => void;
    defaultSeconds: number;
    localName?: string;
    visitanteName?: string;
}) {
    const [running, setRunning] = React.useState(Boolean(marcador.posesion_activa));
    const lastTickRef = React.useRef(0);
    const remaining = toNumber(marcador.tiempo_posesion) ?? defaultSeconds;
    const team = marcador.posesion_equipo === 'visitante' ? 'visitante' : 'local';

    React.useEffect(() => {
        setRunning(Boolean(marcador.posesion_activa));
    }, [marcador.posesion_activa]);

    React.useEffect(() => {
        if (!running) return;
        if (lastTickRef.current === 0) {
            lastTickRef.current = Date.now();
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - lastTickRef.current) / 1000);
            if (elapsed < 1) return;
            const next = Math.max(0, remaining - elapsed);
            onUpdate({
                tiempo_posesion: next,
                posesion_activa: next > 0,
            });
            lastTickRef.current = now;
            if (next === 0) {
                setRunning(false);
                lastTickRef.current = 0;
                playWhistle();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [onUpdate, remaining, running]);

    const toggle = () => {
        const next = !running;
        setRunning(next);
        lastTickRef.current = next ? Date.now() : 0;
        onUpdate({ posesion_activa: next });
    };

    const reset = (nextTeam: 'local' | 'visitante') => {
        setRunning(false);
        lastTickRef.current = 0;
        onUpdate({
            tiempo_posesion: defaultSeconds,
            posesion_equipo: nextTeam,
            posesion_activa: false,
        });
    };

    const format = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

    return (
        <div className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-xs uppercase tracking-wider text-cyan-200">Posesion</div>
                    <div className="text-3xl font-black text-cyan-100">{format(remaining)}</div>
                </div>
                <div className="text-xs text-cyan-200">
                    Equipo: <span className="font-semibold uppercase">{team === 'local' ? localName : visitanteName}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggle}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${running ? 'bg-yellow-500/20 text-yellow-200' : 'bg-cyan-500/20 text-cyan-100'}`}
                    >
                        {running ? 'Pausar' : 'Iniciar'}
                    </button>
                    <button
                        onClick={() => reset(team)}
                        className="px-3 py-1 rounded text-xs font-semibold bg-cyan-900/40 text-cyan-100"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => reset(team === 'local' ? 'visitante' : 'local')}
                        className="px-3 py-1 rounded text-xs font-semibold bg-violet-500/20 text-violet-100"
                    >
                        Cambiar Posesion
                    </button>
                </div>
            </div>
        </div>
    );
}

function GolesScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
    const adjust = (team: 'local' | 'visitante', amount: number) => {
        const key = `goles_${team}`;
        const nextValue = Math.max(0, (marcador[key] || 0) + amount);
        onUpdate({ [key]: nextValue });
        if (amount > 0) playGoalSound();
    };

    const buttons = getScoringButtons(config, [1]);
    const puntosParaGanar = getConfigNumber(config, ['puntos_para_ganar']);
    const tiempoDefault = getDefaultTimeSeconds(config, 45);
    const variant = getLayoutVariant('goles', config);

    return (
        <SportFrame variant={variant} title="Marcador de goles" config={config}>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <TimerControls
                        tiempoRestante={marcador.tiempo_restante ?? tiempoDefault}
                        onUpdate={(newTime) => onUpdate({ tiempo_restante: newTime })}
                        defaultTime={tiempoDefault}
                    />
                    <WhistleButton size="lg" />
                </div>
                <MatchAlerts tipo="goles" marcador={marcador} config={config} defaultTime={tiempoDefault} localName={localName} visitanteName={visitanteName} />
                <ServeIndicator tipo="goles" marcador={marcador} config={config} localName={localName} visitanteName={visitanteName} />
                {puntosParaGanar && (
                    <div className="text-center text-xs text-sub">
                        Meta: {puntosParaGanar} puntos
                    </div>
                )}
                <div className="grid grid-cols-2 gap-8">
                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold text-ink">{localName}</h3>
                        <div className="text-7xl font-bold text-mint">{marcador.goles_local || 0}</div>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {buttons.map((value) => (
                                <button
                                    key={`goles-local-${value}`}
                                    onClick={() => adjust('local', value)}
                                    className="px-4 py-2 rounded-lg bg-mint/20 hover:bg-mint/30 text-mint font-bold transition-colors"
                                >
                                    +{value}
                                </button>
                            ))}
                            <button
                                onClick={() => adjust('local', -1)}
                                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold transition-colors"
                            >
                                -1
                            </button>
                        </div>
                    </div>
                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold text-ink">{visitanteName}</h3>
                        <div className="text-7xl font-bold text-sky">{marcador.goles_visitante || 0}</div>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {buttons.map((value) => (
                                <button
                                    key={`goles-visitante-${value}`}
                                    onClick={() => adjust('visitante', value)}
                                    className="px-4 py-2 rounded-lg bg-sky/20 hover:bg-sky/30 text-sky font-bold transition-colors"
                                >
                                    +{value}
                                </button>
                            ))}
                            <button
                                onClick={() => adjust('visitante', -1)}
                                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold transition-colors"
                            >
                                -1
                            </button>
                        </div>
                    </div>
                </div>
                {Array.isArray(config?.objetivos_adicionales) && config.objetivos_adicionales.length > 0 && (
                    <ObjetivosAdicionales
                        objetivos={config.objetivos_adicionales}
                        marcador={marcador}
                        onUpdate={onUpdate}
                        localName={localName}
                        visitanteName={visitanteName}
                    />
                )}
            </div>
        </SportFrame>
    );
}

function PuntosScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
    const adjust = (team: 'local' | 'visitante', amount: number) => {
        const key = `puntos_${team}`;
        onUpdate({ [key]: Math.max(0, (marcador[key] || 0) + amount) });
        if (amount > 0) playGoalSound();
    };

    const puntosParaGanar = getConfigNumber(config, ['puntos_para_ganar']);
    const buttons = getScoringButtons(config, puntosParaGanar ? [1] : [1, 2, 3]);
    const tiempoDefault = getDefaultTimeSeconds(config, 10);
    const possessionSeconds = getPossessionSeconds(config);
    const variant = getLayoutVariant('puntos', config);

    React.useEffect(() => {
        if (!possessionSeconds) return;
        const hasShotClock = typeof marcador.tiempo_posesion === 'number';
        const hasTeam = marcador.posesion_equipo === 'local' || marcador.posesion_equipo === 'visitante';
        if (!hasShotClock || !hasTeam) {
            onUpdate({
                tiempo_posesion: hasShotClock ? marcador.tiempo_posesion : possessionSeconds,
                posesion_equipo: hasTeam ? marcador.posesion_equipo : 'local',
                posesion_activa: false,
            });
        }
    }, [marcador.posesion_equipo, marcador.tiempo_posesion, onUpdate, possessionSeconds]);

    return (
        <SportFrame variant={variant} title="Marcador por puntos" config={config}>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <TimerControls
                        tiempoRestante={marcador.tiempo_restante ?? tiempoDefault}
                        onUpdate={(newTime) => onUpdate({ tiempo_restante: newTime })}
                        defaultTime={tiempoDefault}
                    />
                    <WhistleButton size="lg" />
                </div>
                <MatchAlerts tipo="puntos" marcador={marcador} config={config} defaultTime={tiempoDefault} localName={localName} visitanteName={visitanteName} />
                <ServeIndicator tipo="puntos" marcador={marcador} config={config} localName={localName} visitanteName={visitanteName} />
                {possessionSeconds && (
                    <PossessionClock
                        marcador={marcador}
                        onUpdate={onUpdate}
                        defaultSeconds={possessionSeconds}
                        localName={localName}
                        visitanteName={visitanteName}
                    />
                )}
                {puntosParaGanar && (
                    <div className="text-center text-xs text-sub">
                        Meta: {puntosParaGanar} puntos
                    </div>
                )}
                <div className="grid grid-cols-2 gap-8">
                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold text-ink">{localName}</h3>
                        <div className="text-7xl font-bold text-mint">{marcador.puntos_local || 0}</div>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {buttons.map((value) => (
                                <button
                                    key={`puntos-local-${value}`}
                                    onClick={() => adjust('local', value)}
                                    className="px-4 py-2 rounded-lg bg-mint/20 hover:bg-mint/30 text-mint font-bold transition-colors"
                                >
                                    +{value}
                                </button>
                            ))}
                            <button onClick={() => adjust('local', -1)} className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold transition-colors">-1</button>
                        </div>
                    </div>

                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold text-ink">{visitanteName}</h3>
                        <div className="text-7xl font-bold text-sky">{marcador.puntos_visitante || 0}</div>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {buttons.map((value) => (
                                <button
                                    key={`puntos-visitante-${value}`}
                                    onClick={() => adjust('visitante', value)}
                                    className="px-4 py-2 rounded-lg bg-sky/20 hover:bg-sky/30 text-sky font-bold transition-colors"
                                >
                                    +{value}
                                </button>
                            ))}
                            <button onClick={() => adjust('visitante', -1)} className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold transition-colors">-1</button>
                        </div>
                    </div>
                </div>
                {Array.isArray(config?.objetivos_adicionales) && config.objetivos_adicionales.length > 0 && (
                    <ObjetivosAdicionales
                        objetivos={config.objetivos_adicionales}
                        marcador={marcador}
                        onUpdate={onUpdate}
                        localName={localName}
                        visitanteName={visitanteName}
                    />
                )}
            </div>
        </SportFrame>
    );
}

function SetsScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
    const diferenciaMinima = getSetDifference(config);
    const checkSetWin = (puntosLocal: number, puntosVisitante: number, setActual: number) => {
        const targetPoints = getSetTargetPoints(config, setActual);
        const diff = Math.abs(puntosLocal - puntosVisitante);

        if (puntosLocal >= targetPoints && diff >= diferenciaMinima && puntosLocal > puntosVisitante) {
            return 'local';
        }
        if (puntosVisitante >= targetPoints && diff >= diferenciaMinima && puntosVisitante > puntosLocal) {
            return 'visitante';
        }
        return null;
    };

    const adjustPuntos = (team: 'local' | 'visitante', amount: number) => {
        const key = `puntos_set_actual_${team}`;
        const newPuntos = Math.max(0, (marcador[key] || 0) + amount);

        // Get current scores
        const puntosLocal = team === 'local' ? newPuntos : (marcador.puntos_set_actual_local || 0);
        const puntosVisitante = team === 'visitante' ? newPuntos : (marcador.puntos_set_actual_visitante || 0);
        const setActual = marcador.set_actual || 1;

        // Check for automatic set win
        const winner = checkSetWin(puntosLocal, puntosVisitante, setActual);

        if (winner && amount > 0) {
            // Set won! Update sets and reset points
            const newSetsWinner = (marcador[`sets_${winner}`] || 0) + 1;
            onUpdate({
                [key]: newPuntos,
                [`sets_${winner}`]: newSetsWinner,
                // Store set history before resetting
                [`set_${setActual}_local`]: puntosLocal,
                [`set_${setActual}_visitante`]: puntosVisitante,
            });

            // Slight delay, then reset for next set
            setTimeout(() => {
                onUpdate({
                    puntos_set_actual_local: 0,
                    puntos_set_actual_visitante: 0,
                    set_actual: setActual + 1
                });
            }, 500);

            playGoalSound();
        } else {
            onUpdate({ [key]: newPuntos });
            if (amount > 0) playGoalSound();
        }
    };

    const cambiarSetManual = (winner: 'local' | 'visitante') => {
        const setActual = marcador.set_actual || 1;
        const puntosLocal = marcador.puntos_set_actual_local || 0;
        const puntosVisitante = marcador.puntos_set_actual_visitante || 0;

        onUpdate({
            [`sets_${winner}`]: (marcador[`sets_${winner}`] || 0) + 1,
            [`set_${setActual}_local`]: puntosLocal,
            [`set_${setActual}_visitante`]: puntosVisitante,
            puntos_set_actual_local: 0,
            puntos_set_actual_visitante: 0,
            set_actual: setActual + 1
        });
        playGoalSound();
    };

    const buttons = getScoringButtons(config, [1]);
    const tiempoDefault = getDefaultTimeSeconds(config, 25);
    const setActual = marcador.set_actual || 1;
    const targetPoints = getSetTargetPoints(config, setActual);
    const variant = getLayoutVariant('sets', config);

    return (
        <SportFrame variant={variant} title="Marcador por sets" config={config}>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <TimerControls
                        tiempoRestante={marcador.tiempo_restante ?? tiempoDefault}
                        onUpdate={(newTime) => onUpdate({ tiempo_restante: newTime })}
                        defaultTime={tiempoDefault}
                    />
                    <WhistleButton size="lg" />
                </div>
                <MatchAlerts tipo="sets" marcador={marcador} config={config} defaultTime={tiempoDefault} localName={localName} visitanteName={visitanteName} />
                <ServeIndicator tipo="sets" marcador={marcador} config={config} localName={localName} visitanteName={visitanteName} />
                <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                        <div className="text-sm text-sub mb-1">Sets {localName}</div>
                        <div className="text-5xl font-bold text-mint">{marcador.sets_local || 0}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-sub mb-1">Sets {visitanteName}</div>
                        <div className="text-5xl font-bold text-sky">{marcador.sets_visitante || 0}</div>
                    </div>
                </div>

                <div className="border-t border-paper/20 pt-6">
                    <div className="text-center text-sub text-sm mb-4">
                        Set Actual: {setActual} · Meta: {targetPoints} pts (dif. {diferenciaMinima})
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="text-center space-y-3">
                            <div className="text-3xl font-bold text-ink">{marcador.puntos_set_actual_local || 0}</div>
                            <div className="flex gap-2 justify-center">
                                {buttons.map((value) => (
                                    <button
                                        key={`set-local-${value}`}
                                        onClick={() => adjustPuntos('local', value)}
                                        className="px-3 py-1 rounded bg-mint/20 text-mint"
                                    >
                                        +{value}
                                    </button>
                                ))}
                                <button onClick={() => adjustPuntos('local', -1)} className="px-3 py-1 rounded bg-red-500/20 text-red-400">-1</button>
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <div className="text-3xl font-bold text-ink">{marcador.puntos_set_actual_visitante || 0}</div>
                            <div className="flex gap-2 justify-center">
                                {buttons.map((value) => (
                                    <button
                                        key={`set-visitante-${value}`}
                                        onClick={() => adjustPuntos('visitante', value)}
                                        className="px-3 py-1 rounded bg-sky/20 text-sky"
                                    >
                                        +{value}
                                    </button>
                                ))}
                                <button onClick={() => adjustPuntos('visitante', -1)} className="px-3 py-1 rounded bg-red-500/20 text-red-400">-1</button>
                            </div>
                        </div>
                    </div>

                    {/* Manual Set Control */}
                    <div className="mt-6 border-t border-paper/20 pt-4">
                        <div className="text-center text-sub text-xs mb-3">Control Manual de Set (Arbitro)</div>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => cambiarSetManual('local')}
                                className="px-4 py-2 rounded-lg bg-mint/10 border border-mint/30 text-mint text-sm hover:bg-mint/20 transition-colors"
                            >
                                Set para {localName}
                            </button>
                            <button
                                onClick={() => cambiarSetManual('visitante')}
                                className="px-4 py-2 rounded-lg bg-sky/10 border border-sky/30 text-sky text-sm hover:bg-sky/20 transition-colors"
                            >
                                Set para {visitanteName}
                            </button>
                        </div>
                        <div className="text-center text-sub/60 text-xs mt-2">
                            Auto: {targetPoints}pts con {diferenciaMinima} de diferencia
                        </div>
                    </div>
                </div>
            </div>
        </SportFrame>
    );
}


function TriesScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
    const incrementTry = (team: 'local' | 'visitante') => {
        onUpdate({ [`tries_${team}`]: (marcador[`tries_${team}`] || 0) + 1 });
        playGoalSound();
    };

    const decrementTry = (team: 'local' | 'visitante') => {
        onUpdate({ [`tries_${team}`]: Math.max(0, (marcador[`tries_${team}`] || 0) - 1) });
    };

    const tiempoDefault = getDefaultTimeSeconds(config, 40);
    const variant = getLayoutVariant('tries', config);
    const { valorTry, valorConversion } = getTryValues(config);

    return (
        <SportFrame variant={variant} title="Marcador de rugby" config={config}>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <TimerControls
                        tiempoRestante={marcador.tiempo_restante ?? tiempoDefault}
                        onUpdate={(newTime) => onUpdate({ tiempo_restante: newTime })}
                        defaultTime={tiempoDefault}
                    />
                    <WhistleButton size="lg" />
                </div>
                <MatchAlerts tipo="tries" marcador={marcador} config={config} defaultTime={tiempoDefault} localName={localName} visitanteName={visitanteName} />
                <ServeIndicator tipo="tries" marcador={marcador} config={config} localName={localName} visitanteName={visitanteName} />
                <div className="text-center text-xs text-sub">
                    Valor try: {valorTry} · Conversión: {valorConversion}
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-center text-lg font-semibold text-ink">{localName}</h3>
                        <div className="space-y-3">
                            <div className="text-center">
                                <div className="text-sm text-sub">Tries</div>
                                <div className="text-4xl font-bold text-mint">{marcador.tries_local || 0}</div>
                                <div className="flex gap-2 justify-center mt-2">
                                    <button onClick={() => incrementTry('local')} className="px-3 py-1 rounded bg-mint/20 text-mint">+1</button>
                                    <button onClick={() => decrementTry('local')} className="px-3 py-1 rounded bg-red-500/20 text-red-400">-1</button>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-sub">Conversiones</div>
                                <div className="text-2xl font-bold text-ink">{marcador.conversiones_local || 0}</div>
                                <div className="flex gap-2 justify-center mt-2">
                                    <button onClick={() => onUpdate({ conversiones_local: (marcador.conversiones_local || 0) + 1 })} className="px-3 py-1 rounded bg-mint/20 text-mint">+1</button>
                                    <button onClick={() => onUpdate({ conversiones_local: Math.max(0, (marcador.conversiones_local || 0) - 1) })} className="px-3 py-1 rounded bg-red-500/20 text-red-400">-1</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-center text-lg font-semibold text-ink">{visitanteName}</h3>
                        <div className="space-y-3">
                            <div className="text-center">
                                <div className="text-sm text-sub">Tries</div>
                                <div className="text-4xl font-bold text-sky">{marcador.tries_visitante || 0}</div>
                                <div className="flex gap-2 justify-center mt-2">
                                    <button onClick={() => incrementTry('visitante')} className="px-3 py-1 rounded bg-sky/20 text-sky">+1</button>
                                    <button onClick={() => decrementTry('visitante')} className="px-3 py-1 rounded bg-red-500/20 text-red-400">-1</button>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-sub">Conversiones</div>
                                <div className="text-2xl font-bold text-ink">{marcador.conversiones_visitante || 0}</div>
                                <div className="flex gap-2 justify-center mt-2">
                                    <button onClick={() => onUpdate({ conversiones_visitante: (marcador.conversiones_visitante || 0) + 1 })} className="px-3 py-1 rounded bg-sky/20 text-sky">+1</button>
                                    <button onClick={() => onUpdate({ conversiones_visitante: Math.max(0, (marcador.conversiones_visitante || 0) - 1) })} className="px-3 py-1 rounded bg-red-500/20 text-red-400">-1</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SportFrame>
    );
}

function CarrerasScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
    const incrementCarrera = (team: 'local' | 'visitante') => {
        onUpdate({ [`carreras_${team}`]: (marcador[`carreras_${team}`] || 0) + 1 });
        playGoalSound();
    };

    const decrementCarrera = (team: 'local' | 'visitante') => {
        onUpdate({ [`carreras_${team}`]: Math.max(0, (marcador[`carreras_${team}`] || 0) - 1) });
    };

    const tiempoDefault = getDefaultTimeSeconds(config, 90);
    const variant = getLayoutVariant('carreras', config);

    return (
        <SportFrame variant={variant} title="Marcador de carreras" config={config}>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <TimerControls
                        tiempoRestante={marcador.tiempo_restante ?? tiempoDefault}
                        onUpdate={(newTime) => onUpdate({ tiempo_restante: newTime })}
                        defaultTime={tiempoDefault}
                    />
                    <WhistleButton size="lg" />
                </div>
                <MatchAlerts tipo="carreras" marcador={marcador} config={config} defaultTime={tiempoDefault} localName={localName} visitanteName={visitanteName} />
                <ServeIndicator tipo="carreras" marcador={marcador} config={config} localName={localName} visitanteName={visitanteName} />
                <div className="grid grid-cols-2 gap-8">
                    <ScoreColumn
                        label={localName}
                        value={marcador.carreras_local || 0}
                        onIncrement={() => incrementCarrera('local')}
                        onDecrement={() => decrementCarrera('local')}
                    />
                    <ScoreColumn
                        label={visitanteName}
                        value={marcador.carreras_visitante || 0}
                        onIncrement={() => incrementCarrera('visitante')}
                        onDecrement={() => decrementCarrera('visitante')}
                    />
                </div>
            </div>
        </SportFrame>
    );
}

function TowerTouchballScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
    const [isRunning, setIsRunning] = React.useState(false);
    const [lastTick, setLastTick] = React.useState<number>(0);
    const ttbDefaultTime = getDefaultTimeSeconds(config, 15);
    const variant = getLayoutVariant('towertouchball', config);

    // Sound helper function - uses shared audio assets
    const playSound = React.useCallback((type: 'whistle' | 'goal') => {
        if (type === 'whistle') {
            playWhistle();
        } else {
            playGoal();
        }
    }, []);

    // Timer effect
    React.useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - lastTick) / 1000);

            if (elapsed >= 1) {
                const newTime = Math.max(0, (marcador.tiempo_restante || ttbDefaultTime) - elapsed);
                onUpdate({ tiempo_restante: newTime });
                setLastTick(now);

                // Play whistle when time runs out
                if (newTime === 0) {
                    setIsRunning(false);
                    playSound('whistle');
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isRunning, lastTick, marcador.tiempo_restante, onUpdate, playSound, ttbDefaultTime]);

    const adjustPuntos = (team: 'local' | 'visitante', amount: number) => {
        const key = `puntos_${team}`;
        const newValue = (marcador[key] || 0) + amount;
        onUpdate({ [key]: newValue });

        // Play goal sound when scoring
        if (amount > 0) {
            playSound('goal');
        }
    };

    const toggleCono = (team: 'local' | 'visitante', index: number) => {
        const key = `conos_${team}`;
        const conos = [...(marcador[key] || [false, false, false])];
        conos[index] = !conos[index];
        onUpdate({ [key]: conos });

        // Play sound when knocking down cone
        if (!marcador[key]?.[index]) {
            playSound('whistle');
        }
    };

    const toggleTimer = () => {
        if (!isRunning) {
            setLastTick(Date.now());
            playSound('whistle'); // Start whistle
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        onUpdate({ tiempo_restante: ttbDefaultTime });
        setLastTick(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    const timeRemaining = marcador.tiempo_restante || ttbDefaultTime;
    const timeColor = timeRemaining < 60 ? 'text-red-400' : timeRemaining < 180 ? 'text-yellow-400' : 'text-ink';

    return (
        <SportFrame variant={variant} title="Marcador TowerTouchball" config={config}>
            <div className="space-y-6">
                {/* Timer */}
                <div className="text-center p-6 rounded-lg bg-paper/10 border-2 border-paper/20">
                    <div className="text-sm text-sub mb-2">Tiempo Restante</div>
                    <div className={`text-6xl font-bold ${timeColor} mb-4`}>
                        {formatTime(timeRemaining)}
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={toggleTimer}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all ${isRunning
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-mint/20 text-mint hover:bg-mint/30'
                                }`}
                        >
                            {isRunning ? 'Pausar' : 'Iniciar'}
                        </button>
                        <button
                            onClick={resetTimer}
                            className="px-6 py-3 rounded-lg bg-paper/20 text-sub hover:bg-paper/30 font-semibold transition-all"
                        >
                            Reiniciar
                        </button>
                    </div>
                </div>
                <ServeIndicator tipo="towertouchball" marcador={marcador} config={config} localName={localName} visitanteName={visitanteName} />

                {/* Puntos */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="text-center space-y-3">
                        <div className="text-sm text-sub">Puntos {localName}</div>
                        <div className="text-5xl font-bold text-mint">{marcador.puntos_local || 0}</div>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => adjustPuntos('local', 1)}
                                className="px-4 py-2 rounded-lg bg-mint/20 text-mint font-bold hover:bg-mint/30 transition-colors"
                            >
                                +1
                            </button>
                            <button
                                onClick={() => adjustPuntos('local', -1)}
                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 font-bold hover:bg-red-500/30 transition-colors"
                            >
                                -1
                            </button>
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                        <div className="text-sm text-sub">Puntos {visitanteName}</div>
                        <div className="text-5xl font-bold text-sky">{marcador.puntos_visitante || 0}</div>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => adjustPuntos('visitante', 1)}
                                className="px-4 py-2 rounded-lg bg-sky/20 text-sky font-bold hover:bg-sky/30 transition-colors"
                            >
                                +1
                            </button>
                            <button
                                onClick={() => adjustPuntos('visitante', -1)}
                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 font-bold hover:bg-red-500/30 transition-colors"
                            >
                                -1
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conos */}
                <div className="border-t border-paper/20 pt-6">
                    <div className="text-center text-sm text-sub mb-4">Conos Derribados</div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <div className="text-center text-xs text-sub mb-2">{localName}</div>
                            <div className="flex gap-2 justify-center">
                                {[0, 1, 2].map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleCono('local', i)}
                                        className={`w-14 h-14 rounded-lg border-2 transition-all hover:scale-110 ${(marcador.conos_local || [])[i]
                                            ? 'bg-red-500 border-red-400 animate-pulse'
                                            : i === 0
                                                ? 'bg-yellow-500/20 border-yellow-500/40'
                                                : 'bg-mint/20 border-mint/40'
                                            }`}
                                        title={i === 0 ? 'Cono Especial' : `Cono ${i + 1}`}
                                    >
                                        <div className="text-2xl">{i === 0 && '⭐'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-center text-xs text-sub mb-2">{visitanteName}</div>
                            <div className="flex gap-2 justify-center">
                                {[0, 1, 2].map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleCono('visitante', i)}
                                        className={`w-14 h-14 rounded-lg border-2 transition-all hover:scale-110 ${(marcador.conos_visitante || [])[i]
                                            ? 'bg-red-500 border-red-400 animate-pulse'
                                            : i === 0
                                                ? 'bg-yellow-500/20 border-yellow-500/40'
                                                : 'bg-sky/20 border-sky/40'
                                            }`}
                                        title={i === 0 ? 'Cono Especial' : `Cono ${i + 1}`}
                                    >
                                        <div className="text-2xl">{i === 0 && '⭐'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-xs text-sub mt-3">
                        ⭐ = Cono especial (no derribar primero)
                    </div>
                </div>
            </div>
        </SportFrame>
    );
}

interface ObjetivoConfig {
    nombre: string;
    max?: number;
    icono?: string;
    victoria_al_completar?: boolean;
}

function ObjetivosAdicionales({
    objetivos,
    marcador,
    onUpdate,
    localName = 'Local',
    visitanteName = 'Visitante',
}: {
    objetivos: ObjetivoConfig[];
    marcador: MarcadorRecord;
    onUpdate: (updates: MarcadorRecord) => void;
    localName?: string;
    visitanteName?: string;
}) {
    if (!objetivos.length) return null;

    const normalizeState = (raw: unknown, max: number) => {
        const base = Array.isArray(raw) ? raw.map(Boolean) : [];
        const next = base.slice(0, max);
        while (next.length < max) next.push(false);
        return next;
    };

    const toggle = (key: string, index: number, max: number) => {
        const current = normalizeState(marcador[key], max);
        current[index] = !current[index];
        onUpdate({ [key]: current });
    };

    return (
        <div className="border-t border-paper/20 pt-6 space-y-6">
            {objetivos.map((objetivo, idx) => {
                const max = Math.max(1, toNumber(objetivo.max) ?? 5);
                const icono = objetivo.icono || '🎯';
                const localKey = `objetivos_${idx}_local`;
                const visitanteKey = `objetivos_${idx}_visitante`;
                const local = normalizeState(marcador[localKey], max);
                const visitante = normalizeState(marcador[visitanteKey], max);

                return (
                    <div key={`${objetivo.nombre}-${idx}`} className="space-y-3">
                        <div className="text-center text-sm text-sub">{objetivo.nombre}</div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="text-center text-xs text-sub mb-2">{localName}</div>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {local.map((active, i) => (
                                        <button
                                            key={`obj-${idx}-local-${i}`}
                                            onClick={() => toggle(localKey, i, max)}
                                            className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 ${active
                                                ? 'bg-mint/40 border-mint text-mint'
                                                : 'bg-mint/10 border-mint/40 text-mint/60'
                                                }`}
                                            title={`${objetivo.nombre} ${i + 1}`}
                                        >
                                            <span className="text-lg">{icono}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-center text-xs text-sub mb-2">{visitanteName}</div>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {visitante.map((active, i) => (
                                        <button
                                            key={`obj-${idx}-visitante-${i}`}
                                            onClick={() => toggle(visitanteKey, i, max)}
                                            className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 ${active
                                                ? 'bg-sky/40 border-sky text-sky'
                                                : 'bg-sky/10 border-sky/40 text-sky/60'
                                                }`}
                                            title={`${objetivo.nombre} ${i + 1}`}
                                        >
                                            <span className="text-lg">{icono}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {objetivo.victoria_al_completar && (
                            <div className="text-center text-xs text-sub/60">
                                Victoria al completar los objetivos
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function GenericScoreboard({ marcador }: { marcador: MarcadorRecord }) {
    return (
        <div className="text-center py-8">
            <p className="text-sub">Marcador genérico</p>
            <pre className="mt-4 text-xs text-sub">{JSON.stringify(marcador, null, 2)}</pre>
        </div>
    );
}

// Reusable Score Column Component
interface ScoreColumnProps {
    label: string;
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
}

function ScoreColumn({ label, value, onIncrement, onDecrement }: ScoreColumnProps) {
    return (
        <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-ink">{label}</h3>
            <div className="text-7xl font-bold text-mint">{value}</div>
            <div className="flex gap-2 justify-center">
                <button
                    onClick={onIncrement}
                    className="px-6 py-3 rounded-lg bg-mint/20 hover:bg-mint/30 text-mint font-bold text-lg transition-colors"
                >
                    +1
                </button>
                <button
                    onClick={onDecrement}
                    className="px-6 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-lg transition-colors"
                >
                    -1
                </button>
            </div>
        </div>
    );
}
