/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export interface Pictogram {
    id: string;
    title: string;
    url: string;
    keywords?: string[];
}

const ARASAAC_API_BASE = 'https://api.arasaac.org/v1/pictograms';
const ARASAAC_STATIC_BASE = 'https://static.arasaac.org/pictograms';

interface ArasaacKeywordObject {
    keyword?: string;
}

interface ArasaacPictogramRaw {
    _id: string | number;
    keywords?: Array<string | ArasaacKeywordObject>;
}

export async function searchPictograms(query: string): Promise<Pictogram[]> {
    if (!query || query.length < 2) return [];

    try {
        const res = await fetch(`${ARASAAC_API_BASE}/es/search/${encodeURIComponent(query)}`);
        if (!res.ok) return [];

        const data = await res.json();
        const items = Array.isArray(data) ? (data as ArasaacPictogramRaw[]) : [];

        return items.slice(0, 20).map((p) => {
            const id = String(p._id);
            const keywords = Array.isArray(p.keywords)
                ? p.keywords.map((k) => typeof k === 'string' ? k : (k.keyword || ''))
                : [];

            return {
                id,
            title: query,
                url: `${ARASAAC_STATIC_BASE}/${id}/${id}_500.png`,
                keywords,
            };
        });
    } catch (e) {
        console.error('ARASAAC Search Error:', e);
        return [];
    }
}

export async function getBestPictogramMatch(term: string): Promise<Pictogram | null> {
    const STOPWORDS = ['la', 'el', 'las', 'los', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'para', 'con', 'y', 'o', 'que', 'a'];

    const clean = (text: string) => {
        return text.toLowerCase()
            .replace(/[.,;:]/g, '')
            .split(' ')
            .filter(w => !STOPWORDS.includes(w) && w.length > 2)
            .join(' ');
    };

    const cleanTerm = clean(term);
    let results = await searchPictograms(term);

    if (results.length === 0 && cleanTerm !== term.toLowerCase()) {
        results = await searchPictograms(cleanTerm);
    }

    if (results.length === 0 && cleanTerm.includes(' ')) {
        const words = cleanTerm.split(' ');
        if (words.length > 0) {
            results = await searchPictograms(words[0]);
        }
        if (results.length === 0 && words.length > 1) {
            results = await searchPictograms(words[words.length - 1]);
        }
    }

    return results.length > 0 ? results[0] : null;
}
