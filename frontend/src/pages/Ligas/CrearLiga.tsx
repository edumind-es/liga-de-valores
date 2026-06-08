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
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Layers, Trophy, Users } from 'lucide-react';
import { ligasApi } from '@/api/ligas';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormSectionCard } from '@/components/workspace/FormSectionCard';
import { MetricCard } from '@/components/workspace/MetricCard';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/apiUtils';
import { type LeagueCapacity } from '@/types/auth';
import type { MatchRoleSchema, MatchRoleSlot } from '@/types/liga';

type CompetitionMode = 'unico_deporte' | 'multi_deporte';
type EvaluationMode = 'clasico' | 'personalizado';
type RolesPerMatch = 3 | 4 | 5;
type AuxiliarySlotKey = 'slot_3' | 'slot_4' | 'slot_5';

const AUXILIARY_SLOT_KEYS_BY_FORMAT: Record<RolesPerMatch, AuxiliarySlotKey[]> = {
    3: ['slot_3'],
    4: ['slot_3', 'slot_4'],
    5: ['slot_3', 'slot_4', 'slot_5'],
};

const MATCH_ROLE_OPTIONS = [
    { code: 'arbitro', label: 'Arbitro', scoring_category: 'arbitraje' },
    { code: 'grada_local', label: 'Tutor de grada local', scoring_category: 'grada' },
    { code: 'grada_visitante', label: 'Tutor de grada visitante', scoring_category: 'grada' },
    { code: 'staff_tecnico', label: 'Staff tecnico', scoring_category: 'staff' },
    { code: 'staff_tecnico_local', label: 'Staff tecnico local', scoring_category: 'staff' },
    { code: 'staff_tecnico_visitante', label: 'Staff tecnico visitante', scoring_category: 'staff' },
    { code: 'cronometrista', label: 'Cronometrista', scoring_category: 'staff' },
    { code: 'delegado', label: 'Delegado', scoring_category: 'staff' },
];

const SLOT_DEFAULTS: Record<AuxiliarySlotKey, string> = {
    slot_3: 'arbitro',
    slot_4: 'grada_local',
    slot_5: 'grada_visitante',
};

const SLOT_LABELS: Record<AuxiliarySlotKey, string> = {
    slot_3: 'Rol auxiliar 1',
    slot_4: 'Rol auxiliar 2',
    slot_5: 'Rol auxiliar 3',
};

interface OptionCardProps {
    id: string;
    name: string;
    value: string;
    checked: boolean;
    title: string;
    description: string;
    support: string;
    onChange: (value: string) => void;
}

function OptionCard({
    id,
    name,
    value,
    checked,
    title,
    description,
    support,
    onChange,
}: OptionCardProps) {
    return (
        <label
            htmlFor={id}
            className={`
                block cursor-pointer rounded-2xl border p-4 transition-all
                ${checked
                    ? 'border-mint/40 bg-mint/10 shadow-[0_12px_28px_rgba(61,218,215,0.12)]'
                    : 'border-lme-border/80 bg-[rgba(10,20,38,0.62)] hover:border-[#8eb2eb] hover:bg-[rgba(12,24,44,0.72)]'
                }
            `}
        >
            <div className="flex items-start gap-3">
                <input
                    id={id}
                    type="radio"
                    name={name}
                    value={value}
                    checked={checked}
                    onChange={(event) => onChange(event.target.value)}
                    className="mt-1 h-4 w-4"
                />
                <div className="space-y-1">
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="text-sm text-sub">{description}</p>
                    <p className="text-xs text-sub">{support}</p>
                </div>
            </div>
        </label>
    );
}

export default function CrearLiga() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCapacity, setIsLoadingCapacity] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [capacityError, setCapacityError] = useState<string | null>(null);
    const [capacity, setCapacity] = useState<LeagueCapacity | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        temporada: '',
        modo_competicion: 'unico_deporte' as CompetitionMode,
        modo_evaluacion: 'clasico' as EvaluationMode,
        roles_per_match: 4 as RolesPerMatch,
        slot_3_role_code: SLOT_DEFAULTS.slot_3,
        slot_4_role_code: SLOT_DEFAULTS.slot_4,
        slot_5_role_code: SLOT_DEFAULTS.slot_5,
    });

    useEffect(() => {
        let isMounted = true;

        const loadCapacity = async () => {
            setIsLoadingCapacity(true);
            setCapacityError(null);
            try {
                const response = await ligasApi.getCapacity();
                if (isMounted) {
                    setCapacity(response);
                }
            } catch (err) {
                if (isMounted) {
                    setCapacity(null);
                    setCapacityError('No se pudo comprobar el límite de ligas. Puedes continuar y se validará al crear.');
                }
                console.error('Error loading league capacity', err);
            } finally {
                if (isMounted) {
                    setIsLoadingCapacity(false);
                }
            }
        };

        void loadCapacity();
        return () => {
            isMounted = false;
        };
    }, []);

    const isCapacityBlocked = Boolean(capacity && !capacity.can_create_league);
    const disableSubmit = isLoading || (isLoadingCapacity && !capacityError) || isCapacityBlocked;
    const capacityCutoffLabel = capacity
        ? new Date(capacity.grandfathering_cutoff).toLocaleDateString('es-ES')
        : null;
    const activeAuxiliarySlots = AUXILIARY_SLOT_KEYS_BY_FORMAT[formData.roles_per_match];

    const buildMatchRoleSchema = (): MatchRoleSchema => {
        const selectedCodesBySlot: Record<AuxiliarySlotKey, string> = {
            slot_3: formData.slot_3_role_code,
            slot_4: formData.slot_4_role_code,
            slot_5: formData.slot_5_role_code,
        };
        const selectedCodes = activeAuxiliarySlots.map((slotKey) => selectedCodesBySlot[slotKey]);
        if (new Set(selectedCodes).size !== selectedCodes.length) {
            throw new Error('No se permite repetir el mismo rol auxiliar en un mismo formato de partido.');
        }

        const slots: MatchRoleSlot[] = [
            {
                slot_key: 'home_team',
                slot_order: 1,
                role_code: 'equipo_local',
                role_label: 'Equipo local',
                scoring_category: 'competitive',
                is_required: true,
                evaluation_enabled: true,
            },
            {
                slot_key: 'away_team',
                slot_order: 2,
                role_code: 'equipo_visitante',
                role_label: 'Equipo visitante',
                scoring_category: 'competitive',
                is_required: true,
                evaluation_enabled: true,
            },
        ];

        activeAuxiliarySlots.forEach((slotKey, index) => {
            const roleCode = selectedCodesBySlot[slotKey];
            const meta = MATCH_ROLE_OPTIONS.find((item) => item.code === roleCode);
            slots.push({
                slot_key: slotKey,
                slot_order: index + 3,
                role_code: roleCode,
                role_label: meta?.label || roleCode,
                scoring_category: meta?.scoring_category || 'custom',
                is_required: true,
                evaluation_enabled: true,
            });
        });

        return {
            roles_per_match: formData.roles_per_match,
            slots,
            rules: [],
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!formData.nombre.trim()) {
            const message = 'El nombre de la liga es obligatorio.';
            setError(message);
            toast.error(message);
            return;
        }

        if (isCapacityBlocked) {
            const limitLabel = capacity?.leagues_limit ?? 0;
            const message = `Has alcanzado el límite actual (${limitLabel} ligas).`;
            setError(message);
            toast.error(message);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const matchRoleSchema = buildMatchRoleSchema();
            const nuevaLiga = await ligasApi.create({
                nombre: formData.nombre,
                modo_competicion: formData.modo_competicion,
                modo_evaluacion: formData.modo_evaluacion,
                descripcion: formData.descripcion.trim(),
                temporada: formData.temporada.trim(),
                match_role_schema: matchRoleSchema,
            });
            toast.success('Liga creada correctamente');
            navigate(`/ligas/${nuevaLiga.id}`);
        } catch (err) {
            const message = getErrorMessage(err) || 'No se pudo crear la liga. Revisa los datos e inténtalo de nuevo.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const setSlotRole = (slotKey: AuxiliarySlotKey, value: string) => {
        if (slotKey === 'slot_3') {
            setFormData((prev) => ({ ...prev, slot_3_role_code: value }));
            return;
        }
        if (slotKey === 'slot_4') {
            setFormData((prev) => ({ ...prev, slot_4_role_code: value }));
            return;
        }
        setFormData((prev) => ({ ...prev, slot_5_role_code: value }));
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to="/ligas">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a mis ligas
                </Link>
            </Button>

            <PageHeader
                eyebrow="Nueva competición"
                title="Crear liga"
                description="Define la base organizativa, el modo de competición y el sistema de evaluación en un flujo más claro y consistente."
            >
                <Badge variant="secondary">Paso único</Badge>
                <Badge variant="outline">Lista para operar</Badge>
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Paso 1"
                    value="1"
                    support="Identidad, nombre y contexto"
                    icon={Trophy}
                    tone="mint"
                />
                <MetricCard
                    label="Paso 2"
                    value="2"
                    support="Formato único o multideporte"
                    icon={Layers}
                    tone="sky"
                />
                <MetricCard
                    label="Paso 3"
                    value="3"
                    support="Evaluación clásica o personalizada"
                    icon={ClipboardList}
                    tone="vio"
                />
                <MetricCard
                    label="Paso 4"
                    value={formData.roles_per_match}
                    support="Roles puntuables por partido"
                    icon={Users}
                    tone="amber"
                />
            </div>

            <Card className={isCapacityBlocked ? 'border-red-500/35 bg-red-500/10' : 'border-lme-border/90 bg-[rgba(10,20,38,0.72)]'}>
                <CardContent className="flex flex-col gap-3 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.08em] text-sub">Capacidad del plan</p>
                            <p className="text-sm text-ink">
                                Control de ligas activado por plan y grandfathering (corte: {capacityCutoffLabel ?? '30/06/2026'}).
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {isLoadingCapacity && <Badge variant="outline">Comprobando...</Badge>}
                            {!isLoadingCapacity && capacity && (
                                <>
                                    <Badge variant="secondary">{capacity.plan_label}</Badge>
                                    <Badge variant={capacity.can_create_league ? 'success' : 'destructive'}>
                                        {capacity.leagues_limit === null
                                            ? 'Ligas ilimitadas'
                                            : `${capacity.leagues_used}/${capacity.leagues_limit} ligas usadas`}
                                    </Badge>
                                    {capacity.grandfathered_unlimited && (
                                        <Badge variant="outline">Grandfathering activo</Badge>
                                    )}
                                </>
                            )}
                            {!isLoadingCapacity && !capacity && <Badge variant="warning">Sin datos de capacidad</Badge>}
                        </div>
                    </div>
                    {capacityError && <p className="text-xs text-amber-200">{capacityError}</p>}
                    {isCapacityBlocked && (
                        <p className="text-sm text-red-100">
                            Has alcanzado tu límite de ligas. Para crear una nueva, elimina una liga existente o actualiza tu plan.
                        </p>
                    )}
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <Card className="border-red-500/35 bg-red-500/10">
                        <CardContent className="pt-4 text-sm text-red-100">{error}</CardContent>
                    </Card>
                )}

                <FormSectionCard
                    title="Datos base de la liga"
                    description="Esta información se mostrará en panel, listados y accesos de la competición."
                    icon={Trophy}
                    tone="mint"
                    contentClassName="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre de liga *</Label>
                        <Input
                            id="nombre"
                            required
                            placeholder="Ej: Liga Valores 6 Primaria"
                            value={formData.nombre}
                            onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="temporada">Temporada</Label>
                            <Input
                                id="temporada"
                                placeholder="Ej: 2025-2026"
                                value={formData.temporada}
                                onChange={(event) => setFormData((prev) => ({ ...prev, temporada: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción</Label>
                            <Textarea
                                id="descripcion"
                                rows={3}
                                placeholder="Objetivo pedagógico y alcance de esta liga"
                                value={formData.descripcion}
                                onChange={(event) => setFormData((prev) => ({ ...prev, descripcion: event.target.value }))}
                            />
                        </div>
                    </div>
                </FormSectionCard>

                <FormSectionCard
                    title="Modo de competición"
                    description="Elige la estructura de jornadas según el plan docente y el nivel de variedad que buscas."
                    icon={Layers}
                    tone="sky"
                    contentClassName="space-y-3"
                >
                    <OptionCard
                        id="mode-unico"
                        name="modo_competicion"
                        value="unico_deporte"
                        checked={formData.modo_competicion === 'unico_deporte'}
                        title="Único deporte (Round Robin)"
                        description="Cada equipo juega contra todos en una rotación equilibrada."
                        support="Recomendado para seguimiento simple y continuo."
                        onChange={(value) => setFormData((prev) => ({ ...prev, modo_competicion: value as CompetitionMode }))}
                    />
                    <OptionCard
                        id="mode-multi"
                        name="modo_competicion"
                        value="multi_deporte"
                        checked={formData.modo_competicion === 'multi_deporte'}
                        title="Multideporte (todas las combinaciones)"
                        description="Genera una agenda más amplia para alternar deportes por jornada."
                        support="Adecuado cuando quieres mayor variedad de experiencias."
                        onChange={(value) => setFormData((prev) => ({ ...prev, modo_competicion: value as CompetitionMode }))}
                    />
                </FormSectionCard>

                <FormSectionCard
                    title="Modo de evaluación"
                    description="Define cómo se evaluará la convivencia y el rendimiento. Esta decisión no se puede cambiar después."
                    icon={ClipboardList}
                    tone="vio"
                    contentClassName="space-y-3"
                >
                    <OptionCard
                        id="evaluation-clasico"
                        name="modo_evaluacion"
                        value="clasico"
                        checked={formData.modo_evaluacion === 'clasico'}
                        title="Clásico (recomendado)"
                        description="Usa criterios fijos EDUmind para árbitro y grada."
                        support="Rápido de activar, sin configuración adicional."
                        onChange={(value) => setFormData((prev) => ({ ...prev, modo_evaluacion: value as EvaluationMode }))}
                    />
                    <OptionCard
                        id="evaluation-personalizado"
                        name="modo_evaluacion"
                        value="personalizado"
                        checked={formData.modo_evaluacion === 'personalizado'}
                        title="Personalizado (avanzado)"
                        description="Permite crear criterios propios adaptados al contexto de aula."
                        support="Ideal para proyectos con rúbricas específicas."
                        onChange={(value) => setFormData((prev) => ({ ...prev, modo_evaluacion: value as EvaluationMode }))}
                    />
                </FormSectionCard>

                <FormSectionCard
                    title="Roles de partido puntuables"
                    description="Este formato se aplicará a toda la liga y quedará bloqueado cuando empieces a generar jornadas o partidos."
                    icon={Users}
                    tone="amber"
                    contentClassName="space-y-5"
                >
                    <div className="space-y-3">
                        <OptionCard
                            id="roles-3"
                            name="roles_per_match"
                            value="3"
                            checked={formData.roles_per_match === 3}
                            title="Formato 3 roles por partido"
                            description="Local, visitante y un rol auxiliar."
                            support="Mínimo recomendado: 3 equipos activos."
                            onChange={(value) => setFormData((prev) => ({ ...prev, roles_per_match: Number(value) as RolesPerMatch }))}
                        />
                        <OptionCard
                            id="roles-4"
                            name="roles_per_match"
                            value="4"
                            checked={formData.roles_per_match === 4}
                            title="Formato 4 roles por partido"
                            description="Local, visitante y dos roles auxiliares."
                            support="Mínimo recomendado: 4 equipos activos."
                            onChange={(value) => setFormData((prev) => ({ ...prev, roles_per_match: Number(value) as RolesPerMatch }))}
                        />
                        <OptionCard
                            id="roles-5"
                            name="roles_per_match"
                            value="5"
                            checked={formData.roles_per_match === 5}
                            title="Formato 5 roles por partido"
                            description="Local, visitante y tres roles auxiliares."
                            support="Mínimo recomendado: 5 equipos activos."
                            onChange={(value) => setFormData((prev) => ({ ...prev, roles_per_match: Number(value) as RolesPerMatch }))}
                        />
                    </div>

                    <div className="rounded-2xl border border-lme-border/80 bg-[rgba(10,20,38,0.62)] p-4">
                        <p className="text-sm font-semibold text-ink">Sustitución de slots auxiliares</p>
                        <p className="mt-1 text-xs text-sub">
                            Puedes sustituir roles auxiliares antes del bloqueo. No se permite repetir el mismo rol dentro del mismo formato.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {activeAuxiliarySlots.map((slotKey) => {
                                const code = slotKey === 'slot_3'
                                    ? formData.slot_3_role_code
                                    : slotKey === 'slot_4'
                                        ? formData.slot_4_role_code
                                        : formData.slot_5_role_code;
                                const meta = MATCH_ROLE_OPTIONS.find((option) => option.code === code);
                                return (
                                    <Badge key={slotKey} variant="outline">
                                        {SLOT_LABELS[slotKey]}: {meta?.label || code}
                                    </Badge>
                                );
                            })}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {activeAuxiliarySlots.map((slotKey) => {
                                const value = slotKey === 'slot_3'
                                    ? formData.slot_3_role_code
                                    : slotKey === 'slot_4'
                                        ? formData.slot_4_role_code
                                        : formData.slot_5_role_code;
                                return (
                                    <div key={slotKey} className="space-y-1.5">
                                        <Label htmlFor={slotKey}>{SLOT_LABELS[slotKey]}</Label>
                                        <Select value={value} onValueChange={(nextValue) => setSlotRole(slotKey, nextValue)}>
                                            <SelectTrigger id={slotKey}>
                                                <SelectValue placeholder="Selecciona un rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MATCH_ROLE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.code} value={option.code}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </FormSectionCard>

                <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" type="button" asChild>
                        <Link to="/ligas">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={disableSubmit} className="min-w-[168px]">
                        {isLoading
                            ? 'Creando liga...'
                            : isLoadingCapacity && !capacityError
                                ? 'Comprobando plan...'
                                : isCapacityBlocked
                                    ? 'Límite alcanzado'
                                    : 'Crear liga'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
