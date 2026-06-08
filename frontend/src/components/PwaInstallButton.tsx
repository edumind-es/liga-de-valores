/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Botón de instalación PWA — captura beforeinstallprompt y ofrece
 * instalación nativa al alumno/docente. Solo aparece cuando el
 * navegador indica que la app puede instalarse y no está ya instalada.
 */

import { Download } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface PwaInstallButtonProps {
    className?: string;
    variant?: 'chip' | 'icon';
}

export function PwaInstallButton({ className = '', variant = 'chip' }: PwaInstallButtonProps) {
    const { canInstall, install } = usePwaInstall();

    if (!canInstall) return null;

    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={install}
                className={`inline-flex items-center justify-center rounded-lg p-2 text-[var(--lme-text-sub)] hover:text-[var(--lme-text-ink)] hover:bg-[var(--lme-border)] transition-colors ${className}`}
                title="Instalar Liga EDUmind como app"
                aria-label="Instalar como aplicación"
            >
                <Download className="h-5 w-5" />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={install}
            className={`status-chip status-chip--success justify-center ${className}`}
            aria-label="Instalar Liga EDUmind como aplicación"
        >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Instalar app</span>
        </button>
    );
}
