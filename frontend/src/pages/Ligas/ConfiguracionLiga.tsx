/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    Copy,
    Download,
    Eye,
    FileSpreadsheet,
    Info,
    Key,
    Languages,
    Lock,
    Plus,
    Send,
    Settings,
    Trash2,
    UserPlus,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ligasApi } from '@/api/ligas';
import { partidosApi } from '@/api/partidos';
import { jornadasApi } from '@/api/jornadas';
import { equiposApi } from '@/api/equipos';
import type { JornadaWithStats } from '@/types/liga';
import type { Equipo } from '@/types/liga';
import { useLiga } from '@/hooks/useLigas';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type {
    LeagueTeacherMember,
    LeagueTeacherMemberUpsert,
    MatchRoleSchema,
    MatchRoleSlot,
    MatchRoleSlotKey,
} from '@/types/liga';

const DEFAULT_TEAM_ROLES = ['Capitan/a', 'Entrenador/a', 'Arbitro/a', 'Tutor/a de grada', 'Preparador/a fisico/a'];

const DEFAULT_TEAM_COMMITMENTS: Record<string, string[]> = {
    'Capitan/a': ['Liderar con respeto', 'Dar ejemplo al equipo', 'Comunicar incidencias al profesorado'],
    'Entrenador/a': ['Organizar alineaciones', 'Gestionar cambios durante el partido', 'Fomentar juego limpio'],
    'Arbitro/a': ['Aplicar normas con imparcialidad', 'Mantener el control del encuentro', 'Explicar decisiones con calma'],
    'Tutor/a de grada': ['Promover animacion respetuosa', 'Evitar burlas o insultos', 'Cuidar el clima de convivencia'],
    'Preparador/a fisico/a': ['Coordinar calentamiento', 'Prevenir riesgos', 'Acompanhar la vuelta a la calma'],
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

const SLOT_KEYS_BY_FORMAT: Record<3 | 4 | 5, MatchRoleSlotKey[]> = {
    3: ['home_team', 'away_team', 'slot_3'],
    4: ['home_team', 'away_team', 'slot_3', 'slot_4'],
    5: ['home_team', 'away_team', 'slot_3', 'slot_4', 'slot_5'],
};

const DEFAULT_MATCH_SCHEMA: MatchRoleSchema = {
    roles_per_match: 4,
    status: 'draft',
    slots: [
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
        {
            slot_key: 'slot_3',
            slot_order: 3,
            role_code: 'arbitro',
            role_label: 'Arbitro',
            scoring_category: 'arbitraje',
            is_required: true,
            evaluation_enabled: true,
        },
        {
            slot_key: 'slot_4',
            slot_order: 4,
            role_code: 'grada_local',
            role_label: 'Tutor de grada local',
            scoring_category: 'grada',
            is_required: true,
            evaluation_enabled: true,
        },
        {
            slot_key: 'slot_5',
            slot_order: 5,
            role_code: 'grada_visitante',
            role_label: 'Tutor de grada visitante',
            scoring_category: 'grada',
            is_required: true,
            evaluation_enabled: true,
        },
    ],
    rules: [],
};

const cloneDefaultMatchSchema = (): MatchRoleSchema => ({
    ...DEFAULT_MATCH_SCHEMA,
    slots: DEFAULT_MATCH_SCHEMA.slots.map((slot) => ({ ...slot })),
    rules: DEFAULT_MATCH_SCHEMA.rules.map((rule) => ({ ...rule })),
});

const SETTINGS_PANEL_CLASSNAME = 'border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]';
const SETTINGS_HEADER_CLASSNAME = 'border-b border-lme-border/70';
const TAB_SECTIONS = [
    {
        value: 'acceso',
        label: 'Acceso y fichas',
        description: 'Activa PIN, enlace público y recepción de fichas para que el alumnado pueda entrar sin fricción.',
    },
    {
        value: 'portal',
        label: 'Portal de equipos',
        description: 'Define roles, compromisos y qué puede editar el alumnado al entrar en su equipo.',
    },
    {
        value: 'docentes',
        label: 'Docentes',
        description: 'Asocia docentes colaboradores o suplentes para mantener la continuidad de la liga.',
    },
    {
        value: 'puntuacion',
        label: 'Puntuación',
        description: 'Ajusta formato de partido, puntos deportivos y equilibrio de los roles evaluables.',
    },
    {
        value: 'liga',
        label: 'Datos de liga',
        description: 'Revisa datos generales y la zona de riesgo antes de cerrar cambios estructurales.',
    },
] as const;

type TabValue = (typeof TAB_SECTIONS)[number]['value'];

const TAB_META: Record<TabValue, { icon: LucideIcon; activeClass: string; iconClass: string }> = {
    acceso: {
        icon: Key,
        activeClass: 'border-sky/40 bg-sky/10',
        iconClass: 'border-sky/30 bg-sky/12 text-sky',
    },
    portal: {
        icon: Users,
        activeClass: 'border-mint/40 bg-mint/10',
        iconClass: 'border-mint/30 bg-mint/12 text-mint',
    },
    docentes: {
        icon: UserPlus,
        activeClass: 'border-sky/40 bg-sky/10',
        iconClass: 'border-sky/30 bg-sky/12 text-sky',
    },
    puntuacion: {
        icon: Trophy,
        activeClass: 'border-amber-300/40 bg-amber-300/10',
        iconClass: 'border-amber-300/30 bg-amber-300/12 text-amber-300',
    },
    liga: {
        icon: Settings,
        activeClass: 'border-vio/40 bg-vio/10',
        iconClass: 'border-vio/30 bg-vio/12 text-vio',
    },
};

export default function ConfiguracionLiga() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const ligaId = id ? parseInt(id, 10) : 0;
    const { data: liga, isLoading } = useLiga(ligaId);

    const [isUpdating, setIsUpdating] = useState(false);
    const [isExportingPines, setIsExportingPines] = useState(false);
    const [isExportingStats, setIsExportingStats] = useState(false);
    const [statsJornadaId, setStatsJornadaId] = useState<string>('');
    const [statsEquipoId, setStatsEquipoId] = useState<string>('');
    const [jornadasDisponibles, setJornadasDisponibles] = useState<JornadaWithStats[]>([]);
    const [equiposDisponibles, setEquiposDisponibles] = useState<Equipo[]>([]);

    const [publicPin, setPublicPin] = useState('');
    const [emailFichas, setEmailFichas] = useState('');
    const [config, setConfig] = useState({
        win_points: 3,
        draw_points: 2,
        loss_points: 1,
        arbitro_points: 2,
        grada_max_points: 1,
        grada_mid_points: 0.5,
        submission_language: 'all',
        allow_logo_editing: true,
    });

    const [teamRoles, setTeamRoles] = useState<string[]>([]);
    const [teamCommitments, setTeamCommitments] = useState<Record<string, string[]>>({});
    const [selectedRoleForCommitments, setSelectedRoleForCommitments] = useState<string>('');
    const [newRole, setNewRole] = useState('');
    const [newCommitment, setNewCommitment] = useState('');
    const [matchRoleSchema, setMatchRoleSchema] = useState<MatchRoleSchema>(cloneDefaultMatchSchema());
    const [isUpdatingMatchSchema, setIsUpdatingMatchSchema] = useState(false);
    const [activeTab, setActiveTab] = useState<TabValue>('acceso');
    const [teacherMembers, setTeacherMembers] = useState<LeagueTeacherMember[]>([]);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
    const [isUpdatingTeachers, setIsUpdatingTeachers] = useState(false);
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherRole, setTeacherRole] = useState<LeagueTeacherMemberUpsert['role']>('collaborator_teacher');
    const [teacherPermissions, setTeacherPermissions] = useState({
        can_view_league: true,
        can_view_matches: true,
        can_open_matches: true,
        can_validate_matches: true,
        can_view_results: true,
        can_manage_members: false,
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicLoginUrl = useMemo(
        () => (origin ? `${origin}/public/${ligaId}/login` : `/public/${ligaId}/login`),
        [origin, ligaId]
    );
    const publicFichasUrl = useMemo(
        () => (origin ? `${origin}/public/${ligaId}/fichas/generar` : `/public/${ligaId}/fichas/generar`),
        [origin, ligaId]
    );

    const hasPublicPin = publicPin.trim().length > 0;
    const hasFichasEmail = emailFichas.trim().length > 0;
    const hasSingleTeamRole = teamRoles.length <= 1;
    const schemaLocked = matchRoleSchema.status === 'locked';
    const rolesPerMatch = (matchRoleSchema.roles_per_match || 4) as 3 | 4 | 5;
    const activeTabIndex = TAB_SECTIONS.findIndex((section) => section.value === activeTab);
    const currentTab = TAB_SECTIONS[Math.max(activeTabIndex, 0)] || TAB_SECTIONS[0];

    const setCurrentTab = (tab: TabValue) => {
        setActiveTab(tab);
        setSearchParams(tab === 'acceso' ? {} : { tab });
    };

    useEffect(() => {
        if (!liga) return;

        setPublicPin(liga.public_pin || '');
        setEmailFichas(liga.email_fichas || '');
        setConfig({
            win_points: liga.config?.win_points ?? 3,
            draw_points: liga.config?.draw_points ?? 2,
            loss_points: liga.config?.loss_points ?? 1,
            arbitro_points: liga.config?.arbitro_points ?? 2,
            grada_max_points: liga.config?.grada_max_points ?? 1,
            grada_mid_points: liga.config?.grada_mid_points ?? 0.5,
            submission_language: liga.config?.submission_language ?? 'all',
            allow_logo_editing: liga.config?.allow_logo_editing ?? true,
        });

        const roles = liga.team_roles && liga.team_roles.length > 0 ? liga.team_roles : DEFAULT_TEAM_ROLES;
        setTeamRoles(roles);
        setTeamCommitments(liga.team_commitments || DEFAULT_TEAM_COMMITMENTS);
        setSelectedRoleForCommitments(roles[0] ?? '');
        setMatchRoleSchema(
            liga.match_role_schema && liga.match_role_schema.slots?.length > 0
                ? liga.match_role_schema
                : cloneDefaultMatchSchema()
        );
    }, [liga]);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const matchingTab = TAB_SECTIONS.find((section) => section.value === tabParam)?.value;
        if (matchingTab && matchingTab !== activeTab) {
            setActiveTab(matchingTab);
        }
    }, [activeTab, searchParams]);

    useEffect(() => {
        if (!ligaId || activeTab !== 'docentes') return;

        let cancelled = false;
        setIsLoadingTeachers(true);
        ligasApi.getDocentes(ligaId)
            .then((members) => {
                if (!cancelled) {
                    setTeacherMembers(members);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    toast.error('No se pudieron cargar los docentes asociados');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingTeachers(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeTab, ligaId]);

    const invalidateLigaQueries = async () => {
        await queryClient.invalidateQueries({ queryKey: ['ligas', ligaId] });
        await queryClient.invalidateQueries({ queryKey: ['ligas'] });
    };

    const copyToClipboard = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copiado`);
        } catch {
            toast.error('No se pudo copiar al portapapeles');
        }
    };

    const openExternal = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    useEffect(() => {
        if (!ligaId || activeTab !== 'liga') return;
        let cancelled = false;
        Promise.all([
            jornadasApi.getAllByLiga(ligaId),
            equiposApi.getAllByLiga(ligaId),
        ]).then(([jornadas, equipos]) => {
            if (!cancelled) {
                setJornadasDisponibles(jornadas);
                setEquiposDisponibles(equipos);
            }
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [activeTab, ligaId]);

    const handleExportPines = async (formato: 'pdf' | 'csv') => {
        setIsExportingPines(true);
        try {
            await partidosApi.exportPinesCalendario(ligaId, formato);
            toast.success(`Calendario de PINes descargado (${formato.toUpperCase()})`);
        } catch {
            toast.error('No se pudo descargar el calendario de PINes');
        } finally {
            setIsExportingPines(false);
        }
    };

    const handleExportStats = async (formato: 'csv' | 'pdf') => {
        setIsExportingStats(true);
        try {
            await ligasApi.exportEstadisticas(
                ligaId,
                formato,
                statsJornadaId ? parseInt(statsJornadaId) : undefined,
                statsEquipoId ? parseInt(statsEquipoId) : undefined,
            );
            toast.success(`Estadísticas descargadas (${formato.toUpperCase()})`);
        } catch {
            toast.error('No se pudo exportar las estadísticas');
        } finally {
            setIsExportingStats(false);
        }
    };

    const handleGeneratePin = async () => {
        if (!liga) return;
        setIsUpdating(true);
        try {
            const response = await ligasApi.generatePublicPin(ligaId);
            setPublicPin(response.public_pin);
            await invalidateLigaQueries();
            toast.success('PIN generado correctamente');
        } catch {
            toast.error('No se pudo generar el PIN');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDisablePin = async () => {
        if (!liga) return;
        setIsUpdating(true);
        try {
            await ligasApi.disablePublicPin(ligaId);
            setPublicPin('');
            await invalidateLigaQueries();
            toast.success('Acceso por PIN desactivado');
        } catch {
            toast.error('No se pudo desactivar el PIN');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!liga) return;
        setIsUpdating(true);
        try {
            await ligasApi.update(ligaId, { email_fichas: emailFichas.trim() });
            await invalidateLigaQueries();
            toast.success('Email de recepcion actualizado');
        } catch {
            toast.error('Error al actualizar el email');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveLanguage = async () => {
        if (!liga) return;
        setIsUpdating(true);
        try {
            await ligasApi.update(ligaId, { config });
            await invalidateLigaQueries();
            toast.success('Idioma de envio actualizado');
        } catch {
            toast.error('Error al guardar idioma');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateScoring = async () => {
        if (!liga) return;
        setIsUpdating(true);
        try {
            await ligasApi.update(ligaId, { config });
            await invalidateLigaQueries();
            toast.success('Sistema de puntuacion actualizado');
        } catch {
            toast.error('Error al guardar puntuacion');
        } finally {
            setIsUpdating(false);
        }
    };

    const readSlotCode = (slotKey: MatchRoleSlotKey): string => {
        const found = matchRoleSchema.slots.find((slot) => slot.slot_key === slotKey);
        if (found?.role_code) return found.role_code;
        if (slotKey === 'slot_3') return 'arbitro';
        if (slotKey === 'slot_4') return 'grada_local';
        if (slotKey === 'slot_5') return 'grada_visitante';
        if (slotKey === 'home_team') return 'equipo_local';
        return 'equipo_visitante';
    };

    const buildMatchRoleSchemaPayload = (
        targetRolesPerMatch: 3 | 4 | 5,
        overrides?: Partial<Record<'slot_3' | 'slot_4' | 'slot_5', string>>,
    ): MatchRoleSchema => {
        const activeSlotKeys = SLOT_KEYS_BY_FORMAT[targetRolesPerMatch];
        const auxSlotKeys = activeSlotKeys.filter((slotKey) => slotKey.startsWith('slot_')) as Array<'slot_3' | 'slot_4' | 'slot_5'>;
        const selectedAuxCodes = auxSlotKeys.map((slotKey) => overrides?.[slotKey] || readSlotCode(slotKey));
        if (new Set(selectedAuxCodes).size !== selectedAuxCodes.length) {
            throw new Error('No se permite repetir roles auxiliares en el mismo formato.');
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

        auxSlotKeys.forEach((slotKey, index) => {
            const roleCode = overrides?.[slotKey] || readSlotCode(slotKey);
            const option = MATCH_ROLE_OPTIONS.find((item) => item.code === roleCode);
            slots.push({
                slot_key: slotKey,
                slot_order: index + 3,
                role_code: roleCode,
                role_label: option?.label || roleCode,
                scoring_category: option?.scoring_category || 'custom',
                is_required: true,
                evaluation_enabled: true,
            });
        });

        return {
            ...matchRoleSchema,
            roles_per_match: targetRolesPerMatch,
            slots,
            rules: matchRoleSchema.rules || [],
        };
    };

    const handleRolesPerMatchChange = (targetRolesPerMatch: 3 | 4 | 5) => {
        if (schemaLocked) {
            toast.error('El esquema esta bloqueado y no permite cambios estructurales.');
            return;
        }
        try {
            setMatchRoleSchema(buildMatchRoleSchemaPayload(targetRolesPerMatch));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el formato.');
        }
    };

    const handleAuxRoleChange = (slotKey: 'slot_3' | 'slot_4' | 'slot_5', roleCode: string) => {
        if (schemaLocked) {
            toast.error('El esquema esta bloqueado y no permite cambios estructurales.');
            return;
        }
        try {
            setMatchRoleSchema(buildMatchRoleSchemaPayload(rolesPerMatch, { [slotKey]: roleCode }));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el rol.');
        }
    };

    const handleSaveMatchRoleSchema = async () => {
        if (!liga) return;
        if (schemaLocked) {
            toast.error('El esquema ya esta bloqueado.');
            return;
        }

        setIsUpdatingMatchSchema(true);
        try {
            const payload = buildMatchRoleSchemaPayload(rolesPerMatch);
            const updated = await ligasApi.updateMatchRoleSchema(ligaId, payload);
            setMatchRoleSchema(updated);
            await invalidateLigaQueries();
            toast.success('Roles de partido guardados');
        } catch {
            toast.error('No se pudo guardar el esquema de roles de partido');
        } finally {
            setIsUpdatingMatchSchema(false);
        }
    };

    const handleLockMatchRoleSchema = async () => {
        if (!liga) return;
        if (schemaLocked) {
            toast.error('El esquema ya esta bloqueado.');
            return;
        }

        if (!window.confirm('Al bloquear el formato no podras cambiar roles por partido en esta liga.')) {
            return;
        }

        setIsUpdatingMatchSchema(true);
        try {
            const locked = await ligasApi.lockMatchRoleSchema(ligaId);
            setMatchRoleSchema(locked);
            await invalidateLigaQueries();
            toast.success('Formato de partido bloqueado');
        } catch {
            toast.error('No se pudo bloquear el esquema');
        } finally {
            setIsUpdatingMatchSchema(false);
        }
    };

    const handleUnlockMatchRoleSchema = async () => {
        if (!window.confirm(
            'Desbloquear el formato permite cambiar los roles y puntuaciones del partido.\n\n' +
            'Solo es posible si has eliminado TODOS los partidos y jornadas de esta liga.\n\n' +
            '¿Continuar?'
        )) return;

        setIsUpdatingMatchSchema(true);
        try {
            const unlocked = await ligasApi.unlockMatchRoleSchema(ligaId);
            setMatchRoleSchema(unlocked);
            await invalidateLigaQueries();
            toast.success('Formato desbloqueado — ya puedes editar los roles');
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            if (detail?.includes('Elimina todos')) {
                toast.error('Elimina todos los partidos y jornadas de esta liga antes de desbloquear');
            } else {
                toast.error('No se pudo desbloquear el formato');
            }
        } finally {
            setIsUpdatingMatchSchema(false);
        }
    };

    const handleAddRole = () => {
        const role = newRole.trim();
        if (!role) return;

        const exists = teamRoles.some((item) => item.toLowerCase() === role.toLowerCase());
        if (exists) {
            toast.error('El rol ya existe');
            return;
        }

        const updatedRoles = [...teamRoles, role];
        setTeamRoles(updatedRoles);
        setTeamCommitments((prev) => ({
            ...prev,
            [role]: prev[role] || [],
        }));
        setSelectedRoleForCommitments((prev) => prev || role);
        setNewRole('');
    };

    const handleRemoveRole = (roleToRemove: string) => {
        if (hasSingleTeamRole) {
            toast.error('Debe existir al menos un rol activo');
            return;
        }

        const roleCommitments = teamCommitments[roleToRemove] || [];
        if (
            roleCommitments.length > 0 &&
            !window.confirm(`El rol "${roleToRemove}" tiene compromisos asociados. Deseas eliminarlo igualmente?`)
        ) {
            return;
        }

        const updatedRoles = teamRoles.filter((role) => role !== roleToRemove);
        setTeamRoles(updatedRoles);
        setTeamCommitments((prev) => {
            const updated = { ...prev };
            delete updated[roleToRemove];
            return updated;
        });

        if (selectedRoleForCommitments === roleToRemove) {
            setSelectedRoleForCommitments(updatedRoles[0] ?? '');
        }
    };

    const handleAddCommitment = () => {
        if (!selectedRoleForCommitments) return;
        const commitment = newCommitment.trim();
        if (!commitment) return;

        const current = teamCommitments[selectedRoleForCommitments] || [];
        const exists = current.some((item) => item.toLowerCase() === commitment.toLowerCase());
        if (exists) {
            toast.error('El compromiso ya existe para este rol');
            return;
        }

        setTeamCommitments((prev) => ({
            ...prev,
            [selectedRoleForCommitments]: [...current, commitment],
        }));
        setNewCommitment('');
    };

    const handleRemoveCommitment = (role: string, index: number) => {
        const current = teamCommitments[role] || [];
        setTeamCommitments((prev) => ({
            ...prev,
            [role]: current.filter((_, idx) => idx !== index),
        }));
    };

    const handleSaveTeamConfig = async () => {
        if (!liga) return;
        setIsUpdating(true);
        try {
            await ligasApi.update(ligaId, {
                team_roles: teamRoles,
                team_commitments: teamCommitments,
                config,
            });
            await invalidateLigaQueries();
            toast.success('Configuracion del portal de equipos guardada');
        } catch {
            toast.error('Error al guardar configuracion de equipos');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleTeacherRoleChange = (role: LeagueTeacherMemberUpsert['role']) => {
        setTeacherRole(role);
        if (role === 'viewer_teacher') {
            setTeacherPermissions({
                can_view_league: true,
                can_view_matches: true,
                can_open_matches: false,
                can_validate_matches: false,
                can_view_results: true,
                can_manage_members: false,
            });
            return;
        }

        setTeacherPermissions({
            can_view_league: true,
            can_view_matches: true,
            can_open_matches: true,
            can_validate_matches: true,
            can_view_results: true,
            can_manage_members: false,
        });
    };

    const refreshTeacherMembers = async () => {
        const members = await ligasApi.getDocentes(ligaId);
        setTeacherMembers(members);
    };

    const handleAddTeacherMember = async () => {
        const email = teacherEmail.trim();
        if (!email) {
            toast.error('Indica el email del docente');
            return;
        }

        setIsUpdatingTeachers(true);
        try {
            await ligasApi.upsertDocente(ligaId, {
                email,
                role: teacherRole,
                permissions: teacherPermissions,
            });
            setTeacherEmail('');
            await refreshTeacherMembers();
            toast.success('Docente asociado a la liga');
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(detail || 'No se pudo asociar el docente');
        } finally {
            setIsUpdatingTeachers(false);
        }
    };

    const handleRevokeTeacherMember = async (member: LeagueTeacherMember) => {
        if (!window.confirm(`Revocar acceso a ${member.user_email || member.user_codigo || 'este docente'}?`)) {
            return;
        }

        setIsUpdatingTeachers(true);
        try {
            await ligasApi.revokeDocente(ligaId, member.user_id);
            await refreshTeacherMembers();
            toast.success('Acceso docente revocado');
        } catch {
            toast.error('No se pudo revocar el acceso');
        } finally {
            setIsUpdatingTeachers(false);
        }
    };

    const handleDeleteLiga = async () => {
        if (!liga) return;
        if (!window.confirm('Se eliminara la liga con sus equipos y partidos. Esta accion no se puede deshacer.')) {
            return;
        }

        setIsUpdating(true);
        try {
            await ligasApi.delete(liga.id);
            toast.success('Liga eliminada correctamente');
            navigate('/ligas');
        } catch {
            toast.error('No se pudo eliminar la liga');
        } finally {
            setIsUpdating(false);
        }
    };

    const moveTab = (direction: 'previous' | 'next') => {
        const nextIndex = direction === 'previous' ? activeTabIndex - 1 : activeTabIndex + 1;
        const nextSection = TAB_SECTIONS[nextIndex];
        if (nextSection) {
            setCurrentTab(nextSection.value);
        }
    };

    const renderStepNavigation = (tabValue: TabValue) => {
        const sectionIndex = TAB_SECTIONS.findIndex((section) => section.value === tabValue);
        const section = TAB_SECTIONS[sectionIndex];
        if (!section) return null;

        const previousSection = TAB_SECTIONS[sectionIndex - 1];
        const nextSection = TAB_SECTIONS[sectionIndex + 1];

        return (
            <Card className={SETTINGS_PANEL_CLASSNAME}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-sub">
                            Paso {sectionIndex + 1} de {TAB_SECTIONS.length}
                        </p>
                        <p className="mt-1 text-base font-semibold text-ink">{section.label}</p>
                        <p className="mt-1 text-sm text-sub">{section.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!previousSection}
                            onClick={() => previousSection && setCurrentTab(previousSection.value)}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {previousSection ? previousSection.label : 'Inicio'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!nextSection}
                            onClick={() => nextSection && setCurrentTab(nextSection.value)}
                        >
                            {nextSection ? nextSection.label : 'Último paso'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
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
            <Card className="border border-red-500/40 bg-red-500/10">
                <CardContent className="pt-6 text-red-300">Liga no encontrada.</CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${liga.id}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a la liga
                </Link>
            </Button>

            <PageHeader
                eyebrow="Configuracion operativa"
                title={`Configuracion de ${liga.nombre}`}
                description="Organiza accesos de alumnado, portal de equipos y reglas de puntuacion en un solo espacio."
            >
                <Badge variant="outline">Paso {activeTabIndex + 1} de {TAB_SECTIONS.length}</Badge>
                <Badge variant={hasPublicPin ? 'success' : 'warning'}>
                    {hasPublicPin ? 'PIN activo' : 'PIN pendiente'}
                </Badge>
                <Badge variant={hasFichasEmail ? 'success' : 'secondary'}>
                    {hasFichasEmail ? 'Email fichas activo' : 'Sin email fichas'}
                </Badge>
                <Badge variant="outline">{teamRoles.length} roles definidos</Badge>
                <Badge variant="outline">{teacherMembers.filter((member) => member.status === 'active').length} docentes asociados</Badge>
                <Badge variant={schemaLocked ? 'success' : 'warning'}>
                    {schemaLocked ? `Formato bloqueado (${rolesPerMatch} roles)` : `Formato draft (${rolesPerMatch} roles)`}
                </Badge>
            </PageHeader>

            <Tabs value={activeTab} onValueChange={(value) => setCurrentTab(value as TabValue)} className="space-y-4">
                <Card className={SETTINGS_PANEL_CLASSNAME}>
                    <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-sub">
                                Paso {activeTabIndex + 1} de {TAB_SECTIONS.length}
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-ink">{currentTab.label}</h2>
                            <p className="mt-1 text-sm text-sub">{currentTab.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={activeTabIndex <= 0}
                                onClick={() => moveTab('previous')}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Paso anterior
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={activeTabIndex >= TAB_SECTIONS.length - 1}
                                onClick={() => moveTab('next')}
                            >
                                Siguiente paso
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Secciones de configuracion de liga">
                    {TAB_SECTIONS.map((section) => {
                        const isActive = activeTab === section.value;
                        const meta = TAB_META[section.value];
                        const Icon = meta.icon;
                        return (
                            <button
                                key={section.value}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setCurrentTab(section.value)}
                                className={cn(
                                    'group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200',
                                    isActive
                                        ? meta.activeClass
                                        : 'border-lme-border/70 bg-[rgba(10,20,38,0.60)] hover:border-lme-border hover:bg-[rgba(10,20,38,0.80)]',
                                )}
                            >
                                <div className={cn('rounded-lg border p-2.5 transition-colors', isActive ? meta.iconClass : 'border-lme-border/50 bg-white/5 text-sub')}>
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className={cn('text-sm font-semibold transition-colors', isActive ? 'text-ink' : 'text-sub group-hover:text-ink')}>
                                        {section.label}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-snug text-sub/80">{section.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <TabsContent value="acceso" className="space-y-4">
                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-mint" />
                                Acceso publico por PIN
                            </CardTitle>
                            <CardDescription>
                                Genera un PIN para habilitar el acceso del alumnado a la vista publica.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                <div className="space-y-2">
                                    <Label htmlFor="public-pin">PIN de acceso</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-sub" />
                                        <Input
                                            id="public-pin"
                                            value={publicPin}
                                            readOnly
                                            placeholder="Genera un PIN de 6 caracteres"
                                            className="pl-10 font-mono tracking-[0.16em]"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleGeneratePin} disabled={isUpdating} className="md:self-end">
                                    {hasPublicPin ? 'Regenerar PIN' : 'Generar PIN'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleDisablePin}
                                    disabled={isUpdating || !hasPublicPin}
                                    className="md:self-end"
                                >
                                    Desactivar
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Enlace de acceso publico</Label>
                                <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                                    <code className="rounded-md border border-lme-border bg-[rgba(8,14,30,0.78)] px-3 py-2 text-xs text-ink overflow-x-auto">
                                        {publicLoginUrl}
                                    </code>
                                    <Button
                                        variant="outline"
                                        onClick={() => copyToClipboard(publicLoginUrl, 'Enlace publico')}
                                        disabled={!hasPublicPin}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copiar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => openExternal(publicLoginUrl)}
                                        disabled={!hasPublicPin}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Abrir
                                    </Button>
                                </div>
                                <p className="text-xs text-sub">
                                    Sin PIN activo, el alumnado no podra iniciar sesion en la vista publica.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5 text-mint" />
                                Recepcion de fichas de juego
                            </CardTitle>
                            <CardDescription>
                                Define correo e idioma para los envios del generador de fichas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                                <div className="space-y-2">
                                    <Label htmlFor="email-fichas">Email docente</Label>
                                    <Input
                                        id="email-fichas"
                                        type="email"
                                        placeholder="docente@centro.es"
                                        value={emailFichas}
                                        onChange={(event) => setEmailFichas(event.target.value)}
                                    />
                                </div>
                                <Button onClick={handleUpdateEmail} disabled={isUpdating} className="md:self-end">
                                    Guardar email
                                </Button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[240px_auto]">
                                <div className="space-y-2">
                                    <Label htmlFor="submission-language" className="flex items-center gap-2">
                                        <Languages className="h-4 w-4" />
                                        Idioma requerido
                                    </Label>
                                    <Select
                                        value={config.submission_language}
                                        onValueChange={(value) => setConfig((prev) => ({ ...prev, submission_language: value }))}
                                    >
                                        <SelectTrigger id="submission-language">
                                            <SelectValue placeholder="Selecciona idioma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Cualquiera</SelectItem>
                                            <SelectItem value="gl">Galego</SelectItem>
                                            <SelectItem value="es">Castellano</SelectItem>
                                            <SelectItem value="en">Ingles</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button variant="outline" onClick={handleSaveLanguage} disabled={isUpdating} className="md:self-end">
                                    Guardar idioma
                                </Button>
                            </div>

                            <div className="space-y-2 border-t border-lme-border pt-4">
                                <Label>Enlace del generador de fichas</Label>
                                <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                                    <code className="rounded-md border border-lme-border bg-[rgba(8,14,30,0.78)] px-3 py-2 text-xs text-ink overflow-x-auto">
                                        {publicFichasUrl}
                                    </code>
                                    <Button
                                        variant="outline"
                                        onClick={() => copyToClipboard(publicFichasUrl, 'Enlace de fichas')}
                                        disabled={!hasFichasEmail}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copiar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => openExternal(publicFichasUrl)}
                                        disabled={!hasFichasEmail}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Abrir
                                    </Button>
                                </div>
                                <p className="text-xs text-sub">
                                    Configura primero un email de recepcion para activar este flujo.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="h-5 w-5 text-mint" />
                                Descargar calendario con PINes
                            </CardTitle>
                            <CardDescription>
                                Descarga el calendario completo con PINes de cada partido, equipos y roles. Para uso exclusivo docente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border border-amber-300/20 bg-amber-300/6 p-3">
                                <p className="text-xs text-amber-200/90">
                                    Este documento contiene los PINes de acceso del alumnado. No lo compartas fuera del equipo docente.
                                    Los nombres de equipos no deben contener datos personales de menores (LOPD/RGPD).
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleExportPines('pdf')}
                                    disabled={isExportingPines || !hasPublicPin}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar PDF (imprimible)
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleExportPines('csv')}
                                    disabled={isExportingPines || !hasPublicPin}
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Descargar CSV (Excel/Sheets)
                                </Button>
                            </div>
                            {!hasPublicPin && (
                                <p className="text-xs text-sub">Genera primero el PIN de liga para activar la descarga.</p>
                            )}
                        </CardContent>
                    </Card>

                    {renderStepNavigation('acceso')}
                </TabsContent>

                <TabsContent value="portal" className="space-y-4">
                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-mint" />
                                Portal de equipos y compromisos
                            </CardTitle>
                            <CardDescription>
                                Configura roles y contratos que firmara el alumnado al unirse a un equipo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="rounded-lg border border-lme-border bg-[rgba(11,20,38,0.52)] p-4">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-sky flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        <p className="text-sm text-ink">
                                            Los estudiantes acceden desde el enlace de invitacion de cada equipo.
                                        </p>
                                        <p className="text-xs text-sub">
                                            Comparte ese enlace desde la lista de equipos para que completen rol, compromisos y logo.
                                        </p>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to={`/ligas/${ligaId}/equipos`}>Ir a equipos</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.58)] p-4 flex flex-wrap gap-3 items-start justify-between">
                                <div className="space-y-1">
                                    <Label htmlFor="allow-logo" className="text-ink">Edicion de logo por estudiantes</Label>
                                    <p className="text-xs text-sub">
                                        Desactivalo para bloquear cambios de logo en el portal de equipos.
                                    </p>
                                </div>
                                <Switch
                                    id="allow-logo"
                                    checked={config.allow_logo_editing}
                                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, allow_logo_editing: checked }))}
                                />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-role">Roles disponibles</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="new-role"
                                                value={newRole}
                                                onChange={(event) => setNewRole(event.target.value)}
                                                placeholder="Nuevo rol (ej. Responsable de material)"
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') {
                                                        event.preventDefault();
                                                        handleAddRole();
                                                    }
                                                }}
                                            />
                                            <Button variant="secondary" onClick={handleAddRole}>
                                                <Plus className="h-4 w-4 mr-1.5" />
                                                Anadir
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {teamRoles.map((role) => (
                                            <div key={role} className="rounded-md border border-lme-border bg-[rgba(12,21,39,0.68)] px-3 py-2 flex items-center justify-between gap-2">
                                                <span className="text-sm text-ink">{role}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleRemoveRole(role)}
                                                    disabled={hasSingleTeamRole}
                                                    aria-label={`Eliminar rol ${role}`}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="role-select">Compromisos por rol</Label>
                                        <Select
                                            value={selectedRoleForCommitments || undefined}
                                            onValueChange={setSelectedRoleForCommitments}
                                        >
                                            <SelectTrigger id="role-select">
                                                <SelectValue placeholder="Selecciona un rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teamRoles.map((role) => (
                                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedRoleForCommitments ? (
                                        <>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newCommitment}
                                                    onChange={(event) => setNewCommitment(event.target.value)}
                                                    placeholder="Anadir compromiso para este rol"
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            handleAddCommitment();
                                                        }
                                                    }}
                                                />
                                                <Button variant="secondary" onClick={handleAddCommitment}>
                                                    <Plus className="h-4 w-4 mr-1.5" />
                                                    Anadir
                                                </Button>
                                            </div>

                                            <div className="space-y-2">
                                                {(teamCommitments[selectedRoleForCommitments] || []).length === 0 ? (
                                                    <p className="text-xs text-sub">Este rol todavia no tiene compromisos definidos.</p>
                                                ) : (
                                                    (teamCommitments[selectedRoleForCommitments] || []).map((commitment, index) => (
                                                        <div key={`${selectedRoleForCommitments}-${index}`} className="rounded-md border border-lme-border bg-[rgba(12,21,39,0.68)] px-3 py-2 flex items-start justify-between gap-2">
                                                            <p className="text-sm text-ink">{commitment}</p>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 mt-0.5"
                                                                onClick={() => handleRemoveCommitment(selectedRoleForCommitments, index)}
                                                                aria-label="Eliminar compromiso"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs text-sub">Crea o selecciona un rol para editar compromisos.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-lme-border pt-4">
                                <Button onClick={handleSaveTeamConfig} disabled={isUpdating}>
                                    Guardar portal de equipos
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {renderStepNavigation('portal')}
                </TabsContent>

                <TabsContent value="docentes" className="space-y-4">
                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-mint" />
                                Docentes asociados a la liga
                            </CardTitle>
                            <CardDescription>
                                Añade docentes existentes como colaboradores, suplentes o solo consulta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="rounded-lg border border-lme-border bg-[rgba(11,20,38,0.52)] p-4">
                                <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
                                    <div className="space-y-2">
                                        <Label htmlFor="teacher-email">Email del docente</Label>
                                        <Input
                                            id="teacher-email"
                                            type="email"
                                            value={teacherEmail}
                                            onChange={(event) => setTeacherEmail(event.target.value)}
                                            placeholder="docente@centro.es"
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    handleAddTeacherMember();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="teacher-role">Rol</Label>
                                        <Select value={teacherRole} onValueChange={(value) => handleTeacherRoleChange(value as LeagueTeacherMemberUpsert['role'])}>
                                            <SelectTrigger id="teacher-role">
                                                <SelectValue placeholder="Selecciona rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="collaborator_teacher">Colaborador</SelectItem>
                                                <SelectItem value="substitute_teacher">Suplente</SelectItem>
                                                <SelectItem value="viewer_teacher">Solo consulta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleAddTeacherMember} disabled={isUpdatingTeachers} className="lg:self-end">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Asociar docente
                                    </Button>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {[
                                        ['can_view_league', 'Ver liga'],
                                        ['can_view_matches', 'Consultar partidos'],
                                        ['can_open_matches', 'Abrir partidos'],
                                        ['can_validate_matches', 'Validar resultados'],
                                        ['can_view_results', 'Ver resultados'],
                                        ['can_manage_members', 'Gestionar docentes'],
                                    ].map(([field, label]) => (
                                        <div key={field} className="flex items-center justify-between gap-3 rounded-md border border-lme-border bg-[rgba(8,14,30,0.54)] px-3 py-2">
                                            <Label htmlFor={`teacher-permission-${field}`} className="text-sm text-ink">
                                                {label}
                                            </Label>
                                            <Switch
                                                id={`teacher-permission-${field}`}
                                                checked={Boolean(teacherPermissions[field as keyof typeof teacherPermissions])}
                                                onCheckedChange={(checked) => setTeacherPermissions((prev) => ({ ...prev, [field]: checked }))}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-3 text-xs text-sub">
                                    El docente debe existir previamente como usuario. El propietario conserva la titularidad de la liga.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-ink">Accesos actuales</h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={refreshTeacherMembers}
                                        disabled={isLoadingTeachers || isUpdatingTeachers}
                                    >
                                        Actualizar
                                    </Button>
                                </div>

                                {isLoadingTeachers ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Skeleton className="h-28 w-full" />
                                        <Skeleton className="h-28 w-full" />
                                    </div>
                                ) : teacherMembers.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-lme-border bg-[rgba(9,18,36,0.45)] p-6 text-sm text-sub">
                                        Todavia no hay docentes asociados a esta liga.
                                    </div>
                                ) : (
                                    <div className="grid gap-3 lg:grid-cols-2">
                                        {teacherMembers.map((member) => (
                                            <div key={member.id} className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.58)] p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-ink">
                                                            {member.user_email || member.user_codigo || `Usuario ${member.user_id}`}
                                                        </p>
                                                        <p className="mt-1 text-xs text-sub">
                                                            {member.role === 'viewer_teacher'
                                                                ? 'Solo consulta'
                                                                : member.role === 'substitute_teacher'
                                                                    ? 'Suplente'
                                                                    : 'Colaborador'}
                                                        </p>
                                                    </div>
                                                    <Badge variant={member.status === 'active' ? 'success' : 'secondary'}>
                                                        {member.status === 'active' ? 'Activo' : 'Revocado'}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {member.can_view_league && <Badge variant="outline">Liga</Badge>}
                                                    {member.can_view_matches && <Badge variant="outline">Partidos</Badge>}
                                                    {member.can_open_matches && <Badge variant="outline">Abrir</Badge>}
                                                    {member.can_validate_matches && <Badge variant="outline">Validar</Badge>}
                                                    {member.can_view_results && <Badge variant="outline">Resultados</Badge>}
                                                    {member.can_manage_members && <Badge variant="outline">Docentes</Badge>}
                                                </div>

                                                <div className="mt-4 flex justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRevokeTeacherMember(member)}
                                                        disabled={isUpdatingTeachers || member.status !== 'active'}
                                                        className="border-red-500/35 text-red-200 hover:border-red-500/60 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Revocar acceso
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {renderStepNavigation('docentes')}
                </TabsContent>

                <TabsContent value="puntuacion" className="space-y-4">
                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-mint" />
                                Formato de partido y roles puntuables
                            </CardTitle>
                            <CardDescription>
                                Define formato 3/4/5 y sustituciones de roles auxiliares. Este esquema se bloquea al iniciar competicion.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                <div className="flex flex-wrap gap-2">
                                    {[3, 4, 5].map((size) => (
                                        <Button
                                            key={size}
                                            type="button"
                                            variant={rolesPerMatch === size ? 'default' : 'outline'}
                                            disabled={schemaLocked}
                                            onClick={() => handleRolesPerMatchChange(size as 3 | 4 | 5)}
                                        >
                                            {size} roles por partido
                                        </Button>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-sub">
                                    Minimo de equipos recomendado: {rolesPerMatch}. El sistema valida este requisito al generar calendario.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                {(SLOT_KEYS_BY_FORMAT[rolesPerMatch].filter((slotKey) => slotKey.startsWith('slot_')) as Array<'slot_3' | 'slot_4' | 'slot_5'>).map((slotKey) => (
                                    <div key={slotKey} className="space-y-1.5 rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-3">
                                        <Label htmlFor={`match-role-${slotKey}`}>{slotKey.replace('_', ' ')}</Label>
                                        <Select
                                            value={readSlotCode(slotKey)}
                                            onValueChange={(value) => handleAuxRoleChange(slotKey, value)}
                                            disabled={schemaLocked}
                                        >
                                            <SelectTrigger id={`match-role-${slotKey}`}>
                                                <SelectValue placeholder="Selecciona rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MATCH_ROLE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                <p className="text-sm text-ink">
                                    Estado actual:{' '}
                                    <span className="font-semibold">
                                        {schemaLocked ? 'Bloqueado' : 'Borrador editable'}
                                    </span>
                                </p>
                                {matchRoleSchema.locked_at && (
                                    <p className="mt-1 text-xs text-sub">
                                        Bloqueado el {new Date(matchRoleSchema.locked_at).toLocaleString('es-ES')}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-between gap-2">
                                {schemaLocked && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleUnlockMatchRoleSchema}
                                        disabled={isUpdatingMatchSchema}
                                        className="border-amber-300/40 text-amber-300 hover:border-amber-300/70 hover:bg-amber-300/8"
                                    >
                                        Desbloquear formato
                                    </Button>
                                )}
                                <div className="flex flex-wrap gap-2 ml-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSaveMatchRoleSchema}
                                        disabled={schemaLocked || isUpdatingMatchSchema}
                                    >
                                        Guardar formato
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleLockMatchRoleSchema}
                                        disabled={schemaLocked || isUpdatingMatchSchema}
                                    >
                                        Bloquear formato
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-mint" />
                                Sistema de puntuacion
                            </CardTitle>
                            <CardDescription>
                                Ajusta puntos deportivos y educativos para mantener coherencia en la clasificacion.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-5 lg:grid-cols-2">
                                <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                    <h3 className="text-sm font-semibold text-ink">Puntos deportivos</h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="points-win">Victoria</Label>
                                            <Input
                                                id="points-win"
                                                type="number"
                                                value={config.win_points}
                                                onChange={(event) => setConfig((prev) => ({ ...prev, win_points: Number(event.target.value) }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="points-draw">Empate</Label>
                                            <Input
                                                id="points-draw"
                                                type="number"
                                                value={config.draw_points}
                                                onChange={(event) => setConfig((prev) => ({ ...prev, draw_points: Number(event.target.value) }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <Label htmlFor="points-loss">Derrota</Label>
                                            <Input
                                                id="points-loss"
                                                type="number"
                                                value={config.loss_points}
                                                onChange={(event) => setConfig((prev) => ({ ...prev, loss_points: Number(event.target.value) }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                    <h3 className="text-sm font-semibold text-ink">Puntos educativos</h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="points-arbitro">Arbitraje positivo</Label>
                                            <Input
                                                id="points-arbitro"
                                                type="number"
                                                step="0.1"
                                                value={config.arbitro_points}
                                                onChange={(event) => setConfig((prev) => ({ ...prev, arbitro_points: Number(event.target.value) }))}
                                            />
                                            <p className="text-xs text-sub">Se aplica cuando la media de arbitraje es igual o superior a 5.</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="points-grada-max">Grada excelente</Label>
                                            <Input
                                                id="points-grada-max"
                                                type="number"
                                                step="0.1"
                                                value={config.grada_max_points}
                                                onChange={(event) => setConfig((prev) => ({ ...prev, grada_max_points: Number(event.target.value) }))}
                                            />
                                            <p className="text-xs text-sub">Se aplica cuando la media de grada es mayor que 3.</p>
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <Label htmlFor="points-grada-mid">Grada bien</Label>
                                            <Input
                                                id="points-grada-mid"
                                                type="number"
                                                step="0.1"
                                                value={config.grada_mid_points}
                                                onChange={(event) => setConfig((prev) => ({ ...prev, grada_mid_points: Number(event.target.value) }))}
                                            />
                                            <p className="text-xs text-sub">Se aplica cuando la media de grada es igual o superior a 2.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleUpdateScoring} disabled={isUpdating}>
                                    Guardar puntuacion
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-mint" />
                                Calendario automatico
                            </CardTitle>
                            <CardDescription>
                                El sistema rota equipos por todos los roles para mantener equilibrio y justicia.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                <ul className="list-disc space-y-1.5 pl-5 text-sm text-sub">
                                    <li>Se necesitan al menos {rolesPerMatch} equipos para generar jornadas automaticas con este formato.</li>
                                    <li>El esquema de roles activo se aplica a toda la liga una vez bloqueado.</li>
                                    <li>El reparto de roles usa rotacion para igualar oportunidades de puntuacion.</li>
                                </ul>
                            </div>
                            <Button variant="outline" asChild>
                                <Link to={`/ligas/${liga.id}/jornadas`}>Ir a jornadas</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {renderStepNavigation('puntuacion')}
                </TabsContent>

                <TabsContent value="liga" className="space-y-4">
                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-mint" />
                                Informacion general
                            </CardTitle>
                            <CardDescription>Datos base de la liga para referencia de gestion.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                <p className="text-xs uppercase tracking-[0.08em] text-sub">Nombre de liga</p>
                                <p className="mt-2 text-lg font-semibold text-ink">{liga.nombre}</p>
                            </div>
                            <div className="rounded-lg border border-lme-border bg-[rgba(9,18,36,0.52)] p-4">
                                <p className="text-xs uppercase tracking-[0.08em] text-sub">Creada el</p>
                                <p className="mt-2 text-lg font-semibold text-ink">
                                    {liga.created_at
                                        ? new Date(liga.created_at).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                        : 'Sin fecha'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={SETTINGS_PANEL_CLASSNAME}>
                        <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-mint" />
                                Exportar datos estadísticos
                            </CardTitle>
                            <CardDescription>
                                Descarga los datos de partidos para análisis en clase: medias, totales, gráficos de evolución por jornada.
                                Compatible con Excel, Google Sheets y cualquier herramienta de cálculo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="stats-jornada">Filtrar por jornada</Label>
                                    <Select
                                        value={statsJornadaId || 'all'}
                                        onValueChange={(v) => setStatsJornadaId(v === 'all' ? '' : v)}
                                    >
                                        <SelectTrigger id="stats-jornada">
                                            <SelectValue placeholder="Todas las jornadas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las jornadas</SelectItem>
                                            {jornadasDisponibles.map((j) => (
                                                <SelectItem key={j.id} value={String(j.id)}>
                                                    {j.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="stats-equipo">Filtrar por equipo</Label>
                                    <Select
                                        value={statsEquipoId || 'all'}
                                        onValueChange={(v) => setStatsEquipoId(v === 'all' ? '' : v)}
                                    >
                                        <SelectTrigger id="stats-equipo">
                                            <SelectValue placeholder="Todos los equipos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los equipos</SelectItem>
                                            {equiposDisponibles.map((e) => (
                                                <SelectItem key={e.id} value={String(e.id)}>
                                                    {e.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleExportStats('csv')}
                                    disabled={isExportingStats}
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    CSV para Excel/Sheets
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleExportStats('pdf')}
                                    disabled={isExportingStats}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    PDF imprimible
                                </Button>
                            </div>
                            <p className="text-xs text-sub">
                                El CSV incluye: jornada, equipos, marcador, resultado, puntos deportivos, juego limpio, árbitro y grada por partido.
                                Ideal para trabajar medias, máximos y gráficas de evolución en el área de matemáticas.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-500/35 bg-red-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-200">
                                <Trash2 className="h-5 w-5" />
                                Zona de riesgo
                            </CardTitle>
                            <CardDescription className="text-red-200/85">
                                Eliminar liga borra tambien equipos, jornadas y partidos vinculados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-red-100/90">
                                Usa esta accion solo cuando necesites reiniciar completamente esta competicion.
                            </p>
                            <Button variant="destructive" onClick={handleDeleteLiga} disabled={isUpdating}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar liga
                            </Button>
                        </CardContent>
                    </Card>

                    {renderStepNavigation('liga')}
                </TabsContent>
            </Tabs>
        </div>
    );
}
