/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Pestaña «Portal de equipos»: roles, compromisos y permisos del alumnado.
 * Extraída de ConfiguracionLiga.tsx sin cambios; el estado vive en el padre.
 */
import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { Info, Plus, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    SETTINGS_HEADER_CLASSNAME,
    SETTINGS_PANEL_CLASSNAME,
    type LigaConfigForm,
} from './constants';

interface TabPortalProps {
    ligaId: number;
    config: LigaConfigForm;
    setConfig: Dispatch<SetStateAction<LigaConfigForm>>;
    teamRoles: string[];
    teamCommitments: Record<string, string[]>;
    selectedRoleForCommitments: string;
    setSelectedRoleForCommitments: (role: string) => void;
    newRole: string;
    setNewRole: (value: string) => void;
    newCommitment: string;
    setNewCommitment: (value: string) => void;
    hasSingleTeamRole: boolean;
    isUpdating: boolean;
    onAddRole: () => void;
    onRemoveRole: (role: string) => void;
    onAddCommitment: () => void;
    onRemoveCommitment: (role: string, index: number) => void;
    onSaveTeamConfig: () => void;
}

export function TabPortal({
    ligaId,
    config,
    setConfig,
    teamRoles,
    teamCommitments,
    selectedRoleForCommitments,
    setSelectedRoleForCommitments,
    newRole,
    setNewRole,
    newCommitment,
    setNewCommitment,
    hasSingleTeamRole,
    isUpdating,
    onAddRole,
    onRemoveRole,
    onAddCommitment,
    onRemoveCommitment,
    onSaveTeamConfig,
}: TabPortalProps) {
    return (
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
                <div className="rounded-lg border border-lme-border bg-[rgba(30,27,22,0.52)] p-4">
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

                <div className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.58)] p-4 flex flex-wrap gap-3 items-start justify-between">
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
                    <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
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
                                            onAddRole();
                                        }
                                    }}
                                />
                                <Button variant="secondary" onClick={onAddRole}>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Anadir
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {teamRoles.map((role) => (
                                <div key={role} className="rounded-md border border-lme-border bg-[rgba(32,28,23,0.68)] px-3 py-2 flex items-center justify-between gap-2">
                                    <span className="text-sm text-ink">{role}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => onRemoveRole(role)}
                                        disabled={hasSingleTeamRole}
                                        aria-label={`Eliminar rol ${role}`}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
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
                                                onAddCommitment();
                                            }
                                        }}
                                    />
                                    <Button variant="secondary" onClick={onAddCommitment}>
                                        <Plus className="h-4 w-4 mr-1.5" />
                                        Anadir
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {(teamCommitments[selectedRoleForCommitments] || []).length === 0 ? (
                                        <p className="text-xs text-sub">Este rol todavia no tiene compromisos definidos.</p>
                                    ) : (
                                        (teamCommitments[selectedRoleForCommitments] || []).map((commitment, index) => (
                                            <div key={`${selectedRoleForCommitments}-${index}`} className="rounded-md border border-lme-border bg-[rgba(32,28,23,0.68)] px-3 py-2 flex items-start justify-between gap-2">
                                                <p className="text-sm text-ink">{commitment}</p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 mt-0.5"
                                                    onClick={() => onRemoveCommitment(selectedRoleForCommitments, index)}
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
                    <Button onClick={onSaveTeamConfig} disabled={isUpdating}>
                        Guardar portal de equipos
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
