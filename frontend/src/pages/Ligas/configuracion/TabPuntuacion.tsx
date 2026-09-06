/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Pestaña «Puntuación»: formato de partido (roles puntuables), sistema de
 * puntuación deportiva/educativa y nota sobre el calendario automático.
 * Extraída de ConfiguracionLiga.tsx sin cambios; el estado vive en el padre.
 */
import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MatchRoleSchema, MatchRoleSlotKey } from '@/types/liga';
import {
    MATCH_ROLE_OPTIONS,
    SETTINGS_HEADER_CLASSNAME,
    SETTINGS_PANEL_CLASSNAME,
    SLOT_KEYS_BY_FORMAT,
    type LigaConfigForm,
} from './constants';

interface TabPuntuacionProps {
    ligaId: number;
    config: LigaConfigForm;
    setConfig: Dispatch<SetStateAction<LigaConfigForm>>;
    matchRoleSchema: MatchRoleSchema;
    schemaLocked: boolean;
    rolesPerMatch: 3 | 4 | 5;
    isUpdating: boolean;
    isUpdatingMatchSchema: boolean;
    readSlotCode: (slotKey: MatchRoleSlotKey) => string;
    onRolesPerMatchChange: (target: 3 | 4 | 5) => void;
    onAuxRoleChange: (slotKey: 'slot_3' | 'slot_4' | 'slot_5', roleCode: string) => void;
    onSaveMatchRoleSchema: () => void;
    onLockMatchRoleSchema: () => void;
    onUnlockMatchRoleSchema: () => void;
    onUpdateScoring: () => void;
}

export function TabPuntuacion({
    ligaId,
    config,
    setConfig,
    matchRoleSchema,
    schemaLocked,
    rolesPerMatch,
    isUpdating,
    isUpdatingMatchSchema,
    readSlotCode,
    onRolesPerMatchChange,
    onAuxRoleChange,
    onSaveMatchRoleSchema,
    onLockMatchRoleSchema,
    onUnlockMatchRoleSchema,
    onUpdateScoring,
}: TabPuntuacionProps) {
    return (
        <>
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
                    <div className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
                        <div className="flex flex-wrap gap-2">
                            {[3, 4, 5].map((size) => (
                                <Button
                                    key={size}
                                    type="button"
                                    variant={rolesPerMatch === size ? 'default' : 'outline'}
                                    disabled={schemaLocked}
                                    onClick={() => onRolesPerMatchChange(size as 3 | 4 | 5)}
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
                            <div key={slotKey} className="space-y-1.5 rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-3">
                                <Label htmlFor={`match-role-${slotKey}`}>{slotKey.replace('_', ' ')}</Label>
                                <Select
                                    value={readSlotCode(slotKey)}
                                    onValueChange={(value) => onAuxRoleChange(slotKey, value)}
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

                    <div className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
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
                                onClick={onUnlockMatchRoleSchema}
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
                                onClick={onSaveMatchRoleSchema}
                                disabled={schemaLocked || isUpdatingMatchSchema}
                            >
                                Guardar formato
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onLockMatchRoleSchema}
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
                        <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
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

                        <div className="space-y-3 rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
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
                        <Button onClick={onUpdateScoring} disabled={isUpdating}>
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
                    <div className="rounded-lg border border-lme-border bg-[rgba(28,25,21,0.52)] p-4">
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-sub">
                            <li>Se necesitan al menos {rolesPerMatch} equipos para generar jornadas automaticas con este formato.</li>
                            <li>El esquema de roles activo se aplica a toda la liga una vez bloqueado.</li>
                            <li>El reparto de roles usa rotacion para igualar oportunidades de puntuacion.</li>
                        </ul>
                    </div>
                    <Button variant="outline" asChild>
                        <Link to={`/ligas/${ligaId}/jornadas`}>Ir a jornadas</Link>
                    </Button>
                </CardContent>
            </Card>
        </>
    );
}
