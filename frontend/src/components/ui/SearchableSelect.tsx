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

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
    value: string;
    label: string;
    description?: string;
    keywords?: string[];
    disabled?: boolean;
}

interface SearchableSelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    clearLabel?: string;
    allowClear?: boolean;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    panelClassName?: string;
    optionClassName?: string;
}

export function SearchableSelect({
    value,
    onValueChange,
    options,
    placeholder = 'Selecciona una opcion',
    searchPlaceholder = 'Escribe para buscar...',
    emptyText = 'No se encontraron resultados',
    clearLabel = 'Quitar seleccion',
    allowClear = false,
    disabled = false,
    className,
    triggerClassName,
    panelClassName,
    optionClassName,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    const selectedOption = value ? options.find((option) => option.value === value) : undefined;

    const filteredOptions = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return options;

        return options.filter((option) => {
            const haystack = [
                option.label,
                option.description,
                ...(option.keywords ?? []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(needle);
        });
    }, [options, search]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const handleSelect = (nextValue: string) => {
        onValueChange(nextValue);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = () => {
        onValueChange('');
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => {
                    setIsOpen((current) => {
                        if (current) {
                            setSearch('');
                        }
                        return !current;
                    });
                }}
                className={cn(
                    'flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-lme-border bg-[rgba(14,24,44,0.78)] px-4 py-2.5 text-left text-sm text-ink shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky disabled:cursor-not-allowed disabled:opacity-50',
                    triggerClassName,
                )}
            >
                <span className={cn('truncate', !selectedOption && 'text-sub')}>
                    {selectedOption?.label ?? placeholder}
                </span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-70 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
                <div
                    className={cn(
                        'absolute z-50 mt-2 w-full rounded-xl border border-lme-border bg-[rgba(11,20,37,0.98)] p-2 shadow-glass backdrop-blur-xl',
                        panelClassName,
                    )}
                >
                    <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
                        <Input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setIsOpen(false);
                                    setSearch('');
                                }
                            }}
                            placeholder={searchPlaceholder}
                            className="h-10 pl-10 pr-10"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sub transition-colors hover:text-ink"
                                aria-label="Limpiar busqueda"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {allowClear && value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="mb-2 flex w-full items-center justify-between rounded-lg border border-dashed border-lme-border px-3 py-2 text-left text-sm text-sub transition-colors hover:border-mint/40 hover:bg-white/5 hover:text-ink"
                        >
                            <span>{clearLabel}</span>
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    <div id={listId} role="listbox" className="max-h-64 space-y-1 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-sub">{emptyText}</div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        disabled={option.disabled}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50',
                                            isSelected && 'bg-mint/10 text-mint',
                                            optionClassName,
                                        )}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">{option.label}</span>
                                            {option.description && (
                                                <span className={cn('block truncate text-xs', isSelected ? 'text-mint/80' : 'text-sub')}>
                                                    {option.description}
                                                </span>
                                            )}
                                        </span>
                                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
