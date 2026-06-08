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

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { type TipoDeporte } from '@/types/liga';
import SportAvatar from '@/components/SportAvatar';
import { buildApiUrl } from '@/utils/url';

interface DeporteSelectorProps {
    selectedDeporte: TipoDeporte | null;
    onSelect: (deporte: TipoDeporte) => void;
}

export default function DeporteSelector({ selectedDeporte, onSelect }: DeporteSelectorProps) {
    const [deportes, setDeportes] = useState<TipoDeporte[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(buildApiUrl('/tipos-deporte/'))
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                // Asegurar que data es un array
                if (Array.isArray(data)) {
                    setDeportes(data);
                } else {
                    console.error('API did not return an array:', data);
                    setDeportes([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading sports:', err);
                setError('No se pudieron cargar los deportes. Verifica tu conexión.');
                setDeportes([]); // Asegurar que deportes es un array vacío
                setLoading(false);
            });
    }, []);

    const filteredDeportes = deportes.filter(d =>
        d.nombre.toLowerCase().includes(search.toLowerCase()) ||
        d.codigo.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <div className="text-center py-12 text-sub">Cargando deportes...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-400 mb-4">{error}</div>
                <div className="text-sm text-sub">
                    Asegúrate de que la API está disponible y accesible desde este dispositivo.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-sub" />
                <Input
                    type="text"
                    placeholder="Buscar deporte..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredDeportes.map((deporte) => (
                    <button
                        key={deporte.id}
                        onClick={() => onSelect(deporte)}
                        className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${selectedDeporte?.id === deporte.id
                            ? 'border-mint bg-mint/10'
                            : 'border-paper/20 hover:border-sky/40'
                            }`}
                    >
                        <div className="mb-2 flex justify-center">
                            <SportAvatar nombre={deporte.nombre} logoFile={deporte.logo_file} className="w-14 h-14" />
                        </div>
                        <div className="text-sm font-medium text-ink text-center">
                            {deporte.nombre}
                        </div>
                        <div className="text-xs text-sub text-center mt-1">
                            {deporte.tipo_marcador}
                        </div>
                    </button>
                ))}
            </div>

            {filteredDeportes.length === 0 && (
                <div className="text-center py-8 text-sub">
                    No se encontraron deportes
                </div>
            )}
        </div>
    );
}
