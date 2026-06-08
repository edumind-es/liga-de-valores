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
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { jornadasApi } from '@/api/jornadas';
import { ligasApi } from '@/api/ligas';
import { type Liga } from '@/types/liga';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/apiUtils';

export default function CrearJornada() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [liga, setLiga] = useState<Liga | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        fecha_inicio: '',
        fecha_fin: ''
    });

    useEffect(() => {
        if (ligaId) {
            ligasApi.getById(parseInt(ligaId)).then(setLiga).catch(() => setError('Liga no encontrada'));
        }
    }, [ligaId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ligaId) return;

        setIsLoading(true);
        setError(null);

        try {
            const ligaNumericId = parseInt(ligaId);
            await jornadasApi.create({
                ...formData,
                fecha_inicio: formData.fecha_inicio ? new Date(formData.fecha_inicio).toISOString() : undefined,
                fecha_fin: formData.fecha_fin ? new Date(formData.fecha_fin).toISOString() : undefined,
                liga_id: ligaNumericId
            });
            await queryClient.invalidateQueries({ queryKey: ['jornadas', { ligaId: ligaNumericId }] });
            await queryClient.invalidateQueries({ queryKey: ['ligas', ligaNumericId] });
            toast.success('Jornada creada correctamente');
            navigate(`/ligas/${ligaId}/jornadas`);
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!liga) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <Link to={`/ligas/${ligaId}/jornadas`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver a jornadas
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Nueva Jornada</h1>
                <p className="mt-2 text-gray-600">Añade una jornada a {liga.nombre}</p>
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                            Nombre de la jornada *
                        </label>
                        <input
                            type="text"
                            id="nombre"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            placeholder="Ej: Jornada 1 - Fútbol Sala"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700">
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                id="fecha_inicio"
                                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                value={formData.fecha_inicio}
                                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700">
                                Fecha Fin
                            </label>
                            <input
                                type="date"
                                id="fecha_fin"
                                className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                value={formData.fecha_fin}
                                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <Link
                            to={`/ligas/${ligaId}/jornadas`}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Creando...' : 'Crear Jornada'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
