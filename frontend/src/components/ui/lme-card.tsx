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

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LMECardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
}

const LMECard = forwardRef<HTMLDivElement, LMECardProps>(
    ({ className, hover = true, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'lme-card',
                    hover && 'hover:transform hover:-translate-y-1 hover:shadow-xl transition-all duration-200',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

LMECard.displayName = 'LMECard';

const LMECardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('mb-4', className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);

LMECardHeader.displayName = 'LMECardHeader';

const LMECardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <h3
                ref={ref}
                className={cn('text-xl font-bold text-gray-900', className)}
                {...props}
            >
                {children}
            </h3>
        );
    }
);

LMECardTitle.displayName = 'LMECardTitle';

const LMECardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('', className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);

LMECardContent.displayName = 'LMECardContent';

export { LMECard, LMECardHeader, LMECardTitle, LMECardContent };
