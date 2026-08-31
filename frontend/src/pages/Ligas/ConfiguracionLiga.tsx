/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

/**
 * Configuración de liga. El estado y los handlers viven aquí; el render de
 * cada pestaña está en pages/Ligas/configuracion/.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type {
    LeagueTeacherMember,
    LeagueTeacherMemberUpsert,
    MatchRoleSchema,
    MatchRoleSlot,
    MatchRoleSlotKey,
} from '@/types/liga';
import {
    DEFAULT_TEAM_COMMITMENTS,
    DEFAULT_TEAM_ROLES,
    MATCH_ROLE_OPTIONS,
    SETTINGS_PANEL_CLASSNAME,
    SLOT_KEYS_BY_FORMAT,
    TAB_META,
    TAB_SECTIONS,
    cloneDefaultMatchSchema,
    type TabValue,
} from './configuracion/constants';
import { StepNavigation } from './configuracion/StepNavigation';
import { TabAcceso } from './configuracion/TabAcceso';
import { TabPortal } from './configuracion/TabPortal';
import { TabDocentes } from './configuracion/TabDocentes';
import { TabPuntuacion } from './configuracion/TabPuntuacion';
import { TabLiga } from './configuracion/TabLiga';

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
            await ligasApi.exportEstadisticas(ligaId, formato, {
                jornadaIds: statsJornadaId ? [parseInt(statsJornadaId)] : undefined,
                equipoId: statsEquipoId ? parseInt(statsEquipoId) : undefined,
            });
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
                                        : 'border-lme-border/70 bg-[rgba(30,27,22,0.60)] hover:border-lme-border hover:bg-[rgba(30,27,22,0.80)]',
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
                    <TabAcceso
                        publicPin={publicPin}
                        emailFichas={emailFichas}
                        setEmailFichas={setEmailFichas}
                        config={config}
                        setConfig={setConfig}
                        isUpdating={isUpdating}
                        isExportingPines={isExportingPines}
                        hasPublicPin={hasPublicPin}
                        hasFichasEmail={hasFichasEmail}
                        publicLoginUrl={publicLoginUrl}
                        publicFichasUrl={publicFichasUrl}
                        onGeneratePin={handleGeneratePin}
                        onDisablePin={handleDisablePin}
                        onUpdateEmail={handleUpdateEmail}
                        onSaveLanguage={handleSaveLanguage}
                        onExportPines={handleExportPines}
                        onCopy={copyToClipboard}
                        onOpenExternal={openExternal}
                    />
                    <StepNavigation tabValue="acceso" onNavigate={setCurrentTab} />
                </TabsContent>

                <TabsContent value="portal" className="space-y-4">
                    <TabPortal
                        ligaId={ligaId}
                        config={config}
                        setConfig={setConfig}
                        teamRoles={teamRoles}
                        teamCommitments={teamCommitments}
                        selectedRoleForCommitments={selectedRoleForCommitments}
                        setSelectedRoleForCommitments={setSelectedRoleForCommitments}
                        newRole={newRole}
                        setNewRole={setNewRole}
                        newCommitment={newCommitment}
                        setNewCommitment={setNewCommitment}
                        hasSingleTeamRole={hasSingleTeamRole}
                        isUpdating={isUpdating}
                        onAddRole={handleAddRole}
                        onRemoveRole={handleRemoveRole}
                        onAddCommitment={handleAddCommitment}
                        onRemoveCommitment={handleRemoveCommitment}
                        onSaveTeamConfig={handleSaveTeamConfig}
                    />
                    <StepNavigation tabValue="portal" onNavigate={setCurrentTab} />
                </TabsContent>

                <TabsContent value="docentes" className="space-y-4">
                    <TabDocentes
                        teacherMembers={teacherMembers}
                        isLoadingTeachers={isLoadingTeachers}
                        isUpdatingTeachers={isUpdatingTeachers}
                        teacherEmail={teacherEmail}
                        setTeacherEmail={setTeacherEmail}
                        teacherRole={teacherRole}
                        teacherPermissions={teacherPermissions}
                        setTeacherPermissions={setTeacherPermissions}
                        onTeacherRoleChange={handleTeacherRoleChange}
                        onAddTeacherMember={handleAddTeacherMember}
                        onRevokeTeacherMember={handleRevokeTeacherMember}
                        onRefreshTeacherMembers={refreshTeacherMembers}
                    />
                    <StepNavigation tabValue="docentes" onNavigate={setCurrentTab} />
                </TabsContent>

                <TabsContent value="puntuacion" className="space-y-4">
                    <TabPuntuacion
                        ligaId={ligaId}
                        config={config}
                        setConfig={setConfig}
                        matchRoleSchema={matchRoleSchema}
                        schemaLocked={schemaLocked}
                        rolesPerMatch={rolesPerMatch}
                        isUpdating={isUpdating}
                        isUpdatingMatchSchema={isUpdatingMatchSchema}
                        readSlotCode={readSlotCode}
                        onRolesPerMatchChange={handleRolesPerMatchChange}
                        onAuxRoleChange={handleAuxRoleChange}
                        onSaveMatchRoleSchema={handleSaveMatchRoleSchema}
                        onLockMatchRoleSchema={handleLockMatchRoleSchema}
                        onUnlockMatchRoleSchema={handleUnlockMatchRoleSchema}
                        onUpdateScoring={handleUpdateScoring}
                    />
                    <StepNavigation tabValue="puntuacion" onNavigate={setCurrentTab} />
                </TabsContent>

                <TabsContent value="liga" className="space-y-4">
                    <TabLiga
                        liga={liga}
                        jornadasDisponibles={jornadasDisponibles}
                        equiposDisponibles={equiposDisponibles}
                        statsJornadaId={statsJornadaId}
                        setStatsJornadaId={setStatsJornadaId}
                        statsEquipoId={statsEquipoId}
                        setStatsEquipoId={setStatsEquipoId}
                        isExportingStats={isExportingStats}
                        isUpdating={isUpdating}
                        onExportStats={handleExportStats}
                        onDeleteLiga={handleDeleteLiga}
                    />
                    <StepNavigation tabValue="liga" onNavigate={setCurrentTab} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
