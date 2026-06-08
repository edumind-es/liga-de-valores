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

import * as React from 'react';
import { useAccessibilityStore } from '@/store/accessibilityStore';
import { playWhistle as playWhistleSound } from '@/lib/audio';

interface WhistleButtonProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'floating';
}

/**
 * Whistle button component for referees to signal during matches.
 * Emits a whistle sound when pressed (shared audio asset).
 * Includes visual flash for users with hearing impairments (when enabled).
 */
export function WhistleButton({ className = '', size = 'md', variant = 'default' }: WhistleButtonProps) {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const { visualAlerts } = useAccessibilityStore();

    const sizeClasses = {
        sm: 'w-10 h-10 text-lg',
        md: 'w-14 h-14 text-2xl',
        lg: 'w-20 h-20 text-4xl'
    };

    // Visual alert for accessibility (screen flash)
    const triggerVisualAlert = () => {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 200, 0, 0.4);
            z-index: 9999;
            pointer-events: none;
            animation: whistle-flash 0.4s ease-out forwards;
        `;

        // Add animation keyframes if not exists
        if (!document.getElementById('whistle-flash-animation')) {
            const style = document.createElement('style');
            style.id = 'whistle-flash-animation';
            style.textContent = `
                @keyframes whistle-flash {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    };

    const playWhistle = () => {
        if (isPlaying) return;

        setIsPlaying(true);
        playWhistleSound();

        // Visual feedback for accessibility
        if (visualAlerts) {
            triggerVisualAlert();
        }

        // Reset state after sound finishes
        setTimeout(() => {
            setIsPlaying(false);
        }, 600);
    };

    const baseClasses = variant === 'floating'
        ? 'fixed bottom-6 right-6 shadow-xl z-50'
        : '';

    return (
        <button
            onClick={playWhistle}
            disabled={isPlaying}
            className={`
                ${sizeClasses[size]}
                ${baseClasses}
                rounded-full
                flex items-center justify-center
                bg-gradient-to-br from-yellow-400 to-orange-500
                hover:from-yellow-300 hover:to-orange-400
                active:from-yellow-500 active:to-orange-600
                text-white
                shadow-lg hover:shadow-xl
                transition-all duration-150
                transform hover:scale-105 active:scale-95
                ${isPlaying ? 'animate-pulse scale-110' : ''}
                disabled:cursor-not-allowed
                ${className}
            `.trim().replace(/\s+/g, ' ')}
            title="Pitar silbato"
            aria-label="Pitar silbato"
        >
            <span role="img" aria-hidden="true">
                📣
            </span>
        </button>
    );
}

export default WhistleButton;
