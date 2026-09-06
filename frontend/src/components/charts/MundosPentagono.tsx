/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Pentágono de Los Cinco Mundos: perfil educativo de un equipo tratado
 * como figura de lámina científica (colores planos, sin gradientes).
 */
import { MUNDOS, type Mundo } from '@/types/liga';
import { MUNDO_COLOR, MUNDO_LABEL } from '@/lib/mundos';

interface MundosPentagonoProps {
    /** Puntos por mundo del equipo */
    mundos: Partial<Record<Mundo, number>>;
    /** Valor que representa el radio máximo (p. ej. el máximo de la liga) */
    max: number;
    /** Lado del SVG en píxeles */
    size?: number;
    /** Mostrar los puntos de vértice coloreados */
    showVertices?: boolean;
}

// Vértice i de un pentágono regular (arriba = índice 0), radio r, centro c
function vertice(i: number, r: number, c: number): [number, number] {
    const angulo = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [c + r * Math.cos(angulo), c + r * Math.sin(angulo)];
}

export function MundosPentagono({ mundos, max, size = 56, showVertices = true }: MundosPentagonoProps) {
    const c = size / 2;
    const rMax = size / 2 - (showVertices ? 6 : 3);
    const escala = max > 0 ? rMax / max : 0;

    const contorno = MUNDOS.map((_, i) => vertice(i, rMax, c).join(',')).join(' ');
    const perfil = MUNDOS.map((mundo, i) => {
        const valor = Math.max(0, mundos[mundo] ?? 0);
        const r = Math.min(valor * escala, rMax);
        return vertice(i, r, c).join(',');
    }).join(' ');

    const resumen = MUNDOS.map((m) => `${MUNDO_LABEL[m]} ${mundos[m] ?? 0}`).join(' · ');

    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            role="img"
            aria-label={`Perfil de mundos: ${resumen}`}
        >
            <title>{resumen}</title>
            {/* Contorno del pentágono y radios, como figura científica */}
            <polygon points={contorno} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
            {MUNDOS.map((mundo, i) => {
                const [x, y] = vertice(i, rMax, c);
                return (
                    <line
                        key={mundo}
                        x1={c} y1={c} x2={x} y2={y}
                        stroke="currentColor" strokeOpacity={0.15} strokeWidth={1}
                    />
                );
            })}
            {/* Perfil del equipo */}
            <polygon points={perfil} fill="#3f7d99" fillOpacity={0.28} stroke="#3f7d99" strokeWidth={1.2} />
            {showVertices &&
                MUNDOS.map((mundo, i) => {
                    const [x, y] = vertice(i, rMax, c);
                    const activo = (mundos[mundo] ?? 0) > 0;
                    return (
                        <circle
                            key={mundo}
                            cx={x} cy={y} r={activo ? 3.2 : 2}
                            fill={activo ? MUNDO_COLOR[mundo] : 'none'}
                            stroke={MUNDO_COLOR[mundo]}
                            strokeWidth={1.2}
                            opacity={activo ? 1 : 0.5}
                        />
                    );
                })}
        </svg>
    );
}

export default MundosPentagono;
