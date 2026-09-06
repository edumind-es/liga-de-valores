/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Marcador TowerTouchball (timer propio, puntos y conos). Extraído de ScoreboardDisplay.tsx sin cambios. */
import * as React from 'react';
import { playGoal, playWhistle } from '@/lib/audio';
import { ServeIndicator, SportFrame } from '../partes';
import {
    getDefaultTimeSeconds,
    getLayoutVariant,
    type SubScoreboardProps,
} from '../utils';

export function TowerTouchballScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
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
        <SportFrame variant={variant} title="Marcador TowerTouchball" config={config} tipo="towertouchball">
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
