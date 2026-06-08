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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, Users, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Equipo, type TipoDeporte, type Marcador } from '@/types/liga';
import { getImageUrl } from '@/utils/url';
import { playGoal } from '@/lib/audio';

interface ScoreboardProps {
    equipoLocal: Equipo;
    equipoVisitante: Equipo;
    marcador: Marcador;
    tipoDeporte: TipoDeporte;
    isLive?: boolean;
    onScoreChange?: (newMarcador: Marcador) => void;
    evaluacion?: Record<string, number>;
}

type ScoreboardConfig = Record<string, unknown>;
type ObjectiveConfig = {
    nombre?: string;
    icono?: string;
    max?: number;
};

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const toNumberArray = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => toNumber(entry))
        .filter((entry): entry is number => entry !== null && entry > 0);
};

const toBooleanArray = (value: unknown, size: number): boolean[] => {
    const base = Array.isArray(value) ? value.map(Boolean) : [];
    const normalized = base.slice(0, size);
    while (normalized.length < size) normalized.push(false);
    return normalized;
};

export function Scoreboard({
    equipoLocal,
    equipoVisitante,
    marcador,
    tipoDeporte,
    isLive = false,
    onScoreChange,
    evaluacion
}: ScoreboardProps) {
    const prevScoreLocal = useRef(marcador?.goles_local || 0);
    const prevScoreVisitante = useRef(marcador?.goles_visitante || 0);

    const [showAlert, setShowAlert] = useState<string | null>(null);
    const config = useMemo<ScoreboardConfig>(
        () => (tipoDeporte.config ?? {}) as ScoreboardConfig,
        [tipoDeporte.config]
    );
    const serveChangePoints = toNumber(config.cambio_saque_puntos);
    const objetivos = Array.isArray(config.objetivos_adicionales)
        ? config.objetivos_adicionales.filter((item): item is ObjectiveConfig => typeof item === 'object' && item !== null)
        : [];
    const mainObjective = objetivos[0];
    const objectiveMax = Math.max(1, toNumber(mainObjective?.max) ?? 1);
    const localObjectives = toBooleanArray(marcador.conos_local, objectiveMax);
    const visitanteObjectives = toBooleanArray(marcador.conos_visitante, objectiveMax);

    const showTimedAlert = useCallback((message: string, durationMs: number) => {
        requestAnimationFrame(() => {
            setShowAlert(message);
            setTimeout(() => setShowAlert(null), durationMs);
        });
    }, []);

    const toggleObjective = (team: 'local' | 'visitante', index: number) => {
        if (!isLive || !onScoreChange) return;
        const key = team === 'local' ? 'conos_local' : 'conos_visitante';
        const current = toBooleanArray(marcador[key], objectiveMax);
        current[index] = !current[index];
        onScoreChange({ ...marcador, [key]: current });
    };

    useEffect(() => {
        if (!isLive) return;

        const currentLocal = marcador?.goles_local || 0;
        const currentVisitante = marcador?.goles_visitante || 0;

        if (currentLocal > prevScoreLocal.current || currentVisitante > prevScoreVisitante.current) {
            playGoal();
        }

        const totalSets = (marcador?.sets_local || 0) + (marcador?.sets_visitante || 0);

        // 1. Set Target Derivation
        let setTarget: number | null = null;
        if (config.puntos_por_set) {
            if (Array.isArray(config.puntos_por_set)) {
                const parsed = toNumberArray(config.puntos_por_set);
                if (parsed.length > 0) {
                    setTarget = parsed[totalSets] ?? parsed[parsed.length - 1];
                }
            } else {
                setTarget = toNumber(config.puntos_por_set);
            }
        }

        // 2. Field Change Alert
        const fieldChangeLimit = toNumber(config.cambio_campo_puntos);
        if (fieldChangeLimit) {
            const limit = fieldChangeLimit;
            const totalPoints = currentLocal + currentVisitante;

            // Bottlebol Tie-break heuristic
            const isTieBreak = Array.isArray(config.puntos_por_set) && totalSets >= 2;
            const allowAlert = !Array.isArray(config.puntos_por_set) || isTieBreak;

            if (allowAlert && totalPoints > 0 && totalPoints % limit === 0 &&
                (currentLocal > prevScoreLocal.current || currentVisitante > prevScoreVisitante.current)) {
                showTimedAlert("¡CAMBIO DE CAMPO!", 5000);
            }
        }

        // 3. Set Point Alert
        if (setTarget) {
            if ((currentLocal >= setTarget || currentVisitante >= setTarget) && Math.abs(currentLocal - currentVisitante) >= 2) {
                showTimedAlert("¡SET / PARTE FINALIZADA!", 5000);
            }
        }

        // 4. Serve Change Alert
        const serveChangeLimit = toNumber(config.cambio_saque_puntos);
        if (serveChangeLimit) {
            const limit = serveChangeLimit;
            const totalPoints = currentLocal + currentVisitante;

            if (totalPoints > 0 && totalPoints % limit === 0 &&
                (currentLocal > prevScoreLocal.current || currentVisitante > prevScoreVisitante.current)) {
                showTimedAlert("🎾 CAMBIO DE SAQUE", 3000);
            }
        }

        prevScoreLocal.current = currentLocal;
        prevScoreVisitante.current = currentVisitante;
    }, [config, isLive, marcador, showTimedAlert, tipoDeporte]);

    const handleScoreUpdate = (team: 'local' | 'visitante', delta: number) => {
        if (!onScoreChange) return;

        const currentVal = team === 'local'
            ? (marcador?.goles_local || 0)
            : (marcador?.goles_visitante || 0);

        const newVal = Math.max(0, currentVal + delta);

        const newMarcador = {
            ...marcador,
            [team === 'local' ? 'goles_local' : 'goles_visitante']: newVal
        };

        onScoreChange(newMarcador);
    };

    const getScoreControls = (team: 'local' | 'visitante') => {
        // Detect high scoring sports based on database configuration (tipo_marcador) or name fallback
        const isHighScoring =
            (tipoDeporte.tipo_marcador && ['puntos', 'tries'].includes(tipoDeporte.tipo_marcador.toLowerCase())) ||
            ['baloncesto', 'basket', 'badminton', 'voleibol', 'rugby'].some(s =>
                tipoDeporte.nombre.toLowerCase().includes(s) ||
                tipoDeporte.codigo.toLowerCase().includes(s)
            );

        const buttons = toNumberArray(config.botones_puntuacion);
        const resolvedButtons = buttons.length > 0 ? buttons : (isHighScoring ? [1, 2, 3] : [1]);

        return (
            <div className="flex flex-col gap-2 items-center">
                <div className="flex flex-wrap justify-center gap-2 max-w-[120px]">
                    <button
                        onClick={() => handleScoreUpdate(team, -1)}
                        className="w-10 h-10 rounded-full bg-lme-surface-soft border border-lme-border hover:bg-white/10 flex items-center justify-center font-bold text-sub transition-colors mb-1"
                    >-</button>

                    {resolvedButtons.map((val) => (
                        <button
                            key={val}
                            onClick={() => handleScoreUpdate(team, val)}
                            className={`w-10 h-10 rounded-full bg-gradient-to-r ${team === 'local' ? 'from-mint/20 to-sky/20 border-mint/30 text-mint' : 'from-vio/20 to-edufis-mental-end/20 border-vio/30 text-vio'} border hover:brightness-110 flex items-center justify-center font-bold transition-colors text-sm`}
                        >
                            +{val}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Card className="glass-card overflow-hidden border-lme-border relative">
            {/* Alert Overlay */}
            {showAlert && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-yellow-500 text-black px-6 py-4 rounded-xl shadow-2xl transform scale-110 animate-pulse">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">🔄</span>
                            <span className="text-2xl font-black uppercase tracking-widest">{showAlert}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Status Bar */}
            <div className="bg-sky/10 p-3 flex justify-between items-center text-xs font-medium text-sub border-b border-lme-border">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-red-400 font-semibold">EN VIVO</span>
                </div>
                <div className="text-ink uppercase tracking-wider">{tipoDeporte.nombre}</div>
                <div className="flex items-center gap-1.5">
                    {/* Serve Indicator if configured */}
                    {serveChangePoints && (
                        <div className="px-2 py-0.5 bg-mint/10 rounded text-mint flex items-center gap-1">
                            <span className="text-[10px]">SAQUE:</span>
                            {Math.floor(((marcador?.goles_local || 0) + (marcador?.goles_visitante || 0)) / serveChangePoints) % 2 === 0 ? equipoLocal.nombre : equipoVisitante.nombre}
                        </div>
                    )}
                    <Volume2 className="h-3.5 w-3.5 text-mint" />
                    <span>Sonido Activo</span>
                </div>
            </div>

            <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                    {/* Local Team */}
                    <div className="flex-1 flex flex-col items-center text-center space-y-4">
                        <div className="relative group w-32 h-32 flex items-center justify-center">
                            <div className="absolute -inset-4 bg-gradient-to-r from-mint to-sky rounded-full opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-500"></div>
                            {equipoLocal.logo_filename ? (
                                <img
                                    src={getImageUrl(`/static/uploads/${equipoLocal.logo_filename}`)}
                                    alt={equipoLocal.nombre}
                                    className="w-full h-full object-contain relative z-10"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-lme-surface-soft flex items-center justify-center border-2 border-mint/30 relative z-10">
                                    <span className="text-3xl font-bold text-mint">{equipoLocal.nombre.substring(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-ink">{equipoLocal.nombre}</h3>
                            <div className="flex gap-2 justify-center mt-2">
                                {(evaluacion?.grada_animar_local ?? 0) > 0 && (
                                    <Badge variant="success">
                                        <Users className="w-3 h-3 mr-1" /> Grada
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-center mx-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <span className={`text-6xl md:text-7xl font-black tabular-nums tracking-tighter ${(marcador?.goles_local || 0) > (marcador?.goles_visitante || 0) ? 'text-mint drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]' : 'text-ink'
                                    }`}>
                                    {marcador?.goles_local || 0}
                                </span>
                            </div>
                            <span className="text-4xl text-sub/50 font-light">-</span>
                            <div className="relative">
                                <span className={`text-6xl md:text-7xl font-black tabular-nums tracking-tighter ${(marcador?.goles_visitante || 0) > (marcador?.goles_local || 0) ? 'text-vio drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'text-ink'
                                    }`}>
                                    {marcador?.goles_visitante || 0}
                                </span>
                            </div>
                        </div>

                        {/* Score Controls */}
                        {isLive && onScoreChange && (
                            <div className="flex gap-16 mt-8">
                                {getScoreControls('local')}
                                {getScoreControls('visitante')}
                            </div>
                        )}
                    </div>

                    {/* Visitor Team */}
                    <div className="flex-1 flex flex-col items-center text-center space-y-4">
                        <div className="relative group w-32 h-32 flex items-center justify-center">
                            <div className="absolute -inset-4 bg-gradient-to-r from-vio to-edufis-mental-end rounded-full opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-500"></div>
                            {equipoVisitante.logo_filename ? (
                                <img
                                    src={getImageUrl(`/static/uploads/${equipoVisitante.logo_filename}`)}
                                    alt={equipoVisitante.nombre}
                                    className="w-full h-full object-contain relative z-10"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-lme-surface-soft flex items-center justify-center border-2 border-vio/30 relative z-10">
                                    <span className="text-3xl font-bold text-vio">{equipoVisitante.nombre.substring(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-ink">{equipoVisitante.nombre}</h3>
                            <div className="flex gap-2 justify-center mt-2">
                                {(evaluacion?.grada_animar_visitante ?? 0) > 0 && (
                                    <Badge variant="success">
                                        <Users className="w-3 h-3 mr-1" /> Grada
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Match Info / Referee */}
            <div className="mt-8 pt-6 border-t border-lme-border flex justify-center pb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-lme-surface-soft rounded-full text-sm text-sub border border-lme-border">
                    <User className="w-4 h-4 text-mint" />
                    <span className="font-semibold text-ink">Árbitro:</span>
                    <span>Equipo Arbitral Asignado</span>
                </div>
            </div>

            {/* Generic Objectives (Cones, Flags, etc.) */}
            {mainObjective && (
                <div className="p-4 border-t border-lme-border bg-lme-surface-soft/50">
                    <div className="flex justify-around items-center gap-4">
                        {/* Local Objectives */}
                        <div className="flex gap-2">
                            {Array.from({ length: objectiveMax }).map((_, i) => (
                                <button key={`local-obj-${i}`}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${localObjectives[i] ? 'bg-mint border-mint text-white scale-110' : 'border-mint/30 text-mint/30 hover:border-mint/60'
                                        }`}
                                    onClick={() => toggleObjective('local', i)}
                                >
                                    {mainObjective.icono || '🎯'}
                                </button>
                            ))}
                        </div>

                        <div className="text-xs font-bold text-sub uppercase tracking-wider">
                            {mainObjective.nombre}
                        </div>

                        {/* Visitor Objectives */}
                        <div className="flex gap-2">
                            {Array.from({ length: objectiveMax }).map((_, i) => (
                                <button key={`visitante-obj-${i}`}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${visitanteObjectives[i] ? 'bg-vio border-vio text-white scale-110' : 'border-vio/30 text-vio/30 hover:border-vio/60'
                                        }`}
                                    onClick={() => toggleObjective('visitante', i)}
                                >
                                    {mainObjective.icono || '🎯'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
