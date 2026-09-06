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
 * Dispatcher del scoreboard Express: elige el marcador según el tipo de
 * deporte. Los marcadores viven en ./marcadores/, las piezas compartidas
 * en ./partes.tsx y las utilidades en ./utils.ts.
 */
import type { DeporteConfig, TipoMarcador } from '@/types/marcador';
import { GenericScoreboard } from './partes';
import type { MarcadorRecord } from './utils';
import { GolesScoreboard } from './marcadores/GolesScoreboard';
import { PuntosScoreboard } from './marcadores/PuntosScoreboard';
import { SetsScoreboard } from './marcadores/SetsScoreboard';
import { TriesScoreboard } from './marcadores/TriesScoreboard';
import { CarrerasScoreboard } from './marcadores/CarrerasScoreboard';
import { TowerTouchballScoreboard } from './marcadores/TowerTouchballScoreboard';

interface ScoreboardDisplayProps {
    tipo: TipoMarcador | string;
    marcador: MarcadorRecord;
    config?: DeporteConfig;
    onUpdate: (updates: MarcadorRecord) => void;
    equipoLocalNombre?: string;
    equipoVisitanteNombre?: string;
}

export default function ScoreboardDisplay({ tipo, marcador, config, onUpdate, equipoLocalNombre, equipoVisitanteNombre }: ScoreboardDisplayProps) {
    const localName = equipoLocalNombre || 'Local';
    const visitanteName = equipoVisitanteNombre || 'Visitante';
    switch (tipo) {
        case 'goles':
            return <GolesScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'puntos':
            return <PuntosScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'sets':
            return <SetsScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'tries':
            return <TriesScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'carreras':
            return <CarrerasScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        case 'towertouchball':
            return <TowerTouchballScoreboard marcador={marcador} onUpdate={onUpdate} config={config} localName={localName} visitanteName={visitanteName} />;
        default:
            return <GenericScoreboard marcador={marcador} />;
    }
}
