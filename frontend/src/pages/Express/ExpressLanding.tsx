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

import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ExpressLanding() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#040614] via-[#0a0f24] to-[#040614] flex items-center justify-center p-4">
            <Card variant="glass" className="max-w-2xl w-full">
                <CardContent className="pt-12 pb-8 px-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-mint to-sky mb-6">
                        <Zap className="h-10 w-10 text-[#040614]" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
                        Marcador Express ⚡
                    </h1>

                    <p className="text-xl text-sub mb-8 max-w-lg mx-auto">
                        Registra tu partido sin necesidad de crear una cuenta.
                        Rápido, fácil y temporal.
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-lg bg-mint/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-mint font-bold">1</span>
                            </div>
                            <div>
                                <p className="text-ink font-medium">Elige tu deporte</p>
                                <p className="text-sm text-sub">Selecciona entre 26 deportes disponibles</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-lg bg-sky/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sky font-bold">2</span>
                            </div>
                            <div>
                                <p className="text-ink font-medium">Configura equipos</p>
                                <p className="text-sm text-sub">Añade hasta 5 equipos con roles</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-lg bg-mint/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-mint font-bold">3</span>
                            </div>
                            <div>
                                <p className="text-ink font-medium">Registra el marcador</p>
                                <p className="text-sm text-sub">Marcador en vivo adaptado al deporte</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-lg bg-sky/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sky font-bold">4</span>
                            </div>
                            <div>
                                <p className="text-ink font-medium">Descarga el acta</p>
                                <p className="text-sm text-sub">Exporta en PDF con evaluaciones</p>
                            </div>
                        </div>
                    </div>

                    <Link to="/express/nuevo">
                        <Button size="lg" className="text-lg px-8">
                            <Zap className="mr-2 h-5 w-5" />
                            Crear Partido Nuevo
                        </Button>
                    </Link>

                    <div className="mt-8 pt-6 border-t border-paper/20">
                        <p className="text-sm text-sub">
                            ¿Tienes una cuenta?{' '}
                            <Link to="/login" className="text-mint hover:text-sky transition-colors">
                                Iniciar sesión
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
