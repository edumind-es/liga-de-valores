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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Sparkles, ClipboardList, Info } from 'lucide-react';
import { useLiga } from '@/hooks/useLigas';
import { criteriosApi } from '@/api/criterios';
import { type CriterioEvaluacion, type PlantillaEvaluacion } from '@/types/criterioEvaluacion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getCategoryDisplayLabel } from '@/utils/matchRoleSchema';

const MAX_CRITERIOS = 10;

const CATEGORY_BADGE_VARIANT: Record<CriterioEvaluacion['categoria'], 'secondary' | 'default' | 'warning' | 'accent'> = {
    general: 'secondary',
    arbitro: 'default',
    grada_local: 'warning',
    grada_visitante: 'warning',
    jugador: 'accent',
};

const EMPTY_NEW_CRITERIO = {
    nombre: '',
    codigo: '',
    categoria: 'general' as CriterioEvaluacion['categoria'],
    escala_max: 10,
    icono: '',
};

export default function GestionCriterios() {
    const { id } = useParams<{ id: string }>();
    const ligaId = id ? parseInt(id, 10) : 0;
    const { data: liga, isLoading: ligaLoading } = useLiga(ligaId);

    const [criterios, setCriterios] = useState<CriterioEvaluacion[]>([]);
    const [plantillas, setPlantillas] = useState<PlantillaEvaluacion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newCriterio, setNewCriterio] = useState(EMPTY_NEW_CRITERIO);
    const categoryLabels: Record<CriterioEvaluacion['categoria'], string> = useMemo(() => ({
        general: getCategoryDisplayLabel('general', liga?.match_role_schema),
        arbitro: getCategoryDisplayLabel('arbitro', liga?.match_role_schema),
        grada_local: getCategoryDisplayLabel('grada_local', liga?.match_role_schema),
        grada_visitante: getCategoryDisplayLabel('grada_visitante', liga?.match_role_schema),
        jugador: getCategoryDisplayLabel('jugador', liga?.match_role_schema),
    }), [liga?.match_role_schema]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [criteriosData, plantillasData] = await Promise.all([
                criteriosApi.getByLiga(ligaId),
                criteriosApi.getPlantillas(),
            ]);
            setCriterios(criteriosData);
            setPlantillas(plantillasData);
        } catch (error) {
            console.error('Error loading criteria data:', error);
            toast.error('No se pudieron cargar los criterios');
        } finally {
            setIsLoading(false);
        }
    }, [ligaId]);

    useEffect(() => {
        if (!ligaId) return;
        void loadData();
    }, [ligaId, loadData]);

    const handleApplyPlantilla = async (nombrePlantilla: string) => {
        if (!window.confirm(`Aplicar "${nombrePlantilla}" reemplazara los criterios actuales. Deseas continuar?`)) {
            return;
        }

        setIsSaving(true);
        try {
            const nuevosCriterios = await criteriosApi.createFromPlantilla(ligaId, nombrePlantilla);
            setCriterios(nuevosCriterios);
            toast.success(`Plantilla "${nombrePlantilla}" aplicada`);
        } catch (error) {
            console.error('Error applying template:', error);
            toast.error('No se pudo aplicar la plantilla');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCriterio = async () => {
        if (!newCriterio.nombre.trim() || !newCriterio.codigo.trim()) {
            toast.error('Nombre y codigo son obligatorios');
            return;
        }

        if (criterios.length >= MAX_CRITERIOS) {
            toast.error(`Solo se permiten ${MAX_CRITERIOS} criterios`);
            return;
        }

        setIsSaving(true);
        try {
            const created = await criteriosApi.create(ligaId, {
                nombre: newCriterio.nombre.trim(),
                codigo: newCriterio.codigo.trim().toLowerCase().replace(/\s+/g, '_'),
                categoria: newCriterio.categoria,
                escala_max: newCriterio.escala_max,
                icono: newCriterio.icono.trim() || undefined,
            });
            setCriterios((prev) => [...prev, created]);
            setNewCriterio(EMPTY_NEW_CRITERIO);
            setShowAddForm(false);
            toast.success('Criterio creado');
        } catch (error) {
            console.error('Error creating criterion:', error);
            toast.error('No se pudo crear el criterio');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCriterio = async (criterioId: number) => {
        if (!window.confirm('Eliminar este criterio borrara sus evaluaciones asociadas. Continuar?')) {
            return;
        }

        setIsSaving(true);
        try {
            await criteriosApi.delete(ligaId, criterioId);
            setCriterios((prev) => prev.filter((item) => item.id !== criterioId));
            toast.success('Criterio eliminado');
        } catch (error) {
            console.error('Error deleting criterion:', error);
            toast.error('No se pudo eliminar el criterio');
        } finally {
            setIsSaving(false);
        }
    };

    if (ligaLoading || isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!liga) {
        return (
            <Card className="border border-red-500/35 bg-red-500/10">
                <CardContent className="pt-6 text-red-200">Liga no encontrada.</CardContent>
            </Card>
        );
    }

    if (liga.modo_evaluacion === 'clasico') {
        return (
            <div className="max-w-3xl mx-auto space-y-5">
                <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                    <Link to={`/ligas/${ligaId}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a la liga
                    </Link>
                </Button>

                <Card className="border-amber-500/40 bg-amber-500/10">
                    <CardHeader>
                        <CardTitle className="text-amber-100">Modo de evaluacion clasico</CardTitle>
                        <CardDescription className="text-amber-100/85">
                            Esta liga usa criterios fijos EDUmind. En este modo no se pueden editar criterios personalizados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-3">
                        <p className="text-sm text-amber-50/90">
                            Puedes ajustar puntos de {categoryLabels.arbitro} y roles de apoyo desde la configuracion general de la liga.
                        </p>
                        <Button variant="outline" asChild>
                            <Link to={`/ligas/${ligaId}/configuracion`}>Ir a configuracion</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${ligaId}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a la liga
                </Link>
            </Button>

            <PageHeader
                eyebrow="Evaluacion personalizada"
                title={`Criterios de ${liga.nombre}`}
                description="Define y ajusta criterios para medir rendimiento, convivencia y progreso con logica pedagógica."
            >
                <Badge variant="outline">{criterios.length} / {MAX_CRITERIOS} criterios</Badge>
                <Badge variant="secondary">{plantillas.length} plantillas disponibles</Badge>
            </PageHeader>

            <Card className="border-lme-border/90 bg-[rgba(16,30,53,0.56)]">
                <CardContent className="pt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-sub">Plantillas</p>
                        <p className="mt-2 text-sm text-ink">Carga una base rapida para no empezar desde cero.</p>
                    </div>
                    <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-sub">Criterios activos</p>
                        <p className="mt-2 text-sm text-ink">Gestiona nombre, categoria e icono en un solo listado.</p>
                    </div>
                    <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-sub">Limite</p>
                        <p className="mt-2 text-sm text-ink">Hasta {MAX_CRITERIOS} criterios para mantener evaluacion usable.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-mint" />
                        Plantillas predefinidas
                    </CardTitle>
                    <CardDescription>
                        Aplica una plantilla para reemplazar tus criterios actuales con una estructura base.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plantillas.map((plantilla) => (
                        <div key={plantilla.nombre} className="rounded-lg border border-lme-border bg-[rgba(10,20,38,0.52)] p-4 space-y-3">
                            <div>
                                <h3 className="font-semibold text-ink">{plantilla.nombre}</h3>
                                <p className="text-sm text-sub mt-1">{plantilla.descripcion}</p>
                            </div>
                            <p className="text-xs text-sub">
                                {plantilla.criterios.length} criterios: {plantilla.criterios.map((item) => item.icono || '•').join(' ')}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isSaving}
                                onClick={() => handleApplyPlantilla(plantilla.nombre)}
                            >
                                Aplicar plantilla
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-mint" />
                            Criterios activos
                        </CardTitle>
                        <CardDescription>
                            Ajusta tu rubrica evaluativa y elimina criterios que no necesites.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => setShowAddForm((prev) => !prev)}
                        disabled={isSaving || criterios.length >= MAX_CRITERIOS}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {showAddForm ? 'Cerrar alta' : 'Nuevo criterio'}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {showAddForm && (
                        <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.58)] p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-ink">Alta de criterio</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="criterio-nombre">Nombre *</Label>
                                    <Input
                                        id="criterio-nombre"
                                        placeholder="Ej: Respeto al material"
                                        value={newCriterio.nombre}
                                        onChange={(event) => {
                                            const nombre = event.target.value;
                                            setNewCriterio((prev) => ({
                                                ...prev,
                                                nombre,
                                                codigo: nombre.toLowerCase().replace(/\s+/g, '_'),
                                            }));
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="criterio-codigo">Codigo *</Label>
                                    <Input
                                        id="criterio-codigo"
                                        placeholder="respeto_material"
                                        value={newCriterio.codigo}
                                        onChange={(event) => setNewCriterio((prev) => ({ ...prev, codigo: event.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="criterio-categoria">Categoria</Label>
                                    <Select
                                        value={newCriterio.categoria}
                                        onValueChange={(value) =>
                                            setNewCriterio((prev) => ({ ...prev, categoria: value as CriterioEvaluacion['categoria'] }))
                                        }
                                    >
                                        <SelectTrigger id="criterio-categoria">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">{categoryLabels.general}</SelectItem>
                                            <SelectItem value="arbitro">{categoryLabels.arbitro}</SelectItem>
                                            <SelectItem value="grada_local">{categoryLabels.grada_local}</SelectItem>
                                            <SelectItem value="grada_visitante">{categoryLabels.grada_visitante}</SelectItem>
                                            <SelectItem value="jugador">{categoryLabels.jugador}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="criterio-escala">Escala maxima</Label>
                                    <Input
                                        id="criterio-escala"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={newCriterio.escala_max}
                                        onChange={(event) =>
                                            setNewCriterio((prev) => ({
                                                ...prev,
                                                escala_max: parseInt(event.target.value, 10) || 10,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="criterio-icono">Icono (opcional)</Label>
                                    <Input
                                        id="criterio-icono"
                                        placeholder="Ej: 🎯"
                                        maxLength={2}
                                        value={newCriterio.icono}
                                        onChange={(event) => setNewCriterio((prev) => ({ ...prev, icono: event.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewCriterio(EMPTY_NEW_CRITERIO);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button type="button" onClick={handleAddCriterio} disabled={isSaving}>
                                    Guardar criterio
                                </Button>
                            </div>
                        </div>
                    )}

                    {criterios.length === 0 ? (
                        <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-6 text-center">
                            <p className="text-sm text-sub">
                                Todavia no hay criterios activos. Aplica una plantilla o crea criterios manualmente.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {criterios.map((criterio) => (
                                <div
                                    key={criterio.id}
                                    className="rounded-lg border border-lme-border bg-[rgba(10,20,38,0.52)] p-4 flex flex-wrap items-start justify-between gap-3"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-lg" aria-hidden="true">{criterio.icono || '•'}</span>
                                            <p className="font-semibold text-ink">{criterio.nombre}</p>
                                            <Badge variant={CATEGORY_BADGE_VARIANT[criterio.categoria]}>
                                                {categoryLabels[criterio.categoria]}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-sub">
                                            Codigo: {criterio.codigo} · Escala: 0-{criterio.escala_max}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-300 hover:text-red-100"
                                        onClick={() => handleDeleteCriterio(criterio.id)}
                                        disabled={isSaving}
                                        aria-label={`Eliminar criterio ${criterio.nombre}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-lme-border bg-[rgba(9,18,36,0.52)]">
                <CardContent className="pt-5 flex items-start gap-3">
                    <Info className="h-5 w-5 text-sky mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-sub">
                        Recomendacion UX: usa pocos criterios, con nombres claros y medibles, para facilitar evaluacion en directo.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
