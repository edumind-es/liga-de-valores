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

import { type TipoDeporte } from '@/types/liga';
import { type ExpressTeam } from '@/types/express';
import SportAvatar from '@/components/SportAvatar';

interface ConfirmacionProps {
    deporte: TipoDeporte | null;
    equipos: ExpressTeam[];
}

const getRolLabel = (rol: string): string => {
    const labels: Record<string, string> = {
        local: 'Local',
        visitante: 'Visitante',
        arbitro: 'Árbitro',
        grada_local: 'Grada Local',
        grada_visitante: 'Grada Visitante'
    };
    return labels[rol] || rol;
};

export default function Confirmacion({ deporte, equipos }: ConfirmacionProps) {
    if (!deporte) return null;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-ink mb-3">Resumen del Partido</h3>
                <p className="text-sub text-sm">
                    Revisa la configuración antes de crear el partido.
                </p>
            </div>

            {/* Deporte */}
            <div className="p-4 rounded-lg border border-paper/20 bg-paper/5">
                <div className="flex items-center gap-3">
                    <SportAvatar nombre={deporte.nombre} logoFile={deporte.logo_file} className="w-14 h-14" />
                    <div>
                        <div className="font-semibold text-ink">{deporte.nombre}</div>
                        <div className="text-sm text-sub">Marcador: {deporte.tipo_marcador}</div>
                    </div>
                </div>
            </div>

            {/* Equipos */}
            <div>
                <h4 className="font-medium text-ink mb-3">Equipos Participantes ({equipos.length})</h4>
                <div className="space-y-2">
                    {equipos.map((equipo) => (
                        <div
                            key={equipo.id}
                            className="p-3 rounded-lg border border-paper/20 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                {equipo.color && (
                                    <div
                                        className="w-6 h-6 rounded-full border-2 border-paper/40"
                                        style={{ backgroundColor: equipo.color }}
                                    />
                                )}
                                <div>
                                    <div className="font-medium text-ink">{equipo.nombre}</div>
                                    <div className="text-xs text-sub">{getRolLabel(equipo.rol)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info */}
            <div className="p-4 rounded-lg bg-mint/10 border border-mint/20">
                <p className="text-sm text-ink">
                    ℹ️ Este partido se guardará temporalmente en tu navegador.
                    Los datos se perderán al cerrar la sesión.
                </p>
            </div>
        </div>
    );
}
