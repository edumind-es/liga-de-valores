/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Navegación por pasos entre pestañas de configuración.
 * Extraída de ConfiguracionLiga.tsx (renderStepNavigation) sin cambios.
 */
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SETTINGS_PANEL_CLASSNAME, TAB_SECTIONS, type TabValue } from './constants';

interface StepNavigationProps {
    tabValue: TabValue;
    onNavigate: (tab: TabValue) => void;
}

export function StepNavigation({ tabValue, onNavigate }: StepNavigationProps) {
    const sectionIndex = TAB_SECTIONS.findIndex((section) => section.value === tabValue);
    const section = TAB_SECTIONS[sectionIndex];
    if (!section) return null;

    const previousSection = TAB_SECTIONS[sectionIndex - 1];
    const nextSection = TAB_SECTIONS[sectionIndex + 1];

    return (
        <Card className={SETTINGS_PANEL_CLASSNAME}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-sub">
                        Paso {sectionIndex + 1} de {TAB_SECTIONS.length}
                    </p>
                    <p className="mt-1 text-base font-semibold text-ink">{section.label}</p>
                    <p className="mt-1 text-sm text-sub">{section.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!previousSection}
                        onClick={() => previousSection && onNavigate(previousSection.value)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {previousSection ? previousSection.label : 'Inicio'}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={!nextSection}
                        onClick={() => nextSection && onNavigate(nextSection.value)}
                    >
                        {nextSection ? nextSection.label : 'Último paso'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
