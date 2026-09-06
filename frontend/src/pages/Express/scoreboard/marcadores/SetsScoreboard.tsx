/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Marcador por sets (con victoria automática de set). Extraído de ScoreboardDisplay.tsx sin cambios. */
import { TimerControls } from '@/components/TimerControls';
import { WhistleButton } from '@/components/WhistleButton';
import { MatchAlerts, ServeIndicator, SportFrame } from '../partes';
import {
    getDefaultTimeSeconds,
    getLayoutVariant,
    getScoringButtons,
    getSetDifference,
    getSetTargetPoints,
    playGoalSound,
    type SubScoreboardProps,
} from '../utils';

export function SetsScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
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
        <SportFrame variant={variant} title="Marcador por sets" config={config} tipo="sets">
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
