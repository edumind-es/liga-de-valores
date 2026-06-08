/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Visual Alert - Provides visual feedback for notifications (hearing accessibility)
 */

import { useAccessibilityStore } from '@/store/accessibilityStore';

interface VisualAlertProps {
    show: boolean;
    type?: 'info' | 'success' | 'warning' | 'error';
}

const colorMap = {
    info: 'rgba(61, 218, 215, 0.3)',     // mint
    success: 'rgba(34, 197, 94, 0.3)',   // green
    warning: 'rgba(234, 179, 8, 0.3)',   // yellow
    error: 'rgba(239, 68, 68, 0.3)',     // red
};

export default function VisualAlert({ show, type = 'info' }: VisualAlertProps) {
    const { visualAlerts, reduceMotion } = useAccessibilityStore();
    if (!visualAlerts || !show) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{
                backgroundColor: colorMap[type],
                animation: reduceMotion ? 'none' : 'a11y-flash 1s ease-out',
            }}
            role="alert"
            aria-live="polite"
            aria-label="Visual notification"
        />
    );
}
