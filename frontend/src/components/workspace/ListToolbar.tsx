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

import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ListToolbarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    summary?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

export function ListToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    summary,
    children,
    className,
}: ListToolbarProps) {
    return (
        <Card className={cn('border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]', className)}>
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex w-full flex-col gap-3 lg:max-w-xl">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" aria-hidden="true" />
                        <Input
                            type="search"
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="pl-10"
                        />
                    </div>
                    {summary && <div className="text-sm text-sub">{summary}</div>}
                </div>

                {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
            </CardContent>
        </Card>
    );
}
