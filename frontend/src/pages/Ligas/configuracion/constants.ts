/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Constantes compartidas de la configuración de liga.

 */
import type { LucideIcon } from 'lucide-react';
import { Key, Settings, Trophy, UserPlus, Users } from 'lucide-react';
import type { MatchRoleSchema, MatchRoleSlotKey } from '@/types/liga';

export const DEFAULT_TEAM_ROLES = ['Capitan/a', 'Entrenador/a', 'Arbitro/a', 'Tutor/a de grada', 'Preparador/a fisico/a'];

export const DEFAULT_TEAM_COMMITMENTS: Record<string, string[]> = {
    'Capitan/a': ['Liderar con respeto', 'Dar ejemplo al equipo', 'Comunicar incidencias al profesorado'],
    'Entrenador/a': ['Organizar alineaciones', 'Gestionar cambios durante el partido', 'Fomentar juego limpio'],
    'Arbitro/a': ['Aplicar normas con imparcialidad', 'Mantener el control del encuentro', 'Explicar decisiones con calma'],
    'Tutor/a de grada': ['Promover animacion respetuosa', 'Evitar burlas o insultos', 'Cuidar el clima de convivencia'],
    'Preparador/a fisico/a': ['Coordinar calentamiento', 'Prevenir riesgos', 'Acompanhar la vuelta a la calma'],
};

export const MATCH_ROLE_OPTIONS = [
    { code: 'arbitro', label: 'Arbitro', scoring_category: 'arbitraje' },
    { code: 'grada_local', label: 'Tutor de grada local', scoring_category: 'grada' },
    { code: 'grada_visitante', label: 'Tutor de grada visitante', scoring_category: 'grada' },
    { code: 'staff_tecnico', label: 'Staff tecnico', scoring_category: 'staff' },
    { code: 'staff_tecnico_local', label: 'Staff tecnico local', scoring_category: 'staff' },
    { code: 'staff_tecnico_visitante', label: 'Staff tecnico visitante', scoring_category: 'staff' },
    { code: 'cronometrista', label: 'Cronometrista', scoring_category: 'staff' },
    { code: 'delegado', label: 'Delegado', scoring_category: 'staff' },
];

export const SLOT_KEYS_BY_FORMAT: Record<3 | 4 | 5, MatchRoleSlotKey[]> = {
    3: ['home_team', 'away_team', 'slot_3'],
    4: ['home_team', 'away_team', 'slot_3', 'slot_4'],
    5: ['home_team', 'away_team', 'slot_3', 'slot_4', 'slot_5'],
};

export const DEFAULT_MATCH_SCHEMA: MatchRoleSchema = {
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

export const cloneDefaultMatchSchema = (): MatchRoleSchema => ({
    ...DEFAULT_MATCH_SCHEMA,
    slots: DEFAULT_MATCH_SCHEMA.slots.map((slot) => ({ ...slot })),
    rules: DEFAULT_MATCH_SCHEMA.rules.map((rule) => ({ ...rule })),
});

export const SETTINGS_PANEL_CLASSNAME = 'border-lme-border/90 bg-[rgba(30,27,22,0.74)] shadow-[0_18px_40px_rgba(10,9,7,0.18)]';
export const SETTINGS_HEADER_CLASSNAME = 'border-b border-lme-border/70';

export const TAB_SECTIONS = [
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

export type TabValue = (typeof TAB_SECTIONS)[number]['value'];

export const TAB_META: Record<TabValue, { icon: LucideIcon; activeClass: string; iconClass: string }> = {
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

/** Formulario de configuración de liga (subconjunto editable de liga.config) */
export interface LigaConfigForm {
    win_points: number;
    draw_points: number;
    loss_points: number;
    arbitro_points: number;
    grada_max_points: number;
    grada_mid_points: number;
    submission_language: string;
    allow_logo_editing: boolean;
}
