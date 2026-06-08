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

export interface Liga {
    id: number;
    nombre: string;
    descripcion?: string;
    temporada?: string;
    activa: boolean;
    modo_competicion: 'unico_deporte' | 'multi_deporte';
    modo_evaluacion: 'clasico' | 'personalizado';
    usuario_id: number;
    created_at: string;
    updated_at?: string;
    public_pin?: string;
    email_fichas?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
    team_roles?: string[];
    team_commitments?: Record<string, string[]>;
    match_role_schema?: MatchRoleSchema;
}

export type MatchRoleSchemaStatus = 'draft' | 'locked' | 'deprecated';
export type MatchRoleSlotKey = 'home_team' | 'away_team' | 'slot_3' | 'slot_4' | 'slot_5';

export interface MatchRoleSlot {
    id?: number;
    slot_key: MatchRoleSlotKey;
    slot_order: number;
    role_code: string;
    role_label: string;
    scoring_category: string;
    is_required: boolean;
    evaluation_enabled: boolean;
}

export interface MatchRoleRule {
    id?: number;
    role_code: string;
    rule_code: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params_json: Record<string, any>;
}

export interface MatchRoleSchema {
    id?: number;
    liga_id?: number;
    version?: number;
    roles_per_match: 3 | 4 | 5;
    status?: MatchRoleSchemaStatus;
    locked_at?: string | null;
    created_at?: string;
    updated_at?: string | null;
    slots: MatchRoleSlot[];
    rules: MatchRoleRule[];
}

export interface LeagueTeacherPermissions {
    can_view_league?: boolean;
    can_view_matches?: boolean;
    can_open_matches?: boolean;
    can_validate_matches?: boolean;
    can_view_results?: boolean;
    can_manage_members?: boolean;
}

export interface LeagueTeacherMember {
    id: number;
    liga_id: number;
    user_id: number;
    user_codigo?: string | null;
    user_email?: string | null;
    role: 'collaborator_teacher' | 'substitute_teacher' | 'viewer_teacher' | string;
    status: 'active' | 'revoked' | 'pending' | 'expired' | string;
    can_view_league: boolean;
    can_view_matches: boolean;
    can_open_matches: boolean;
    can_validate_matches: boolean;
    can_view_results: boolean;
    can_manage_members: boolean;
    created_by?: number | null;
    revoked_by?: number | null;
    created_at: string;
    updated_at?: string | null;
    revoked_at?: string | null;
}

export interface LeagueTeacherMemberUpsert {
    user_id?: number;
    email?: string;
    role: 'collaborator_teacher' | 'substitute_teacher' | 'viewer_teacher';
    permissions?: LeagueTeacherPermissions;
}

export interface LigaWithStats extends Liga {
    total_equipos: number;
    total_jornadas: number;
    total_partidos: number;
    tipo_deporte?: {
        id: number;
        nombre: string;
    };
}

export interface CreateLigaData {
    nombre: string;
    descripcion?: string;
    temporada?: string;
    modo_competicion?: 'unico_deporte' | 'multi_deporte';
    modo_evaluacion?: 'clasico' | 'personalizado';
    email_fichas?: string;
    team_roles?: string[];
    team_commitments?: Record<string, string[]>;
    match_role_schema?: MatchRoleSchema;
}

export interface UpdateLigaData {
    nombre?: string;
    descripcion?: string;
    temporada?: string;
    activa?: boolean;
    modo_competicion?: 'unico_deporte' | 'multi_deporte';
    modo_evaluacion?: 'clasico' | 'personalizado';
    public_pin?: string;
    email_fichas?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
    team_roles?: string[];
    team_commitments?: Record<string, string[]>;
    match_role_schema?: MatchRoleSchema;
}

export interface Jornada {
    id: number;
    nombre: string;
    numero?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    liga_id: number;
}

export interface JornadaWithStats extends Jornada {
    total_partidos: number;
}

export interface JornadaCreate {
    nombre: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    numero?: number;
    liga_id: number;
}

export interface JornadaUpdate {
    nombre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    numero?: number;
}

export interface Equipo {
    id: number;
    nombre: string;
    logo_filename?: string;
    color_principal?: string;
    acceso_token?: string;
    liga_id: number;
    puntos_totales: number;
    ganados: number;
    empatados: number;
    perdidos: number;
    puntos_juego_limpio: number;
    puntos_arbitro: number;
    puntos_grada: number;
}

export interface EquipoCreate {
    nombre: string;
    color_principal?: string;
    liga_id: number;
}

export interface EquipoUpdate {
    nombre?: string;
    color_principal?: string;
}

export interface TipoDeporte {
    id: number;
    nombre: string;
    codigo: string;
    tipo_marcador: string;
    permite_empate?: boolean;
    icono?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
    descripcion?: string;
    vt_file?: string;
    logo_file?: string;
}

export interface PartidoCreate {
    liga_id: number;
    jornada_id?: number;
    tipo_deporte_id: number;
    equipo_local_id: number;
    equipo_visitante_id: number;
    arbitro_id?: number;
    tutor_grada_local_id?: number;
    tutor_grada_visitante_id?: number;
    fecha_hora?: string;
}

export interface PartidoUpdateMarcador {
    marcador: Record<string, unknown>;
    expected_version?: string;
}

export interface PartidoUpdateEvaluacion {
    puntos_juego_limpio_local?: number;
    puntos_juego_limpio_visitante?: number;
    arbitro_conocimiento?: number;
    arbitro_gestion?: number;
    arbitro_apoyo?: number;
    grada_animar_local?: number;
    grada_respeto_local?: number;
    grada_participacion_local?: number;
    grada_animar_visitante?: number;
    grada_respeto_visitante?: number;
    grada_participacion_visitante?: number;
    expected_version?: string;
}

export interface PartidoResponse {
    id: number;
    liga_id: number;
    jornada_id?: number;
    tipo_deporte_id: number;
    equipo_local_id: number;
    equipo_visitante_id: number;
    marcador: Record<string, unknown>;
    puntos_local: number;
    puntos_visitante: number;
    resultado?: string;
    finalizado: boolean;
    evaluacion_completa?: boolean;
    fecha_hora?: string;
    puntos_juego_limpio_local: number;
    puntos_juego_limpio_visitante: number;
    puntos_arbitro: number;
    puntos_grada_local: number;
    puntos_grada_visitante: number;
    arbitro_media?: number;
    marcador_version?: string;
    evaluacion_version?: string;
    pin?: string;
    pin_valid_until?: string;
}

export interface PartidoDetailed extends PartidoResponse {
    tipo_deporte: TipoDeporte;
    equipo_local: Equipo;
    equipo_visitante: Equipo;
    arbitro?: Equipo;
    tutor_grada_local?: Equipo;
    tutor_grada_visitante?: Equipo;
    marcador_local?: number;
    marcador_visitante?: number;
    // Evaluation fields
    arbitro_conocimiento?: number;
    arbitro_gestion?: number;
    arbitro_apoyo?: number;
    grada_animar_local?: number;
    grada_respeto_local?: number;
    grada_participacion_local?: number;
    grada_animar_visitante?: number;
    grada_respeto_visitante?: number;
    grada_participacion_visitante?: number;
}

export type LigaResponse = Liga;

export interface Marcador {
    goles_local?: number;
    goles_visitante?: number;
    sets_local?: number;
    sets_visitante?: number;
    [key: string]: unknown;
}

export interface ClasificacionItem {
    equipo_id: number;
    equipo_nombre: string;
    posicion: number;
    partidos_jugados: number;
    ganados: number;
    empatados: number;
    perdidos: number;
    puntos_deportivos: number;
    puntos_educativos_total: number;
    puntos_totales: number;
    puntos_juego_limpio: number;
    puntos_arbitro: number;
    puntos_grada: number;
}

export type PartidoNotaTipo = 'observacion' | 'incidencia' | 'evidencia';
export type PartidoNotaOrigen = 'publico' | 'docente';
export type PartidoNotaEstado = 'pendiente' | 'aprobada' | 'rechazada';

export interface PartidoNota {
    id: number;
    partido_id: number;
    contenido: string;
    tipo: PartidoNotaTipo;
    origen: PartidoNotaOrigen;
    estado: PartidoNotaEstado;
    created_at: string;
    aprobada_at?: string;
}
