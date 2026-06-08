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

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ExpressTeam } from '@/types/express';

interface EquiposConfigProps {
    equipos: ExpressTeam[];
    onChange: (equipos: ExpressTeam[]) => void;
}

const ROLES = [
    { value: 'local', label: 'Local', color: 'mint' },
    { value: 'visitante', label: 'Visitante', color: 'sky' },
    { value: 'arbitro', label: 'Árbitro', color: 'yellow' },
    { value: 'grada_local', label: 'Grada Local', color: 'purple' },
    { value: 'grada_visitante', label: 'Grada Visitante', color: 'orange' }
] as const;

export default function EquiposConfig({ equipos, onChange }: EquiposConfigProps) {
    const updateEquipo = (id: string, field: keyof ExpressTeam, value: ExpressTeam[keyof ExpressTeam]) => {
        onChange(equipos.map(eq =>
            eq.id === id ? { ...eq, [field]: value } : eq
        ));
    };

    const addEquipo = () => {
        if (equipos.length < 5) {
            const availableRoles = ROLES.map(r => r.value).filter(
                role => !equipos.some(eq => eq.rol === role)
            );

            onChange([...equipos, {
                id: Date.now().toString(),
                nombre: '',
                rol: (availableRoles[0] || 'arbitro') as ExpressTeam['rol']
            }]);
        }
    };

    const removeEquipo = (id: string) => {
        if (equipos.length > 2) {
            onChange(equipos.filter(eq => eq.id !== id));
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sub text-sm">
                Configura los equipos que participarán en el partido. Mínimo 2 equipos (Local y Visitante), máximo 5.
            </p>

            <div className="space-y-4">
                {equipos.map((equipo, index) => (
                    <div key={equipo.id} className="p-4 rounded-lg border border-paper/20 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-ink">Equipo {index + 1}</Label>
                            {equipos.length > 2 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEquipo(equipo.id)}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <Label htmlFor={`nombre-${equipo.id}`} className="text-sm text-sub mb-1.5">
                                    Nombre del equipo *
                                </Label>
                                <Input
                                    id={`nombre-${equipo.id}`}
                                    value={equipo.nombre}
                                    onChange={(e) => updateEquipo(equipo.id, 'nombre', e.target.value)}
                                    placeholder="Ej: Los Tigres"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor={`rol-${equipo.id}`} className="text-sm text-sub mb-1.5">
                                    Rol
                                </Label>
                                <select
                                    id={`rol-${equipo.id}`}
                                    value={equipo.rol}
                                    onChange={(e) => updateEquipo(equipo.id, 'rol', e.target.value)}
                                    className="w-full px-3 py-2 rounded-md border border-paper/20 bg-paper/5 text-ink focus:border-mint focus:ring-1 focus:ring-mint"
                                >
                                    {ROLES.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor={`color-${equipo.id}`} className="text-sm text-sub mb-1.5">
                                    Color (opcional)
                                </Label>
                                <Input
                                    id={`color-${equipo.id}`}
                                    type="color"
                                    value={equipo.color || '#00ff88'}
                                    onChange={(e) => updateEquipo(equipo.id, 'color', e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {equipos.length < 5 && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={addEquipo}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Equipo ({equipos.length}/5)
                </Button>
            )}
        </div>
    );
}
