/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Marcador de rugby (tries y conversiones). Extraído de ScoreboardDisplay.tsx sin cambios. */
import { TimerControls } from '@/components/TimerControls';
import { WhistleButton } from '@/components/WhistleButton';
import { MatchAlerts, ServeIndicator, SportFrame } from '../partes';
import {
    getDefaultTimeSeconds,
    getLayoutVariant,
    getTryValues,
    playGoalSound,
    type SubScoreboardProps,
} from '../utils';

export function TriesScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
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
        <SportFrame variant={variant} title="Marcador de rugby" config={config} tipo="tries">
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
