/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/** Marcador de carreras. Extraído de ScoreboardDisplay.tsx sin cambios. */
import { TimerControls } from '@/components/TimerControls';
import { WhistleButton } from '@/components/WhistleButton';
import { MatchAlerts, ScoreColumn, ServeIndicator, SportFrame } from '../partes';
import {
    getDefaultTimeSeconds,
    getLayoutVariant,
    playGoalSound,
    type SubScoreboardProps,
} from '../utils';

export function CarrerasScoreboard({ marcador, onUpdate, config, localName, visitanteName }: SubScoreboardProps) {
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
        <SportFrame variant={variant} title="Marcador de carreras" config={config} tipo="carreras">
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
