/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Marcador de goles. Extraído de ScoreboardDisplay.tsx sin cambios. */
import { TimerControls } from '@/components/TimerControls';
import { WhistleButton } from '@/components/WhistleButton';
import { MatchAlerts, ObjetivosAdicionales, ServeIndicator, SportFrame } from '../partes';
import {
    getConfigNumber,
    getDefaultTimeSeconds,
    getLayoutVariant,
    getScoringButtons,
    playGoalSound,
    type SubScoreboardProps,
} from '../utils';

export function GolesScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
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
        <SportFrame variant={variant} title="Marcador de goles" config={config} tipo="goles">
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
