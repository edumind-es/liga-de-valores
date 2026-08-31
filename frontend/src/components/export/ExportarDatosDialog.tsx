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

/**
 * Diálogo genérico de exportación con selección múltiple.
 * Permite exportar todos los elementos o marcar uno a uno,
 * en formato CSV (Excel/Sheets) o PDF imprimible.
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface ExportableItem {
    id: number;
    label: string;
    sublabel?: string;
}

interface ExportarDatosDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    /** Nombre de la unidad en plural para los textos («jornadas», «partidos»). */
    itemNoun: string;
    items: ExportableItem[];
    /**
     * Ejecuta la exportación. `selectedIds` es null cuando están todos
     * seleccionados (exportación completa, sin filtro).
     */
    onExport: (formato: 'csv' | 'pdf', selectedIds: number[] | null) => Promise<void>;
}

export function ExportarDatosDialog({
    open,
    onOpenChange,
    title,
    description,
    itemNoun,
    items,
    onExport,
}: ExportarDatosDialogProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [isExporting, setIsExporting] = useState(false);

    // Al abrir, todo seleccionado por defecto
    useEffect(() => {
        if (open) {
            setSelected(new Set(items.map((item) => item.id)));
        }
    }, [open, items]);

    const allSelected = useMemo(
        () => items.length > 0 && items.every((item) => selected.has(item.id)),
        [items, selected],
    );

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
    };

    const toggleItem = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExport = async (formato: 'csv' | 'pdf') => {
        if (selected.size === 0) {
            toast.error(`Selecciona al menos un elemento para exportar`);
            return;
        }
        setIsExporting(true);
        try {
            await onExport(formato, allSelected ? null : Array.from(selected));
            toast.success(`Exportación descargada (${formato.toUpperCase()})`);
            onOpenChange(false);
        } catch {
            toast.error(`No se pudo exportar (${formato.toUpperCase()})`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <label className="flex items-center gap-3 rounded-lg border border-lme-border bg-lme-surface-soft px-4 py-3 cursor-pointer">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        <span className="text-sm font-semibold text-ink">
                            Todos ({items.length} {itemNoun})
                        </span>
                    </label>

                    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {items.map((item) => (
                            <label
                                key={item.id}
                                className="flex items-center gap-3 rounded-lg border border-lme-border/60 bg-lme-surface px-4 py-2.5 cursor-pointer hover:border-mint/30 transition-colors"
                            >
                                <Checkbox
                                    checked={selected.has(item.id)}
                                    onCheckedChange={() => toggleItem(item.id)}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-ink">{item.label}</span>
                                    {item.sublabel && (
                                        <span className="block truncate text-xs text-sub">{item.sublabel}</span>
                                    )}
                                </span>
                            </label>
                        ))}
                        {items.length === 0 && (
                            <p className="py-6 text-center text-sm text-sub">
                                No hay {itemNoun} para exportar.
                            </p>
                        )}
                    </div>

                    <p className="text-xs text-sub">
                        El CSV incluye datos completos por partido: jornada, equipos, marcador, resultado,
                        puntos deportivos, juego limpio, árbitro y grada. Compatible con Excel y Google Sheets.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                        Cancelar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => void handleExport('csv')}
                        disabled={isExporting || selected.size === 0}
                    >
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Exportar CSV
                    </Button>
                    <Button
                        onClick={() => void handleExport('pdf')}
                        disabled={isExporting || selected.size === 0}
                    >
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Exportar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
