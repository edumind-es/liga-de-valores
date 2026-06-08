/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

export interface EquipoBasico {
    id: number;
    nombre: string;
    logo_url?: string;
}

export interface CruceFase {
    id: number;
    fase_id: number;
    equipo_a: EquipoBasico;
    equipo_b: EquipoBasico;
    orden: number;
    ganador_id?: number;
    estado: 'pendiente' | 'en_curso' | 'finalizado';
    created_at: string;
    partidos_ids: number[];
}

export interface FaseFinal {
    id: number;
    liga_id: number;
    nombre: string;
    num_partidos_por_cruce: number;
    asignar_roles_auto: boolean;
    estado: 'borrador' | 'activa' | 'finalizada';
    created_at: string;
    updated_at?: string;
    cruces: CruceFase[];
}

export interface FaseFinalCreate {
    nombre?: string;
    num_partidos_por_cruce?: number;
    asignar_roles_auto?: boolean;
}

export interface GenerarCrucesPayload {
    top_n: number;
    tipo_deporte_ids?: number[];
}
