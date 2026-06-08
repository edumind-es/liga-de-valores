/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Accessibility Menu - Language selector and accessibility options
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Eye, Type, Bell, Zap, RotateCcw } from 'lucide-react';
import { useAccessibilityStore, fontSizeMultipliers } from '@/store/accessibilityStore';
import { languages, type LanguageCode } from '@/i18n';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function AccessibilityMenu() {
    const { t, i18n } = useTranslation();
    const {
        language,
        setLanguage,
        highContrast,
        toggleHighContrast,
        fontSize,
        setFontSize,
        highVisibilityMode,
        toggleHighVisibilityMode,
        visualAlerts,
        toggleVisualAlerts,
        reduceMotion,
        toggleReduceMotion,
        resetAccessibility,
    } = useAccessibilityStore();

    const isDefaultView =
        !highContrast &&
        !highVisibilityMode &&
        !visualAlerts &&
        !reduceMotion &&
        fontSize === 'normal';

    // Sync language with i18n when store changes
    useEffect(() => {
        if (i18n.language !== language) {
            i18n.changeLanguage(language);
        }
    }, [language, i18n]);

    // Apply accessibility classes to document
    useEffect(() => {
        const root = document.documentElement;

        // High contrast
        if (highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        if (highVisibilityMode) {
            root.classList.add('high-visibility');
        } else {
            root.classList.remove('high-visibility');
        }

        // Font size
        root.style.setProperty('--a11y-font-scale', String(fontSizeMultipliers[fontSize]));

        // Reduce motion
        if (reduceMotion) {
            root.classList.add('reduce-motion');
        } else {
            root.classList.remove('reduce-motion');
        }
    }, [fontSize, highContrast, highVisibilityMode, reduceMotion]);

    const handleLanguageChange = (lang: LanguageCode) => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    const currentLang = languages.find(l => l.code === language);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="a11y-menu-trigger flex items-center gap-2 text-sub hover:text-ink hover:bg-white/5"
                    aria-label={t('accessibility.menu')}
                >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{currentLang?.flag}</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-56 bg-[rgba(11,20,37,0.98)] border-lme-border backdrop-blur-xl"
            >
                {/* Language Selection */}
                <DropdownMenuLabel className="text-sub text-xs uppercase tracking-wider">
                    {t('accessibility.language')}
                </DropdownMenuLabel>
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`cursor-pointer ${language === lang.code ? 'bg-mint/10 text-mint' : 'text-ink'}`}
                    >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                        {language === lang.code && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-lme-border" />

                {/* Accessibility Options */}
                <DropdownMenuLabel className="text-sub text-xs uppercase tracking-wider">
                    {t('accessibility.menu')}
                </DropdownMenuLabel>

                {/* High Contrast */}
                <DropdownMenuCheckboxItem
                    checked={highContrast}
                    onCheckedChange={toggleHighContrast}
                    className="text-ink cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t('accessibility.highContrast')}
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                    checked={highVisibilityMode}
                    onCheckedChange={toggleHighVisibilityMode}
                    className="text-ink cursor-pointer"
                >
                    <Type className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t('accessibility.highVisibilityMode')}
                </DropdownMenuCheckboxItem>

                {/* Font Size Options (inline for tablet compatibility) */}
                <DropdownMenuLabel className="text-sub text-xs uppercase tracking-wider mt-1">
                    <span className="flex items-center gap-2">
                        <Type className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('accessibility.fontSize')}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => setFontSize('normal')}
                    className={`cursor-pointer pl-6 ${fontSize === 'normal' ? 'bg-mint/10 text-mint' : 'text-ink'}`}
                >
                    {t('accessibility.fontSizeNormal')} (100%)
                    {fontSize === 'normal' && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setFontSize('large')}
                    className={`cursor-pointer pl-6 ${fontSize === 'large' ? 'bg-mint/10 text-mint' : 'text-ink'}`}
                >
                    {t('accessibility.fontSizeLarge')} (125%)
                    {fontSize === 'large' && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setFontSize('xlarge')}
                    className={`cursor-pointer pl-6 ${fontSize === 'xlarge' ? 'bg-mint/10 text-mint' : 'text-ink'}`}
                >
                    {t('accessibility.fontSizeExtraLarge')} (150%)
                    {fontSize === 'xlarge' && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>

                {/* Visual Alerts (Accessibility for hearing impairment) */}
                <DropdownMenuCheckboxItem
                    checked={visualAlerts}
                    onCheckedChange={toggleVisualAlerts}
                    className="text-ink cursor-pointer"
                >
                    <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t('accessibility.visualAlerts')}
                </DropdownMenuCheckboxItem>

                {/* Reduce Motion */}
                <DropdownMenuCheckboxItem
                    checked={reduceMotion}
                    onCheckedChange={toggleReduceMotion}
                    className="text-ink cursor-pointer"
                >
                    <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t('accessibility.reduceMotion')}
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator className="bg-lme-border" />

                <DropdownMenuItem
                    onClick={resetAccessibility}
                    disabled={isDefaultView}
                    className="text-ink cursor-pointer"
                >
                    <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t('accessibility.resetView')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
