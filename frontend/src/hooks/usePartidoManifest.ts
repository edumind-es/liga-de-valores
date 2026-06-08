/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Swap del manifest PWA para la ruta /partido.
 * Chrome lee el manifest en el momento de mostrar el prompt de instalación.
 * Al estar en /partido, se usa el manifest de alumno ("Partidos EDUmind")
 * que tiene scope "/partido" — así se instala como mini-app separada.
 */

import { useEffect } from 'react';

const MANIFEST_PARTIDO = '/manifest-partido.json';
const MANIFEST_PRINCIPAL = '/manifest.json';

export function usePartidoManifest() {
    useEffect(() => {
        const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
        if (!link) return;

        const original = link.getAttribute('href') ?? MANIFEST_PRINCIPAL;
        link.setAttribute('href', MANIFEST_PARTIDO);

        return () => {
            link.setAttribute('href', original);
        };
    }, []);
}
