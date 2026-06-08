/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * i18n Configuration for Liga EDUmind
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import es from './locales/es.json';
import gl from './locales/gl.json';
import en from './locales/en.json';

// Language metadata for the UI
export const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'gl', name: 'Galego', flag: '🏴󠁥󠁳󠁧󠁡󠁿' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

i18n
    // Detect user language from browser
    .use(LanguageDetector)
    // Pass i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18n
    .init({
        resources: {
            es: { translation: es },
            gl: { translation: gl },
            en: { translation: en },
        },
        fallbackLng: 'es',
        supportedLngs: ['es', 'gl', 'en'],

        // Detection options
        detection: {
            // Order of language detection methods
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Cache user language preference
            caches: ['localStorage'],
            // localStorage key
            lookupLocalStorage: 'liga_edumind_language',
        },

        interpolation: {
            // React already escapes values
            escapeValue: false,
        },

        // Return key if translation is missing (helps debugging)
        returnEmptyString: false,
    });

export default i18n;
