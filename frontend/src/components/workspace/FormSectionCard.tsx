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

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FormSectionTone = 'mint' | 'sky' | 'vio' | 'amber';

const toneMap: Record<FormSectionTone, string> = {
    mint: 'border-mint/28 bg-mint/12 text-mint',
    sky: 'border-sky/28 bg-sky/12 text-sky',
    vio: 'border-vio/28 bg-vio/12 text-vio',
    amber: 'border-amber-300/28 bg-amber-300/12 text-amber-300',
};

interface FormSectionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    tone?: FormSectionTone;
    className?: string;
    contentClassName?: string;
    children: React.ReactNode;
}

export function FormSectionCard({
    title,
    description,
    icon: Icon,
    tone = 'mint',
    className,
    contentClassName,
    children,
}: FormSectionCardProps) {
    return (
        <Card className={cn('border-lme-border/90 bg-[rgba(16,30,53,0.56)]', className)}>
            <CardHeader className="border-b border-lme-border/70 pb-4">
                <div className="flex items-start gap-4">
                    <div className={cn('rounded-2xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]', toneMap[tone])}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription className="max-w-3xl leading-relaxed">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className={cn('pt-6', contentClassName)}>{children}</CardContent>
        </Card>
    );
}
