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
import { cn } from '@/lib/utils';

type MetricTone = 'mint' | 'sky' | 'vio' | 'amber' | 'rose' | 'slate';

const toneMap: Record<MetricTone, { panel: string; icon: string; value: string }> = {
    mint: {
        panel: 'from-mint/14 via-[rgba(11,24,44,0.92)] to-[rgba(11,24,44,0.98)]',
        icon: 'border-mint/30 bg-mint/12 text-mint',
        value: 'text-mint',
    },
    sky: {
        panel: 'from-sky/16 via-[rgba(11,24,44,0.92)] to-[rgba(11,24,44,0.98)]',
        icon: 'border-sky/30 bg-sky/12 text-sky',
        value: 'text-sky',
    },
    vio: {
        panel: 'from-vio/16 via-[rgba(11,24,44,0.92)] to-[rgba(11,24,44,0.98)]',
        icon: 'border-vio/30 bg-vio/12 text-vio',
        value: 'text-vio',
    },
    amber: {
        panel: 'from-amber-400/14 via-[rgba(11,24,44,0.92)] to-[rgba(11,24,44,0.98)]',
        icon: 'border-amber-300/30 bg-amber-300/12 text-amber-300',
        value: 'text-amber-200',
    },
    rose: {
        panel: 'from-red-400/14 via-[rgba(11,24,44,0.92)] to-[rgba(11,24,44,0.98)]',
        icon: 'border-red-300/30 bg-red-300/12 text-red-300',
        value: 'text-red-200',
    },
    slate: {
        panel: 'from-white/6 via-[rgba(11,24,44,0.92)] to-[rgba(11,24,44,0.98)]',
        icon: 'border-lme-border bg-white/6 text-sub',
        value: 'text-ink',
    },
};

interface MetricCardProps {
    label: string;
    value: string | number;
    support?: string;
    icon?: LucideIcon;
    tone?: MetricTone;
    className?: string;
}

export function MetricCard({
    label,
    value,
    support,
    icon: Icon,
    tone = 'slate',
    className,
}: MetricCardProps) {
    const styles = toneMap[tone];

    return (
        <div
            className={cn(
                'rounded-2xl border border-lme-border/90 bg-gradient-to-br p-4 shadow-[0_18px_40px_rgba(3,10,28,0.18)]',
                styles.panel,
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sub">{label}</p>
                    <p className={cn('mt-3 text-3xl font-bold tracking-tight', styles.value)}>{value}</p>
                    {support && <p className="mt-1 text-xs leading-relaxed text-sub">{support}</p>}
                </div>
                {Icon && (
                    <div className={cn('rounded-xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]', styles.icon)}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                )}
            </div>
        </div>
    );
}
