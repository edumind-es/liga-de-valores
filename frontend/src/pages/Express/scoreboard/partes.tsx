/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Piezas compartidas del scoreboard Express: marco visual, alertas de
 * partido, indicador de saque, reloj de posesión, objetivos adicionales
 * y columna de puntuación. Extraídas de ScoreboardDisplay.tsx sin cambios.
 */
import * as React from 'react';
import { playWhistle } from '@/lib/audio';
import type { DeporteConfig } from '@/types/marcador';
import {
    getCombinedScore,
    getConfigNumber,
    getLayoutTheme,
    getReglasDeporte,
    toNumber,
    type LayoutVariant,
    type MarcadorRecord,
} from './utils';

export function SportFrame({
    variant,
    title,
    children,
    config,
    tipo,
}: {
    variant: LayoutVariant;
    title: string;
    children: React.ReactNode;
    config?: DeporteConfig;
    tipo?: string;
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
    const reglas = tipo ? getReglasDeporte(tipo, config) : [];

    return (
        <div
            className={`rounded-2xl border p-4 md:p-6 shadow-sm ${variantClasses[variant]}`}
            style={Object.keys(style).length ? style : undefined}
        >
            <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-sub" style={titleStyle}>{title}</span>
            </div>
            {reglas.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Reglas del deporte">
                    {reglas.map((r) => (
                        <span
                            key={r}
                            className="rounded-[2px] border border-lme-border/70 bg-lme-surface-soft px-2 py-0.5 text-[11px] text-sub"
                        >
                            {r}
                        </span>
                    ))}
                </div>
            )}
            {children}
        </div>
    );
}

export function MatchAlerts({
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

export function ServeIndicator({
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

export function PossessionClock({
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

export interface ObjetivoConfig {
    nombre: string;
    max?: number;
    icono?: string;
    victoria_al_completar?: boolean;
}

export function ObjetivosAdicionales({
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

export function GenericScoreboard({ marcador }: { marcador: MarcadorRecord }) {
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

export function ScoreColumn({ label, value, onIncrement, onDecrement }: ScoreColumnProps) {
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
