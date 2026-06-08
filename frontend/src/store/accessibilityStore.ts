/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Accessibility Store - Manages user accessibility preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AccessibilityState {
    // Language preference (synced with i18n)
    language: 'es' | 'gl' | 'en';

    // Visual accessibility
    highContrast: boolean;
    fontSize: 'normal' | 'large' | 'xlarge';

    // High visibility mode for severe low vision
    highVisibilityMode: boolean;
    strokeWidth: 'normal' | 'thick' | 'extra';

    // Auditory accessibility
    visualAlerts: boolean;

    // Motion preferences
    reduceMotion: boolean;

    // Actions
    setLanguage: (lang: 'es' | 'gl' | 'en') => void;
    toggleHighContrast: () => void;
    setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
    toggleVisualAlerts: () => void;
    toggleReduceMotion: () => void;
    toggleHighVisibilityMode: () => void;
    setStrokeWidth: (width: 'normal' | 'thick' | 'extra') => void;
    resetAccessibility: () => void;
}

// Font size multipliers
export const fontSizeMultipliers = {
    normal: 1,
    large: 1.25,
    xlarge: 1.5,
} as const;

// Stroke width values (pixels)
export const strokeWidthValues = {
    normal: 3,
    thick: 6,
    extra: 10,
} as const;

const defaultVisualAccessibilityState = {
    highContrast: false,
    fontSize: 'normal' as const,
    highVisibilityMode: false,
    strokeWidth: 'normal' as const,
    visualAlerts: false,
    reduceMotion: false,
};

export const useAccessibilityStore = create<AccessibilityState>()(
    persist(
        (set) => ({
            // Defaults
            language: 'es',
            ...defaultVisualAccessibilityState,

            setLanguage: (lang) => set({ language: lang }),

            toggleHighContrast: () => set((state) => ({
                highContrast: !state.highContrast
            })),

            setFontSize: (size) => set({ fontSize: size }),

            toggleVisualAlerts: () => set((state) => ({
                visualAlerts: !state.visualAlerts
            })),

            toggleReduceMotion: () => set((state) => ({
                reduceMotion: !state.reduceMotion
            })),

            toggleHighVisibilityMode: () => set((state) => {
                const newMode = !state.highVisibilityMode;
                // When enabling high visibility, also enable high contrast and large font
                if (newMode) {
                    return {
                        highVisibilityMode: true,
                        highContrast: true,
                        fontSize: 'xlarge',
                        strokeWidth: 'extra',
                    };
                }
                return {
                    highVisibilityMode: false,
                    highContrast: false,
                    fontSize: 'normal',
                    strokeWidth: 'normal',
                };
            }),

            setStrokeWidth: (width) => set({ strokeWidth: width }),

            resetAccessibility: () => set((state) => ({
                ...state,
                ...defaultVisualAccessibilityState,
            })),
        }),
        {
            name: 'liga-edumind-accessibility',
        }
    )
);
