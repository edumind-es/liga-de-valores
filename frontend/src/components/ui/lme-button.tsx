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

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LMEButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

const LMEButton = forwardRef<HTMLButtonElement, LMEButtonProps>(
    ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
        const baseStyles = 'font-semibold transition-all duration-200 inline-flex items-center justify-center rounded-full';

        const variantStyles = {
            primary: 'bg-gradient-to-r from-mint to-sky text-[#040614] shadow-[0_12px_28px_rgba(61,218,215,0.25)] hover:shadow-[0_18px_36px_rgba(61,218,215,0.35)] hover:-translate-y-0.5',
            outline: 'border border-lme-border bg-transparent text-ink hover:bg-white/5 hover:border-sub',
            ghost: 'bg-transparent hover:bg-white/5 text-sub hover:text-ink border-0'
        };

        const sizeStyles = {
            sm: 'text-sm px-4 py-2',
            md: 'text-base px-6 py-2.5',
            lg: 'text-lg px-8 py-3'
        };

        return (
            <button
                ref={ref}
                className={cn(
                    baseStyles,
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

LMEButton.displayName = 'LMEButton';

export { LMEButton };
