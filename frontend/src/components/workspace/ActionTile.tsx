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
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ActionTileTone = 'mint' | 'sky' | 'vio' | 'amber' | 'slate';

const toneMap: Record<ActionTileTone, { icon: string; color: string; glow: string }> = {
    mint:  { icon: 'border-mint/40 bg-mint/15 text-mint',               color: 'var(--mint)',        glow: 'rgba(82,217,199,0.18)'  },
    sky:   { icon: 'border-sky/40 bg-sky/15 text-sky',                  color: 'var(--sky)',         glow: 'rgba(74,132,255,0.18)'  },
    vio:   { icon: 'border-vio/40 bg-vio/15 text-vio',                  color: 'var(--vio)',         glow: 'rgba(142,121,255,0.18)' },
    amber: { icon: 'border-amber-300/40 bg-amber-300/15 text-amber-300', color: 'var(--lme-warning)', glow: 'rgba(242,185,73,0.18)'  },
    slate: { icon: 'border-lme-border bg-white/8 text-sub',             color: '',                   glow: 'rgba(255,255,255,0.04)' },
};

interface ActionTileProps {
    title: string;
    description: React.ReactNode;
    icon: LucideIcon;
    value?: string | number;
    tone?: ActionTileTone;
    className?: string;
    children?: React.ReactNode;
}

export function ActionTile({
    title,
    description,
    icon: Icon,
    value,
    tone = 'slate',
    className,
    children,
}: ActionTileProps) {
    const styles = toneMap[tone];

    return (
        <Card
            style={styles.color ? { borderTopColor: styles.color } : undefined}
            className={cn(
                'h-full overflow-hidden border-t-[3px] border-lme-border/90 bg-[rgba(10,20,38,0.74)] shadow-[0_20px_42px_rgba(3,10,28,0.2)]',
                className,
            )}
        >
            <CardContent className="relative flex h-full flex-col gap-5 p-5">
                <div
                    className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                    style={{ background: `linear-gradient(to bottom, ${styles.glow}, transparent)` }}
                />
                <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-base font-semibold text-ink">{title}</p>
                        <div className="mt-2 text-sm leading-relaxed text-sub">{description}</div>
                    </div>
                    <div className={cn('rounded-xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]', styles.icon)}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                </div>

                {typeof value !== 'undefined' && (
                    <div className="relative">
                        <p className="text-xs uppercase tracking-[0.1em] text-sub">Resumen</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{value}</p>
                    </div>
                )}

                {children && <div className="relative mt-auto flex flex-wrap gap-2">{children}</div>}
            </CardContent>
        </Card>
    );
}
