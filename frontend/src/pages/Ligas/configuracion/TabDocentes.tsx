/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Pestaña «Docentes»: asociación de docentes colaboradores con permisos.
 * Extraída de ConfiguracionLiga.tsx sin cambios; el estado vive en el padre.
 */
import type { Dispatch, SetStateAction } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { LeagueTeacherMember, LeagueTeacherMemberUpsert } from '@/types/liga';
import { SETTINGS_HEADER_CLASSNAME, SETTINGS_PANEL_CLASSNAME } from './constants';

export interface TeacherPermissionsForm {
    can_view_league: boolean;
    can_view_matches: boolean;
    can_open_matches: boolean;
    can_validate_matches: boolean;
    can_view_results: boolean;
    can_manage_members: boolean;
}

interface TabDocentesProps {
    teacherMembers: LeagueTeacherMember[];
    isLoadingTeachers: boolean;
    isUpdatingTeachers: boolean;
    teacherEmail: string;
    setTeacherEmail: (value: string) => void;
    teacherRole: LeagueTeacherMemberUpsert['role'];
    teacherPermissions: TeacherPermissionsForm;
    setTeacherPermissions: Dispatch<SetStateAction<TeacherPermissionsForm>>;
    onTeacherRoleChange: (role: LeagueTeacherMemberUpsert['role']) => void;
    onAddTeacherMember: () => void;
    onRevokeTeacherMember: (member: LeagueTeacherMember) => void;
    onRefreshTeacherMembers: () => void;
}

export function TabDocentes({
    teacherMembers,
    isLoadingTeachers,
    isUpdatingTeachers,
    teacherEmail,
    setTeacherEmail,
    teacherRole,
    teacherPermissions,
    setTeacherPermissions,
    onTeacherRoleChange,
    onAddTeacherMember,
    onRevokeTeacherMember,
    onRefreshTeacherMembers,
}: TabDocentesProps) {
    return (
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
                <div className="rounded-lg border border-lme-border bg-[rgba(30,27,22,0.52)] p-4">
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
                                        onAddTeacherMember();
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="teacher-role">Rol</Label>
                            <Select value={teacherRole} onValueChange={(value) => onTeacherRoleChange(value as LeagueTeacherMemberUpsert['role'])}>
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
                        <Button onClick={onAddTeacherMember} disabled={isUpdatingTeachers} className="lg:self-end">
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
                            <div key={field} className="flex items-center justify-between gap-3 rounded-md border border-lme-border bg-[rgba(24,22,18,0.54)] px-3 py-2">
                                <Label htmlFor={`teacher-permission-${field}`} className="text-sm text-ink">
                                    {label}
                                </Label>
                                <Switch
                                    id={`teacher-permission-${field}`}
                                    checked={Boolean(teacherPermissions[field as keyof TeacherPermissionsForm])}
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
                            onClick={onRefreshTeacherMembers}
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
                        <div className="rounded-lg border border-dashed border-lme-border bg-[rgba(28,25,21,0.45)] p-6 text-sm text-sub">
                            Todavia no hay docentes asociados a esta liga.
                        </div>
                    ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {teacherMembers.map((member) => (
                                <div key={member.id} className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.58)] p-4">
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
                                            onClick={() => onRevokeTeacherMember(member)}
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
    );
}
