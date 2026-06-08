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

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart2, Edit2, Key, Loader2, Plus, Shield, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { equiposApi } from '@/api/equipos';
import { ligasApi } from '@/api/ligas';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListToolbar } from '@/components/workspace/ListToolbar';
import { MetricCard } from '@/components/workspace/MetricCard';
import { type Equipo, type Liga } from '@/types/liga';
import { getImageUrl } from '@/utils/url';

export default function ListaEquipos() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [liga, setLiga] = useState<Liga | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (ligaId) {
            loadData(parseInt(ligaId, 10));
        }
    }, [ligaId]);

    const loadData = async (id: number) => {
        try {
            const [ligaData, equiposData] = await Promise.all([
                ligasApi.getById(id),
                equiposApi.getAllByLiga(id),
            ]);
            setLiga(ligaData);
            setEquipos(equiposData);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este equipo?')) {
            return;
        }
        try {
            await equiposApi.delete(id);
            setEquipos(equipos.filter((equipo) => equipo.id !== id));
            toast.success('Equipo eliminado correctamente');
        } catch {
            toast.error('Error al eliminar el equipo');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-mint" />
                    <p className="text-sub text-sm">Cargando equipos...</p>
                </div>
            </div>
        );
    }

    if (!liga) {
        return (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-8 text-center">
                <p className="font-semibold text-red-400">Liga no encontrada</p>
            </div>
        );
    }

    const filteredEquipos = equipos.filter((equipo) =>
        equipo.nombre.toLowerCase().includes(searchValue.toLowerCase()),
    );
    const totalPuntos = equipos.reduce((sum, equipo) => sum + equipo.puntos_totales, 0);
    const totalVictorias = equipos.reduce((sum, equipo) => sum + equipo.ganados, 0);
    const totalJuegoLimpio = equipos.reduce((sum, equipo) => sum + equipo.puntos_juego_limpio, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${liga.id}`}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Volver a la liga
                </Link>
            </Button>

            <PageHeader
                title="Equipos"
                description={`Gestiona los equipos de ${liga.nombre}`}
                eyebrow="Gestión de equipos"
            >
                <Badge variant="outline">{equipos.length} equipos</Badge>
                <Button asChild className="gap-2">
                    <Link to={`/ligas/${liga.id}/equipos/crear`}>
                        <Plus className="h-5 w-5" />
                        Nuevo Equipo
                    </Link>
                </Button>
            </PageHeader>

            {error && (
                <Card className="border-red-500/35 bg-red-500/10">
                    <CardContent className="p-4">
                        <p className="font-medium text-red-300">{error}</p>
                    </CardContent>
                </Card>
            )}

            {equipos.length === 0 ? (
                <Card variant="glass" className="py-16 text-center">
                    <CardContent className="flex flex-col items-center justify-center space-y-4">
                        <div className="mb-2 rounded-2xl border border-vio/20 bg-gradient-to-br from-vio/20 to-edufis-mental-end/20 p-5">
                            <Shield className="h-12 w-12 text-vio" />
                        </div>
                        <h3 className="text-2xl font-bold text-ink">No hay equipos</h3>
                        <p className="mx-auto max-w-md text-sub">
                            Añade equipos para comenzar la competición.
                        </p>
                        <Link to={`/ligas/${liga.id}/equipos/crear`} className="mt-4 inline-block">
                            <Button size="lg" className="gap-2">
                                <Plus className="h-5 w-5" />
                                Crear Equipo
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            label="Equipos"
                            value={equipos.length}
                            support="Plantillas registradas"
                            icon={Shield}
                            tone="mint"
                        />
                        <MetricCard
                            label="Puntos totales"
                            value={totalPuntos}
                            support="Acumulado de la liga"
                            icon={Trophy}
                            tone="sky"
                        />
                        <MetricCard
                            label="Victorias"
                            value={totalVictorias}
                            support="Triunfos sumados"
                            icon={BarChart2}
                            tone="vio"
                        />
                        <MetricCard
                            label="Juego limpio"
                            value={totalJuegoLimpio}
                            support="Puntos educativos"
                            icon={Key}
                            tone="amber"
                        />
                    </div>

                    <ListToolbar
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        searchPlaceholder="Buscar equipo por nombre"
                        summary={`Mostrando ${filteredEquipos.length} de ${equipos.length} equipos.`}
                    />

                    {filteredEquipos.length === 0 ? (
                        <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)]">
                            <CardContent className="py-12 text-center">
                                <p className="text-lg font-semibold text-ink">No hay equipos que coincidan con la búsqueda</p>
                                <p className="mt-2 text-sm text-sub">Ajusta el texto introducido para localizar otra plantilla.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEquipos.map((equipo) => (
                                <Card
                                    key={equipo.id}
                                    className="flex h-full flex-col overflow-hidden border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_38px_rgba(3,10,28,0.18)] transition-transform duration-200 hover:-translate-y-1"
                                >
                                    <CardContent className="flex h-full flex-col gap-5 p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-center space-x-4">
                                                <Avatar className="h-14 w-14 border-2 border-lme-border shadow-glass">
                                                    {equipo.logo_filename ? (
                                                        <AvatarImage
                                                            src={getImageUrl(`/static/uploads/${equipo.logo_filename}`)}
                                                            alt={equipo.nombre}
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <AvatarFallback
                                                            className="text-lg font-bold text-white"
                                                            style={{ backgroundColor: equipo.color_principal || '#3c7dff' }}
                                                        >
                                                            {equipo.nombre.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-lg font-bold text-ink">{equipo.nombre}</h3>
                                                    <p className="text-xs uppercase tracking-[0.08em] text-sub">ID {equipo.id}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline">{equipo.puntos_totales} pts</Badge>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                                            <div className="rounded-2xl border border-lme-border bg-[rgba(11,24,44,0.7)] p-3">
                                                <div className="text-2xl font-bold text-ink">{equipo.puntos_totales}</div>
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-sub">Puntos</div>
                                            </div>
                                            <div className="rounded-2xl border border-mint/20 bg-mint/10 p-3">
                                                <div className="text-xl font-bold text-mint">{equipo.ganados}</div>
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-mint/80">Ganados</div>
                                            </div>
                                            <div className="rounded-2xl border border-sky/20 bg-sky/10 p-3">
                                                <div className="text-xl font-bold text-sky">{equipo.puntos_juego_limpio}</div>
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-sky/80">J. limpio</div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.46)] p-3">
                                            <div className="flex items-center justify-between text-xs text-sub">
                                                <span>Árbitro</span>
                                                <span className="font-semibold text-ink">{equipo.puntos_arbitro}</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-xs text-sub">
                                                <span>Grada</span>
                                                <span className="font-semibold text-ink">{equipo.puntos_grada}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex justify-end space-x-2 border-t border-lme-border/70 pt-4">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (!equipo.acceso_token) {
                                                        toast.error('Este equipo todavía no tiene enlace de acceso disponible');
                                                        return;
                                                    }
                                                    const url = `${window.location.origin}/team/${equipo.acceso_token}`;
                                                    navigator.clipboard.writeText(url);
                                                    toast.success('Enlace de acceso copiado al portapapeles');
                                                }}
                                                className="h-9 w-9 text-sub hover:bg-amber-500/10 hover:text-amber-300"
                                                title="Copiar enlace de acceso para alumnos"
                                                disabled={!equipo.acceso_token}
                                            >
                                                <Key className="h-4 w-4" />
                                            </Button>
                                            <Link to={`/ligas/${liga.id}/equipos/${equipo.id}/analytics`}>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-sub hover:bg-vio/10 hover:text-vio" title="Analítica">
                                                    <BarChart2 className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link to={`/ligas/${liga.id}/equipos/${equipo.id}/editar`}>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-sub hover:bg-sky/10 hover:text-sky" title="Editar">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(equipo.id)}
                                                className="h-9 w-9 text-sub hover:bg-red-500/10 hover:text-red-400"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
