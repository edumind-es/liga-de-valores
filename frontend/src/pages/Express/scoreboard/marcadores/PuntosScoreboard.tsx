/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Marcador por puntos (con reloj de posesión). Extraído de ScoreboardDisplay.tsx sin cambios. */
import * as React from 'react';
import { TimerControls } from '@/components/TimerControls';
import { WhistleButton } from '@/components/WhistleButton';
import { MatchAlerts, ObjetivosAdicionales, PossessionClock, ServeIndicator, SportFrame } from '../partes';
import {
    getConfigNumber,
    getDefaultTimeSeconds,
    getLayoutVariant,
    getPossessionSeconds,
    getScoringButtons,
    playGoalSound,
    type SubScoreboardProps,
} from '../utils';

export function PuntosScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
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
        <SportFrame variant={variant} title="Marcador por puntos" config={config} tipo="puntos">
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
