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

import type { CategoriaEvaluacion } from '@/types/criterioEvaluacion';
import type { MatchRoleSchema, MatchRoleSlot, MatchRoleSlotKey } from '@/types/liga';

type RolesPerMatch = 3 | 4 | 5;
type AuxiliarySlotKey = 'slot_3' | 'slot_4' | 'slot_5';

const DEFAULT_ROLES_PER_MATCH: RolesPerMatch = 4;

const DEFAULT_SLOT_META: Record<MatchRoleSlotKey, MatchRoleSlot> = {
    home_team: {
        slot_key: 'home_team',
        slot_order: 1,
        role_code: 'equipo_local',
        role_label: 'Equipo local',
        scoring_category: 'competitive',
        is_required: true,
        evaluation_enabled: true,
    },
    away_team: {
        slot_key: 'away_team',
        slot_order: 2,
        role_code: 'equipo_visitante',
        role_label: 'Equipo visitante',
        scoring_category: 'competitive',
        is_required: true,
        evaluation_enabled: true,
    },
    slot_3: {
        slot_key: 'slot_3',
        slot_order: 3,
        role_code: 'arbitro',
        role_label: 'Arbitro',
        scoring_category: 'arbitraje',
        is_required: true,
        evaluation_enabled: true,
    },
    slot_4: {
        slot_key: 'slot_4',
        slot_order: 4,
        role_code: 'grada_local',
        role_label: 'Tutor de grada local',
        scoring_category: 'grada',
        is_required: true,
        evaluation_enabled: true,
    },
    slot_5: {
        slot_key: 'slot_5',
        slot_order: 5,
        role_code: 'grada_visitante',
        role_label: 'Tutor de grada visitante',
        scoring_category: 'grada',
        is_required: true,
        evaluation_enabled: true,
    },
};

const AUXILIARY_SLOT_KEYS_BY_FORMAT: Record<RolesPerMatch, AuxiliarySlotKey[]> = {
    3: ['slot_3'],
    4: ['slot_3', 'slot_4'],
    5: ['slot_3', 'slot_4', 'slot_5'],
};

export function getRolesPerMatch(schema?: MatchRoleSchema | null): RolesPerMatch {
    if (schema?.roles_per_match === 3 || schema?.roles_per_match === 4 || schema?.roles_per_match === 5) {
        return schema.roles_per_match;
    }
    return DEFAULT_ROLES_PER_MATCH;
}

export function getActiveAuxiliarySlots(schema?: MatchRoleSchema | null): AuxiliarySlotKey[] {
    return AUXILIARY_SLOT_KEYS_BY_FORMAT[getRolesPerMatch(schema)];
}

export function getSlotRoleMeta(schema: MatchRoleSchema | null | undefined, slotKey: MatchRoleSlotKey): MatchRoleSlot {
    const fromSchema = schema?.slots?.find((slot) => slot.slot_key === slotKey);
    if (!fromSchema) {
        return DEFAULT_SLOT_META[slotKey];
    }

    return {
        ...DEFAULT_SLOT_META[slotKey],
        ...fromSchema,
        role_label: (fromSchema.role_label || DEFAULT_SLOT_META[slotKey].role_label).trim(),
    };
}

export function getSlotRoleLabel(
    schema: MatchRoleSchema | null | undefined,
    slotKey: MatchRoleSlotKey,
    fallback?: string
): string {
    const label = getSlotRoleMeta(schema, slotKey).role_label;
    if (label) return label;
    return fallback || DEFAULT_SLOT_META[slotKey].role_label;
}

export function getSlotRoleCode(schema: MatchRoleSchema | null | undefined, slotKey: MatchRoleSlotKey): string {
    return getSlotRoleMeta(schema, slotKey).role_code;
}

export function getCategoryDisplayLabel(
    categoria: CategoriaEvaluacion,
    schema: MatchRoleSchema | null | undefined
): string {
    if (categoria === 'arbitro') return getSlotRoleLabel(schema, 'slot_3', 'Arbitro');
    if (categoria === 'grada_local') return getSlotRoleLabel(schema, 'slot_4', 'Rol local de apoyo');
    if (categoria === 'grada_visitante') return getSlotRoleLabel(schema, 'slot_5', 'Rol visitante de apoyo');
    if (categoria === 'jugador') return 'Jugador';
    return 'General';
}

export function toNoneRoleLabel(roleLabel: string): string {
    if (!roleLabel.trim()) return 'rol';
    const first = roleLabel.charAt(0).toLowerCase();
    return `${first}${roleLabel.slice(1)}`;
}
