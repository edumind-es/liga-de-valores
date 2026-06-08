/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * ARASAAC Pictogram Search Component
 */

import React, { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { searchPictograms, type Pictogram } from '@/utils/arasaac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PictogramSearchProps {
    onSelect: (pictogram: Pictogram) => void;
    compact?: boolean;
}

export default function PictogramSearch({ onSelect, compact = false }: PictogramSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Pictogram[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query || query.length < 2) return;

        setLoading(true);
        try {
            const pictograms = await searchPictograms(query);
            setResults(pictograms);
            setShowResults(true);
        } catch (error) {
            console.error('Error searching pictograms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (pictogram: Pictogram) => {
        onSelect(pictogram);
        setQuery('');
        setResults([]);
        setShowResults(false);
    };

    return (
        <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar pictograma ARASAAC..."
                    className={compact ? "text-sm" : ""}
                />
                <Button
                    type="submit"
                    size={compact ? "sm" : "default"}
                    disabled={loading || query.length < 2}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                </Button>
            </form>

            {showResults && results.length > 0 && (
                <div className="relative">
                    <div className="absolute top-1 right-1 z-10">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowResults(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-lme-surface rounded-lg border border-lme-border max-h-64 overflow-y-auto">
                        {results.map((pictogram) => (
                            <button
                                key={pictogram.id}
                                onClick={() => handleSelect(pictogram)}
                                className="aspect-square bg-white rounded-lg p-2 hover:ring-2 hover:ring-mint transition-all"
                                title={pictogram.title}
                            >
                                <img
                                    src={pictogram.url}
                                    alt={pictogram.title}
                                    className="w-full h-full object-contain"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showResults && results.length === 0 && !loading && (
                <p className="text-sm text-sub text-center py-4">
                    No se encontraron pictogramas para "{query}"
                </p>
            )}
        </div>
    );
}
