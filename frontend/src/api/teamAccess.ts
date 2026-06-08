/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface TeamPublicInfo {
    equipo_id: number;
    equipo_nombre: string;
    equipo_color: string | null;
    liga_id: number;
    liga_nombre: string;
    roles: string[];
    commitments: Record<string, string[]>;
    allow_logo_editing: boolean;
}

export interface TeamJoinResponse {
    message: string;
    equipo: string;
    rol: string;
}

export interface TeamLogoProposalResponse {
    message: string;
    equipo: string;
    pending_id: number;
    logo_included: boolean;
}

export const teamAccessApi = {
    /**
     * Get team info by access token
     */
    getTeamByToken: async (token: string): Promise<TeamPublicInfo> => {
        const response = await fetch(`${API_URL}/public/team/${token}`);
        if (!response.ok) {
            throw new Error('Equipo no encontrado');
        }
        return response.json();
    },

    /**
     * Submit team join request with role and commitments
     */
    joinTeam: async (
        token: string,
        nombreEstudiante: string,
        rol: string,
        compromisosAceptados: string[],
        logoDataUrl?: string | null
    ): Promise<TeamJoinResponse> => {
        const formData = new FormData();
        formData.append('nombre_estudiante', nombreEstudiante);
        formData.append('rol', rol);
        formData.append('compromisos_aceptados', JSON.stringify(compromisosAceptados));

        // Add logo if provided
        if (logoDataUrl) {
            formData.append('logo_data_url', logoDataUrl);
        }

        const response = await fetch(`${API_URL}/public/team/${token}/join`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al enviar solicitud');
        }

        return response.json();
    },

    submitLogoProposal: async (
        token: string,
        logoDataUrl: string
    ): Promise<TeamLogoProposalResponse> => {
        const formData = new FormData();
        formData.append('logo_data_url', logoDataUrl);

        const response = await fetch(`${API_URL}/public/team/${token}/logo`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al enviar logo');
        }

        return response.json();
    }
};
