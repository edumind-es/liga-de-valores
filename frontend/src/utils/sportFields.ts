/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Sport field definitions and SVG templates
 */

export interface SportField {
    id: string;
    name: string;
    svg: string;
    aspectRatio: number; // width/height
}

export const SPORT_FIELDS: SportField[] = [
    {
        id: 'basketball',
        name: 'Baloncesto',
        aspectRatio: 1.9,
        svg: `<svg viewBox="0 0 950 500" xmlns="http://www.w3.org/2000/svg">
            <rect width="950" height="500" fill="#d2691e" stroke="#fff" stroke-width="4"/>
            <line x1="475" y1="0" x2="475" y2="500" stroke="#fff" stroke-width="3"/>
            <circle cx="475" cy="250" r="60" fill="none" stroke="#fff" stroke-width="3"/>
            <path d="M 50,250 Q 50,150 120,150 L 120,350 Q 50,350 50,250" fill="none" stroke="#fff" stroke-width="3"/>
            <path d="M 900,250 Q 900,150 830,150 L 830,350 Q 900,350 900,250" fill="none" stroke="#fff" stroke-width="3"/>
            <circle cx="145" cy="250" r="60" fill="none" stroke="#fff" stroke-width="3"/>
            <circle cx="805" cy="250" r="60" fill="none" stroke="#fff" stroke-width="3"/>
        </svg>`
    },
    {
        id: 'football',
        name: 'Fútbol Sala',
        aspectRatio: 2,
        svg: `<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
            <rect width="1000" height="500" fill="#228b22" stroke="#fff" stroke-width="4"/>
            <line x1="500" y1="0" x2="500" y2="500" stroke="#fff" stroke-width="3"/>
            <circle cx="500" cy="250" r="75" fill="none" stroke="#fff" stroke-width="3"/>
            <circle cx="500" cy="250" r="5" fill="#fff"/>
            <rect x="0" y="150" width="80" height="200" fill="none" stroke="#fff" stroke-width="3"/>
            <rect x="920" y="150" width="80" height="200" fill="none" stroke="#fff" stroke-width="3"/>
            <path d="M 80,175 Q 180,175 180,250 Q 180,325 80,325" fill="none" stroke="#fff" stroke-width="3"/>
            <path d="M 920,175 Q 820,175 820,250 Q 820,325 920,325" fill="none" stroke="#fff" stroke-width="3"/>
        </svg>`
    },
    {
        id: 'handball',
        name: 'Balonmano',
        aspectRatio: 2,
        svg: `<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
            <rect width="1000" height="500" fill="#d2b48c" stroke="#000" stroke-width="4"/>
            <line x1="500" y1="0" x2="500" y2="500" stroke="#000" stroke-width="3"/>
            <rect x="0" y="175" width="60" height="150" fill="none" stroke="#000" stroke-width="3"/>
            <rect x="940" y="175" width="60" height="150" fill="none" stroke="#000" stroke-width="3"/>
            <path d="M 60,100 Q 150,100 150,250 Q 150,400 60,400" fill="none" stroke="#000" stroke-width="3"/>
            <path d="M 940,100 Q 850,100 850,250 Q 850,400 940,400" fill="none" stroke="#000" stroke-width="3"/>
            <line x1="140" y1="250" x2="155" y2="250" stroke="#000" stroke-width="2" stroke-dasharray="5,5"/>
            <line x1="860" y1="250" x2="845" y2="250" stroke="#000" stroke-width="2" stroke-dasharray="5,5"/>
        </svg>`
    },
    {
        id: 'volleyball',
        name: 'Voleibol',
        aspectRatio: 1.8,
        svg: `<svg viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg">
            <rect width="900" height="500" fill="#daa520" stroke="#fff" stroke-width="4"/>
            <line x1="450" y1="0" x2="450" y2="500" stroke="#fff" stroke-width="4"/>
            <line x1="150" y1="0" x2="150" y2="500" stroke="#fff" stroke-width="2"/>
            <line x1="750" y1="0" x2="750" y2="500" stroke="#fff" stroke-width="2"/>
            <line x1="0" y1="150" x2="150" y2="150" stroke="#fff" stroke-width="2"/>
            <line x1="0" y1="350" x2="150" y2="350" stroke="#fff" stroke-width="2"/>
            <line x1="900" y1="150" x2="750" y2="150" stroke="#fff" stroke-width="2"/>
            <line x1="900" y1="350" x2="750" y2="350" stroke="#fff" stroke-width="2"/>
        </svg>`
    },
    {
        id: 'generic',
        name: 'Campo Genérico',
        aspectRatio: 1.5,
        svg: `<svg viewBox="0 0 750 500" xmlns="http://www.w3.org/2000/svg">
            <rect width="750" height="500" fill="#90ee90" stroke="#333" stroke-width="4"/>
            <line x1="375" y1="0" x2="375" y2="500" stroke="#333" stroke-width="2" stroke-dasharray="10,5"/>
            <circle cx="375" cy="250" r="5" fill="#333"/>
        </svg>`
    }
];

export function getSportFieldById(id: string): SportField | undefined {
    return SPORT_FIELDS.find(field => field.id === id);
}

export function getSportFieldSvgDataUrl(svg: string): string {
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
}
