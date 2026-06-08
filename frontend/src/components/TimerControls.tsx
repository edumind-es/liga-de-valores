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

interface TimerControlsProps {
    tiempoRestante: number; // in seconds
    onUpdate: (newTime: number) => void;
    onTimerEnd?: () => void;
    defaultTime?: number; // in seconds, used by reset button
}

export function TimerControls({ tiempoRestante, onUpdate, onTimerEnd, defaultTime }: TimerControlsProps) {
    const [isRunning, setIsRunning] = React.useState(false);
    const [lastTick, setLastTick] = React.useState<number>(0);
    const [showAdjust, setShowAdjust] = React.useState(false);

    // Numeric editing state
    const [isEditing, setIsEditing] = React.useState(false);
    const [editMinutes, setEditMinutes] = React.useState('');
    const [editSeconds, setEditSeconds] = React.useState('');
    const minutesInputRef = React.useRef<HTMLInputElement>(null);

    const { visualAlerts } = useAccessibilityStore();

    // Visual alert for accessibility (screen flash)
    const triggerVisualAlert = React.useCallback(() => {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 0, 0.3);
            z-index: 9999;
            pointer-events: none;
            animation: flash-fade 0.3s ease-out forwards;
        `;

        // Add animation keyframes if not exists
        if (!document.getElementById('flash-animation')) {
            const style = document.createElement('style');
            style.id = 'flash-animation';
            style.textContent = `
                @keyframes flash-fade {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }, []);

    const playWhistle = React.useCallback(() => {
        playWhistleSound();
        if (visualAlerts) {
            triggerVisualAlert();
        }
    }, [visualAlerts, triggerVisualAlert]);

    React.useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - lastTick) / 1000);

            if (elapsed >= 1) {
                const newTime = Math.max(0, tiempoRestante - elapsed);
                onUpdate(newTime);
                setLastTick(now);

                if (newTime === 0) {
                    setIsRunning(false);
                    playWhistle();
                    onTimerEnd?.();
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isRunning, tiempoRestante, lastTick, onUpdate, onTimerEnd, playWhistle]);

    // Focus input when entering edit mode
    React.useEffect(() => {
        if (isEditing && minutesInputRef.current) {
            minutesInputRef.current.focus();
            minutesInputRef.current.select();
        }
    }, [isEditing]);

    const toggleTimer = () => {
        const nextRunning = !isRunning;
        if (nextRunning) {
            setLastTick(Date.now());
            playWhistle();
        }
        setIsRunning(nextRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        onUpdate(defaultTime ?? 45 * 60);
        setLastTick(Date.now());
    };

    const adjustTime = (minutes: number) => {
        const newTime = Math.max(0, tiempoRestante + (minutes * 60));
        onUpdate(newTime);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const sanitizeNumericInput = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength);

    // Start editing mode
    const startEditing = () => {
        if (isRunning) return; // Don't allow editing while running
        const safeTime = Number.isFinite(tiempoRestante) ? Math.max(0, tiempoRestante) : 0;
        setEditMinutes(String(Math.floor(safeTime / 60)));
        setEditSeconds(String(safeTime % 60).padStart(2, '0'));
        setIsEditing(true);
    };

    // Confirm edit and update time
    const confirmEdit = () => {
        const mins = Math.max(0, parseInt(editMinutes) || 0);
        const secs = Math.min(59, Math.max(0, parseInt(editSeconds) || 0));
        const newTime = mins * 60 + secs;
        onUpdate(Math.max(0, newTime));
        setIsEditing(false);
    };

    // Cancel editing
    const cancelEdit = () => {
        setIsEditing(false);
    };

    // Handle keyboard events in edit mode
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            confirmEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const timeColor = tiempoRestante < 60 ? 'text-red-400' : tiempoRestante < 180 ? 'text-yellow-400' : 'text-ink';

    return (
        <div className="text-center p-4 rounded-lg bg-paper/10 border border-paper/20 mb-6">
            <div className="text-sm text-sub mb-2">Tiempo de Partido</div>

            {/* Time Display / Edit Mode */}
            {isEditing ? (
                <div className="flex items-center justify-center gap-1 mb-3">
                    <input
                        ref={minutesInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(sanitizeNumericInput(e.target.value, 3))}
                        onKeyDown={handleKeyDown}
                        className="w-20 text-4xl font-bold text-center bg-paper/20 border border-mint/50 rounded px-2 py-1 text-ink placeholder:text-sub focus:outline-none focus:border-mint"
                        placeholder="min"
                    />
                    <span className="text-4xl font-bold text-ink">:</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editSeconds}
                        onChange={(e) => setEditSeconds(sanitizeNumericInput(e.target.value, 2))}
                        onKeyDown={handleKeyDown}
                        className="w-16 text-4xl font-bold text-center bg-paper/20 border border-mint/50 rounded px-2 py-1 text-ink placeholder:text-sub focus:outline-none focus:border-mint"
                        placeholder="seg"
                    />
                    <div className="flex flex-col gap-1 ml-2">
                        <button
                            onClick={confirmEdit}
                            className="px-2 py-1 text-xs rounded bg-mint/30 text-mint hover:bg-mint/50 transition-colors"
                        >
                            ✓
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="px-2 py-1 text-xs rounded bg-red-500/30 text-red-400 hover:bg-red-500/50 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className={`text-5xl font-bold ${timeColor} mb-3 cursor-pointer hover:opacity-80 transition-opacity ${isRunning ? 'cursor-not-allowed' : ''}`}
                    onClick={startEditing}
                    title={isRunning ? 'Pausa el timer para editar' : 'Click para editar tiempo'}
                >
                    {formatTime(tiempoRestante)}
                </div>
            )}

            {/* Time Adjustment Controls */}
            <div className="mb-3">
                <button
                    onClick={() => setShowAdjust(!showAdjust)}
                    className="text-xs text-sub hover:text-mint transition-colors"
                >
                    {showAdjust ? '▼' : '▶'} Ajustar tiempo
                </button>

                {showAdjust && (
                    <div className="flex gap-1 justify-center mt-2 flex-wrap">
                        <button
                            onClick={() => adjustTime(-5)}
                            disabled={isRunning}
                            className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            -5min
                        </button>
                        <button
                            onClick={() => adjustTime(-1)}
                            disabled={isRunning}
                            className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            -1min
                        </button>
                        <button
                            onClick={() => adjustTime(1)}
                            disabled={isRunning}
                            className="px-2 py-1 text-xs rounded bg-mint/20 text-mint hover:bg-mint/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            +1min
                        </button>
                        <button
                            onClick={() => adjustTime(5)}
                            disabled={isRunning}
                            className="px-2 py-1 text-xs rounded bg-mint/20 text-mint hover:bg-mint/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            +5min
                        </button>
                        <button
                            onClick={() => adjustTime(10)}
                            disabled={isRunning}
                            className="px-2 py-1 text-xs rounded bg-mint/20 text-mint hover:bg-mint/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            +10min
                        </button>
                    </div>
                )}
            </div>

            {/* Main Controls */}
            <div className="flex gap-2 justify-center">
                <button
                    onClick={toggleTimer}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${isRunning
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-mint/20 text-mint hover:bg-mint/30'
                        }`}
                >
                    {isRunning ? '⏸ Pausar' : '▶ Iniciar'}
                </button>
                <button
                    onClick={resetTimer}
                    className="px-4 py-2 rounded-lg bg-paper/20 text-sub hover:bg-paper/30 font-semibold text-sm transition-all"
                >
                    🔄 Reiniciar
                </button>
            </div>
        </div>
    );
}
