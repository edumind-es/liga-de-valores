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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type TipoDeporte } from '@/types/liga';
import { type ExpressTeam, type ExpressMatch } from '@/types/express';
import DeporteSelector from './wizard/DeporteSelector';
import EquiposConfig from './wizard/EquiposConfig';
import Confirmacion from './wizard/Confirmacion';

type WizardStep = 1 | 2 | 3;

const createExpressMatchId = () => {
    const randomPart = Math.random().toString(36).slice(2, 11);
    return `match_${Date.now()}_${randomPart}`;
};

export default function ExpressWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState<WizardStep>(1);
    const [selectedDeporte, setSelectedDeporte] = useState<TipoDeporte | null>(null);
    const [equipos, setEquipos] = useState<ExpressTeam[]>([
        { id: '1', nombre: '', rol: 'local' },
        { id: '2', nombre: '', rol: 'visitante' }
    ]);

    const canProceed = () => {
        switch (step) {
            case 1:
                return selectedDeporte !== null;
            case 2:
                return equipos.filter(eq => eq.nombre.trim()).length >= 2;
            case 3:
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (step < 3 && canProceed()) {
            setStep((step + 1) as WizardStep);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((step - 1) as WizardStep);
        } else {
            navigate('/express');
        }
    };

    const handleCrearPartido = () => {
        if (!selectedDeporte) return;

        const matchId = createExpressMatchId();

        const match: ExpressMatch = {
            id: matchId,
            deporte: {
                id: selectedDeporte.id,
                nombre: selectedDeporte.nombre,
                codigo: selectedDeporte.codigo,
                tipo_marcador: selectedDeporte.tipo_marcador,
                icono: selectedDeporte.icono || '',
                logo_file: selectedDeporte.logo_file || null,
                config: selectedDeporte.config
            },
            equipos: equipos.filter(eq => eq.nombre.trim()),
            marcador: inicializarMarcador(selectedDeporte.tipo_marcador, selectedDeporte.config),
            evaluaciones: {},
            fecha: new Date().toISOString(),
            finalizado: false,
            tiempoInicio: new Date().toISOString()
        };

        // Guardar en SessionStorage
        sessionStorage.setItem(`express_match_${matchId}`, JSON.stringify(match));

        // Redirigir al marcador
        navigate(`/express/partido/${matchId}`);
    };

    const inicializarMarcador = (tipoMarcador: string, config?: Record<string, unknown>): Record<string, unknown> => {
        // Compute default time based on sport type and config
        const toNumber = (value: unknown): number | null => {
            if (typeof value === 'number') return Number.isFinite(value) ? value : null;
            if (typeof value === 'string' && value.trim() !== '') {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : null;
            }
            return null;
        };

        const getConfigNumber = (keys: string[]): number | null => {
            if (!config) return null;
            for (const key of keys) {
                const raw = config[key];
                const value = toNumber(raw);
                if (value !== null && value > 0) return value;
            }
            return null;
        };

        const getDefaultTime = (fallbackMinutes: number): number => {
            const primaryMinutes = getConfigNumber([
                'tiempo_limite',
                'tiempo_regulacion',
                'duracion_partido',
                'duracion_minutos',
                'duracion_tiempo_min',
            ]);
            if (primaryMinutes) return primaryMinutes * 60;

            const duracionCuarto = getConfigNumber(['duracion_cuarto']);
            const cuartos = getConfigNumber(['cuartos']);
            if (duracionCuarto && cuartos) {
                return duracionCuarto * cuartos * 60;
            }

            return fallbackMinutes * 60;
        };

        const getPossessionSeconds = (): number | null => {
            const configured = getConfigNumber([
                'tiempo_posesion_segundos',
                'reloj_posesion_segundos',
                'posesion_segundos',
                'tiempo_posesion'
            ]);
            if (configured) return configured;
            const pointsToWin = Number(config?.puntos_para_ganar);
            const limitMinutes = Number(config?.tiempo_limite);
            const buttons = Array.isArray(config?.botones_puntuacion)
                ? config.botones_puntuacion.map((v: unknown) => Number(v)).filter((v: number) => Number.isFinite(v) && v > 0).sort((a: number, b: number) => a - b)
                : [];
            const isLikelyThreeXThree = pointsToWin === 21 && limitMinutes === 10 && buttons.length === 2 && buttons[0] === 1 && buttons[1] === 2;
            return isLikelyThreeXThree ? 12 : null;
        };

        switch (tipoMarcador) {
            case 'goles':
                return { goles_local: 0, goles_visitante: 0, tiempo_restante: getDefaultTime(45) };
            case 'puntos': {
                const base = { puntos_local: 0, puntos_visitante: 0, tiempo_restante: getDefaultTime(10) };
                const possession = getPossessionSeconds();
                if (possession) {
                    return {
                        ...base,
                        tiempo_posesion: possession,
                        posesion_equipo: 'local',
                        posesion_activa: false,
                    };
                }
                return base;
            }
            case 'sets':
                return {
                    sets_local: 0,
                    sets_visitante: 0,
                    puntos_set_actual_local: 0,
                    puntos_set_actual_visitante: 0,
                    set_actual: 1,
                    tiempo_restante: getDefaultTime(25)
                };
            case 'tries':
                return { tries_local: 0, tries_visitante: 0, conversiones_local: 0, conversiones_visitante: 0, tiempo_restante: getDefaultTime(40) };
            case 'carreras':
                return { carreras_local: 0, carreras_visitante: 0, tiempo_restante: getDefaultTime(90) };
            case 'towertouchball':
                return {
                    puntos_local: 0,
                    puntos_visitante: 0,
                    conos_local: [false, false, false],
                    conos_visitante: [false, false, false],
                    tiempo_restante: getDefaultTime(15)
                };
            default:
                return {};
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#040614] via-[#0a0f24] to-[#040614] p-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Progress indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${s < step
                                        ? 'bg-mint text-[#040614]'
                                        : s === step
                                            ? 'bg-sky text-[#040614]'
                                            : 'bg-paper/20 text-sub'
                                        }`}
                                >
                                    {s < step ? <Check className="h-5 w-5" /> : s}
                                </div>
                                {s < 3 && (
                                    <div
                                        className={`w-16 h-1 ${s < step ? 'bg-mint' : 'bg-paper/20'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-ink">
                            {step === 1 && 'Selecciona el Deporte'}
                            {step === 2 && 'Configura los Equipos'}
                            {step === 3 && 'Confirma y Crea'}
                        </h2>
                        <p className="text-sub mt-1">
                            Paso {step} de 3
                        </p>
                    </div>
                </div>

                {/* Content */}
                <Card variant="glass">
                    <CardContent className="p-6">
                        {step === 1 && (
                            <DeporteSelector
                                selectedDeporte={selectedDeporte}
                                onSelect={setSelectedDeporte}
                            />
                        )}
                        {step === 2 && (
                            <EquiposConfig
                                equipos={equipos}
                                onChange={setEquipos}
                            />
                        )}
                        {step === 3 && (
                            <Confirmacion
                                deporte={selectedDeporte}
                                equipos={equipos.filter(eq => eq.nombre.trim())}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        {step === 1 ? 'Cancelar' : 'Atrás'}
                    </Button>

                    {step < 3 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCrearPartido}
                            className="bg-gradient-to-r from-mint to-sky"
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Crear Partido
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
