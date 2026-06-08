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

import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    eyebrow?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, eyebrow, children, className }: PageHeaderProps) {
    return (
        <div className={cn("context-header animate-in fade-in slide-in-from-top-4 duration-500", className)}>
            <div className="context-header__meta min-w-0 flex-1">
                {eyebrow && <p className="context-header__eyebrow">{eyebrow}</p>}
                <h1 className="context-header__title">{title}</h1>
                {description && (
                    <p className="context-header__description">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
