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

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, RefreshCw, Shield, Trophy, Users } from 'lucide-react';
import { equiposApi } from '@/api/equipos';
import { jornadasApi } from '@/api/jornadas';
import { ligasApi } from '@/api/ligas';
import { partidosApi } from '@/api/partidos';
import { tiposDeporteApi } from '@/api/tiposDeporte';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { FormSectionCard } from '@/components/workspace/FormSectionCard';
import { MetricCard } from '@/components/workspace/MetricCard';
import { type Liga, type Equipo, type JornadaWithStats, type TipoDeporte } from '@/types/liga';
import { toast } from 'sonner';
import {
    getActiveAuxiliarySlots,
    getRolesPerMatch,
    getSlotRoleLabel,
} from '@/utils/matchRoleSchema';

interface MatchFormData {
    tipo_deporte_id: string;
    jornada_id: string;
    equipo_local_id: string;
    equipo_visitante_id: string;
    arbitro_id: string;
    tutor_grada_local_id: string;
    tutor_grada_visitante_id: string;
    fecha_hora: string;
}

const INITIAL_FORM_DATA: MatchFormData = {
    tipo_deporte_id: '',
    jornada_id: '',
    equipo_local_id: '',
    equipo_visitante_id: '',
    arbitro_id: '',
    tutor_grada_local_id: '',
    tutor_grada_visitante_id: '',
    fecha_hora: '',
};

function formatSchedulePreview(value: string) {
    if (!value) return 'Sin fecha asignada';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha asignada';

    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export default function CrearPartido() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const navigate = useNavigate();

    const [liga, setLiga] = useState<Liga | null>(null);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [jornadas, setJornadas] = useState<JornadaWithStats[]>([]);
    const [deportes, setDeportes] = useState<TipoDeporte[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<MatchFormData>(INITIAL_FORM_DATA);

    const rolesPerMatch = getRolesPerMatch(liga?.match_role_schema);
    const activeAuxSlots = getActiveAuxiliarySlots(liga?.match_role_schema);
    const showSlot4 = activeAuxSlots.includes('slot_4');
    const showSlot5 = activeAuxSlots.includes('slot_5');
    const enforceSchemaRoles = equipos.length >= rolesPerMatch;

    const slot3Label = getSlotRoleLabel(liga?.match_role_schema, 'slot_3', 'Arbitro');
    const slot4Label = getSlotRoleLabel(liga?.match_role_schema, 'slot_4', 'Rol local de apoyo');
    const slot5Label = getSlotRoleLabel(liga?.match_role_schema, 'slot_5', 'Rol visitante de apoyo');

    useEffect(() => {
        if (ligaId) {
            void loadData(parseInt(ligaId, 10));
        }
    }, [ligaId]);

    const loadData = async (id: number) => {
        try {
            const [ligaData, equiposData, jornadasData, deportesData] = await Promise.all([
                ligasApi.getById(id),
                equiposApi.getAllByLiga(id),
                jornadasApi.getAllByLiga(id),
                tiposDeporteApi.getAll(),
            ]);
            setLiga(ligaData);
            setEquipos(equiposData);
            setJornadas(jornadasData);
            setDeportes(deportesData);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setIsLoading(false);
        }
    };

    const parseOptionalId = (rawValue: string): number | undefined => {
        if (!rawValue || rawValue === '0') return undefined;
        return parseInt(rawValue, 10);
    };

    const selectedSport = useMemo(
        () => deportes.find((deporte) => deporte.id.toString() === formData.tipo_deporte_id),
        [deportes, formData.tipo_deporte_id],
    );
    const selectedJornada = useMemo(
        () => jornadas.find((jornada) => jornada.id.toString() === formData.jornada_id),
        [formData.jornada_id, jornadas],
    );
    const selectedLocalTeam = useMemo(
        () => equipos.find((team) => team.id.toString() === formData.equipo_local_id),
        [equipos, formData.equipo_local_id],
    );
    const selectedVisitorTeam = useMemo(
        () => equipos.find((team) => team.id.toString() === formData.equipo_visitante_id),
        [equipos, formData.equipo_visitante_id],
    );

    const assignedAuxRoles = useMemo(
        () => [formData.arbitro_id, formData.tutor_grada_local_id, formData.tutor_grada_visitante_id].filter(Boolean).length,
        [formData.arbitro_id, formData.tutor_grada_local_id, formData.tutor_grada_visitante_id],
    );

    const getOccupiedTeamIds = (excludeRole: 'arbitro' | 'slot_4' | 'slot_5' | null = null): Set<string> => {
        const occupied = [formData.equipo_local_id, formData.equipo_visitante_id];
        if (excludeRole !== 'arbitro') occupied.push(formData.arbitro_id);
        if (showSlot4 && excludeRole !== 'slot_4') occupied.push(formData.tutor_grada_local_id);
        if (showSlot5 && excludeRole !== 'slot_5') occupied.push(formData.tutor_grada_visitante_id);
        return new Set(occupied.filter(Boolean));
    };

    const buildTeamOptions = (excludeRole: 'arbitro' | 'slot_4' | 'slot_5' | null = null) =>
        equipos.map((equipo) => ({
            value: equipo.id.toString(),
            label: equipo.nombre,
            description: `${equipo.puntos_totales} pts · ${equipo.ganados} G / ${equipo.empatados} E / ${equipo.perdidos} P`,
            keywords: [equipo.nombre, `liga ${equipo.liga_id}`],
            disabled: getOccupiedTeamIds(excludeRole).has(equipo.id.toString()),
        }));

    const handleSwapTeams = () => {
        if (!formData.equipo_local_id || !formData.equipo_visitante_id) return;
        setFormData((current) => ({
            ...current,
            equipo_local_id: current.equipo_visitante_id,
            equipo_visitante_id: current.equipo_local_id,
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!ligaId) return;

        if (!formData.tipo_deporte_id) {
            const message = 'Debes seleccionar un deporte';
            toast.error(message);
            setError(message);
            return;
        }

        if (!formData.equipo_local_id || !formData.equipo_visitante_id) {
            const message = 'Debes seleccionar ambos equipos (local y visitante)';
            toast.error(message);
            setError(message);
            return;
        }

        const equipoLocalId = parseInt(formData.equipo_local_id, 10);
        const equipoVisitanteId = parseInt(formData.equipo_visitante_id, 10);
        const arbitroId = parseOptionalId(formData.arbitro_id);
        const slot4TeamId = parseOptionalId(formData.tutor_grada_local_id);
        const slot5TeamId = parseOptionalId(formData.tutor_grada_visitante_id);

        const selectedTeams = [equipoLocalId, equipoVisitanteId, arbitroId];
        if (showSlot4) selectedTeams.push(slot4TeamId);
        if (showSlot5) selectedTeams.push(slot5TeamId);

        const selectedDefinedTeams = selectedTeams.filter((teamId): teamId is number => typeof teamId === 'number');
        if (new Set(selectedDefinedTeams).size !== selectedDefinedTeams.length) {
            const message = 'Todos los equipos asignados al partido deben ser diferentes';
            toast.error(message);
            setError(message);
            return;
        }

        if (enforceSchemaRoles && !arbitroId) {
            const message = `Debes asignar un equipo para el rol "${slot3Label}".`;
            toast.error(message);
            setError(message);
            return;
        }

        if (enforceSchemaRoles && showSlot4 && !slot4TeamId) {
            const message = `Debes asignar un equipo para el rol "${slot4Label}".`;
            toast.error(message);
            setError(message);
            return;
        }

        if (enforceSchemaRoles && showSlot5 && !slot5TeamId) {
            const message = `Debes asignar un equipo para el rol "${slot5Label}".`;
            toast.error(message);
            setError(message);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await partidosApi.create({
                liga_id: parseInt(ligaId, 10),
                tipo_deporte_id: parseInt(formData.tipo_deporte_id, 10),
                jornada_id: parseOptionalId(formData.jornada_id),
                equipo_local_id: equipoLocalId,
                equipo_visitante_id: equipoVisitanteId,
                arbitro_id: arbitroId,
                tutor_grada_local_id: showSlot4 ? slot4TeamId : undefined,
                tutor_grada_visitante_id: showSlot5 ? slot5TeamId : undefined,
                fecha_hora: formData.fecha_hora ? new Date(formData.fecha_hora).toISOString() : undefined,
            });
            toast.success('Partido creado correctamente');
            navigate(`/ligas/${ligaId}/partidos`);
        } catch {
            const message = 'Error al crear el partido';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-[32rem] w-full rounded-2xl" />
            </div>
        );
    }

    if (!liga) return null;

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${ligaId}/partidos`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a partidos
                </Link>
            </Button>

            <PageHeader
                eyebrow="Programacion de encuentros"
                title="Nuevo Partido"
                description="Asigna deporte, jornada, equipos y roles auxiliares con una vista mucho mas clara para operar tambien en movil."
            >
                <Badge variant="outline">{liga.nombre}</Badge>
                <Badge variant={enforceSchemaRoles ? 'warning' : 'secondary'}>
                    {enforceSchemaRoles ? `${rolesPerMatch} roles obligatorios` : `${rolesPerMatch} roles en modo flexible`}
                </Badge>
                <Badge variant={selectedSport ? 'success' : 'secondary'}>
                    {selectedSport ? selectedSport.nombre : 'Deporte pendiente'}
                </Badge>
            </PageHeader>

            {error && (
                <Card className="border-red-500/35 bg-red-500/10">
                    <CardContent className="pt-5 text-sm font-medium text-red-200">{error}</CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Equipos"
                    value={equipos.length}
                    support="Disponibles para asignar"
                    icon={Users}
                    tone="mint"
                />
                <MetricCard
                    label="Jornadas"
                    value={jornadas.length}
                    support={selectedJornada ? selectedJornada.nombre : 'Puedes dejarlo sin jornada'}
                    icon={Calendar}
                    tone="sky"
                />
                <MetricCard
                    label="Formato"
                    value={`${rolesPerMatch} roles`}
                    support={enforceSchemaRoles ? 'Todos los auxiliares son requeridos' : 'Puedes dejar roles sin asignar'}
                    icon={Shield}
                    tone="vio"
                />
                <MetricCard
                    label="Programacion"
                    value={formData.fecha_hora ? 'Con fecha' : 'Pendiente'}
                    support={formatSchedulePreview(formData.fecha_hora)}
                    icon={Trophy}
                    tone="amber"
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <FormSectionCard
                    title="Contexto del encuentro"
                    description="Selecciona deporte, jornada y momento del partido antes de asignar equipos."
                    icon={Calendar}
                    tone="sky"
                >
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
                        <div className="space-y-2">
                            <Label>Deporte</Label>
                            <SearchableSelect
                                value={formData.tipo_deporte_id}
                                onValueChange={(value) => setFormData((current) => ({ ...current, tipo_deporte_id: value }))}
                                placeholder="Selecciona un deporte"
                                searchPlaceholder="Buscar deporte por nombre, codigo o marcador..."
                                emptyText="No hay deportes que coincidan con la busqueda"
                                options={deportes.map((deporte) => ({
                                    value: deporte.id.toString(),
                                    label: deporte.nombre,
                                    description: `${deporte.codigo} · ${deporte.tipo_marcador}`,
                                    keywords: [deporte.codigo, deporte.tipo_marcador],
                                }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Jornada</Label>
                            <SearchableSelect
                                value={formData.jornada_id}
                                onValueChange={(value) => setFormData((current) => ({ ...current, jornada_id: value }))}
                                placeholder="Sin jornada asignada"
                                searchPlaceholder="Buscar jornada..."
                                emptyText="No hay jornadas que coincidan"
                                allowClear={Boolean(formData.jornada_id)}
                                clearLabel="Quitar jornada"
                                options={jornadas.map((jornada) => ({
                                    value: jornada.id.toString(),
                                    label: jornada.nombre,
                                    description: `${jornada.total_partidos} partidos registrados`,
                                    keywords: [jornada.nombre],
                                }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Fecha y hora</Label>
                            <Input
                                type="datetime-local"
                                value={formData.fecha_hora}
                                onChange={(event) => setFormData((current) => ({ ...current, fecha_hora: event.target.value }))}
                            />
                        </div>
                    </div>
                </FormSectionCard>

                <FormSectionCard
                    title="Equipos enfrentados"
                    description="Define el cruce principal y comprueba de un vistazo como queda el partido."
                    icon={Trophy}
                    tone="mint"
                >
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                <div className="rounded-2xl border border-mint/20 bg-mint/10 p-4 text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sub">Local</p>
                                    <p className="mt-2 text-lg font-bold text-ink">
                                        {selectedLocalTeam?.nombre || 'Selecciona equipo local'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <span className="text-sm font-semibold uppercase tracking-[0.12em] text-sub">vs</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSwapTeams}
                                        disabled={!formData.equipo_local_id || !formData.equipo_visitante_id}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Intercambiar
                                    </Button>
                                </div>
                                <div className="rounded-2xl border border-sky/20 bg-sky/10 p-4 text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sub">Visitante</p>
                                    <p className="mt-2 text-lg font-bold text-ink">
                                        {selectedVisitorTeam?.nombre || 'Selecciona equipo visitante'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Equipo local</Label>
                                <SearchableSelect
                                    value={formData.equipo_local_id}
                                    onValueChange={(value) => setFormData((current) => ({ ...current, equipo_local_id: value }))}
                                    placeholder="Buscar equipo local"
                                    searchPlaceholder="Escribe para encontrar un equipo..."
                                    emptyText="No hay equipos con ese criterio"
                                    options={buildTeamOptions(null).map((option) => ({
                                        ...option,
                                        disabled: option.value === formData.equipo_visitante_id,
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Equipo visitante</Label>
                                <SearchableSelect
                                    value={formData.equipo_visitante_id}
                                    onValueChange={(value) => setFormData((current) => ({ ...current, equipo_visitante_id: value }))}
                                    placeholder="Buscar equipo visitante"
                                    searchPlaceholder="Escribe para encontrar un equipo..."
                                    emptyText="No hay equipos con ese criterio"
                                    options={buildTeamOptions(null).map((option) => ({
                                        ...option,
                                        disabled: option.value === formData.equipo_local_id,
                                    }))}
                                />
                            </div>
                        </div>
                    </div>
                </FormSectionCard>

                <FormSectionCard
                    title="Roles auxiliares"
                    description={
                        enforceSchemaRoles
                            ? 'La liga ya tiene suficientes equipos: debes completar todos los roles del formato activo.'
                            : 'Todavia puedes dejar roles sin asignar mientras la liga no alcance el minimo del formato.'
                    }
                    icon={Users}
                    tone="amber"
                >
                    <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <RoleSelector
                                label={slot3Label}
                                value={formData.arbitro_id}
                                onValueChange={(value) => setFormData((current) => ({ ...current, arbitro_id: value }))}
                                options={buildTeamOptions('arbitro')}
                                isRequired={enforceSchemaRoles}
                            />

                            {showSlot4 && (
                                <RoleSelector
                                    label={slot4Label}
                                    value={formData.tutor_grada_local_id}
                                    onValueChange={(value) => setFormData((current) => ({ ...current, tutor_grada_local_id: value }))}
                                    options={buildTeamOptions('slot_4')}
                                    isRequired={enforceSchemaRoles}
                                />
                            )}

                            {showSlot5 && (
                                <RoleSelector
                                    label={slot5Label}
                                    value={formData.tutor_grada_visitante_id}
                                    onValueChange={(value) => setFormData((current) => ({ ...current, tutor_grada_visitante_id: value }))}
                                    options={buildTeamOptions('slot_5')}
                                    isRequired={enforceSchemaRoles}
                                />
                            )}
                        </div>

                        <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                            <p className="text-sm font-semibold text-ink">Revision rapida</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.12em] text-sub">Partido</p>
                                    <p className="mt-1 text-sm text-ink">
                                        {selectedLocalTeam?.nombre && selectedVisitorTeam?.nombre
                                            ? `${selectedLocalTeam.nombre} vs ${selectedVisitorTeam.nombre}`
                                            : 'Equipos pendientes'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.12em] text-sub">Roles auxiliares</p>
                                    <p className="mt-1 text-sm text-ink">
                                        {assignedAuxRoles} asignado{assignedAuxRoles !== 1 ? 's' : ''} de {activeAuxSlots.length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.12em] text-sub">Calendario</p>
                                    <p className="mt-1 text-sm text-ink">{formatSchedulePreview(formData.fecha_hora)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </FormSectionCard>

                <Card className="sticky bottom-4 z-10 border-lme-border/90 bg-[rgba(10,20,38,0.92)] shadow-[0_24px_48px_rgba(3,10,28,0.3)] backdrop-blur-xl">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sub">Listo para crear</p>
                            <p className="text-sm text-ink">
                                {selectedSport ? selectedSport.nombre : 'Selecciona un deporte'} · {selectedJornada?.nombre || 'Sin jornada'} · {formatSchedulePreview(formData.fecha_hora)}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button variant="outline" type="button" asChild>
                                <Link to={`/ligas/${ligaId}/partidos`}>Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={isLoading} className="min-w-[170px]">
                                {isLoading ? 'Creando...' : 'Crear partido'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}

function RoleSelector({
    label,
    value,
    onValueChange,
    options,
    isRequired,
}: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{
        value: string;
        label: string;
        description?: string;
        keywords?: string[];
        disabled?: boolean;
    }>;
    isRequired: boolean;
}) {
    return (
        <div className="space-y-2 rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
            <div className="flex items-center justify-between gap-2">
                <Label>{label}</Label>
                <Badge variant={isRequired ? 'warning' : 'secondary'}>
                    {isRequired ? 'Requerido' : 'Opcional'}
                </Badge>
            </div>
            <SearchableSelect
                value={value}
                onValueChange={onValueChange}
                placeholder={`Selecciona equipo para ${label.toLowerCase()}`}
                searchPlaceholder="Buscar equipo..."
                emptyText="No hay equipos disponibles"
                allowClear={!isRequired && Boolean(value)}
                clearLabel={`Quitar ${label.toLowerCase()}`}
                options={options}
            />
        </div>
    );
}
