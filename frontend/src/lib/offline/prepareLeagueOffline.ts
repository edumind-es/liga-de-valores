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

import { ligasApi } from '@/api/ligas';
import { equiposApi } from '@/api/equipos';
import { partidosApi } from '@/api/partidos';
import { criteriosApi } from '@/api/criterios';
import {
  OFFLINE_DEFAULT_TTL_DAYS,
  OFFLINE_POLICY_VERSION,
  saveRecord,
  setOfflineLeagueMeta,
} from '@/lib/offline/offlineDB';
import type { PartidoDetailed, TipoDeporte, LigaWithStats, Equipo } from '@/types/liga';

type ProgressPayload = {
  step: string;
  completed: number;
  total: number;
  errors: number;
};

type PrepareOptions = {
  includeEvaluacionesPersonalizadas?: boolean;
  maxConcurrency?: number;
  preparedBy?: string | null;
  ttlDays?: number;
  onProgress?: (payload: ProgressPayload) => void;
};

const DEFAULT_PAGE_SIZE = 100;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>,
  onItemDone?: () => void
): Promise<number> {
  let index = 0;
  let active = 0;
  let errors = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (index >= items.length && active === 0) {
        resolve(errors);
        return;
      }
      while (active < limit && index < items.length) {
        const item = items[index++];
        active++;
        handler(item)
          .catch(() => {
            errors += 1;
          })
          .finally(() => {
            active--;
            onItemDone?.();
            next();
          });
      }
    };

    next();
  });
}

async function fetchAllPartidos(ligaId: number): Promise<PartidoDetailed[]> {
  const all: PartidoDetailed[] = [];
  let skip = 0;

  while (true) {
    const page = await partidosApi.getAll({ liga_id: ligaId, skip, limit: DEFAULT_PAGE_SIZE }) as PartidoDetailed[];
    all.push(...page);
    if (page.length < DEFAULT_PAGE_SIZE) break;
    skip += DEFAULT_PAGE_SIZE;
  }

  return all;
}

export async function prepareLeagueOffline(
  ligaId: number,
  options: PrepareOptions = {}
): Promise<{
  liga: LigaWithStats;
  counts: {
    partidos: number;
    equipos: number;
    tiposDeporte: number;
    evaluacionesPersonalizadas: number;
  };
  errors: number;
}> {
  const limit = options.maxConcurrency ?? 4;
  const ttlDays = options.ttlDays ?? OFFLINE_DEFAULT_TTL_DAYS;
  let errors = 0;

  const emit = (payload: ProgressPayload) => {
    options.onProgress?.(payload);
  };

  emit({ step: 'Cargando liga', completed: 0, total: 1, errors });
  const liga = await ligasApi.getById(ligaId);
  await saveRecord('ligas', 'liga', liga.id, liga, { syncStatus: 'synced' });
  emit({ step: 'Cargando liga', completed: 1, total: 1, errors });

  emit({ step: 'Descargando equipos', completed: 0, total: 0, errors });
  const equipos = await equiposApi.getAllByLiga(ligaId);
  await Promise.all(
    equipos.map((equipo: Equipo) =>
      saveRecord('equipos', 'equipo', equipo.id, equipo, { syncStatus: 'synced' })
    )
  );
  emit({ step: 'Descargando equipos', completed: equipos.length, total: equipos.length, errors });

  emit({ step: 'Descargando partidos', completed: 0, total: 0, errors });
  const partidos = await fetchAllPartidos(ligaId);
  const tipoMap = new Map<number, TipoDeporte>();
  partidos.forEach((partido) => {
    if (partido.tipo_deporte?.id) {
      tipoMap.set(partido.tipo_deporte.id, partido.tipo_deporte);
    }
  });

  let completed = 0;
  const partidoErrors = await runWithConcurrency(
    partidos,
    limit,
    async (partido) => {
      await saveRecord('partidos', 'partido', partido.id, partido, { syncStatus: 'synced' });
    },
    () => {
      completed += 1;
      emit({ step: 'Descargando partidos', completed, total: partidos.length, errors });
    }
  );
  errors += partidoErrors;

  emit({ step: 'Guardando tipos de deporte', completed: 0, total: tipoMap.size, errors });
  let tipoCompleted = 0;
  for (const tipo of tipoMap.values()) {
    await saveRecord('tiposDeporte', 'tipoDeporte', tipo.id, tipo, { syncStatus: 'synced' });
    tipoCompleted += 1;
    emit({ step: 'Guardando tipos de deporte', completed: tipoCompleted, total: tipoMap.size, errors });
  }

  let evalCount = 0;
  if (options.includeEvaluacionesPersonalizadas && liga.modo_evaluacion === 'personalizado') {
    emit({ step: 'Descargando evaluaciones personalizadas', completed: 0, total: partidos.length, errors });
    let evalCompleted = 0;
    const evalErrors = await runWithConcurrency(
      partidos,
      limit,
      async (partido) => {
        const data = await criteriosApi.getEvaluacionPartido(partido.id);
        await saveRecord(
          'evaluaciones',
          'evaluacion_personalizada',
          partido.id,
          { partido_id: partido.id, ...data },
          { syncStatus: 'synced' }
        );
        evalCount += 1;
      },
      () => {
        evalCompleted += 1;
        emit({ step: 'Descargando evaluaciones personalizadas', completed: evalCompleted, total: partidos.length, errors });
      }
    );
    errors += evalErrors;
  }

  const updatedAt = new Date().toISOString();
  const summary = {
    liga_id: ligaId,
    updatedAt,
    expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString(),
    counts: {
      partidos: partidos.length,
      equipos: equipos.length,
      tiposDeporte: tipoMap.size,
      evaluacionesPersonalizadas: evalCount,
    },
    errors,
    modo_evaluacion: liga.modo_evaluacion,
    preparedBy: options.preparedBy ?? null,
    policyVersion: OFFLINE_POLICY_VERSION,
    explicitPreparation: true,
    sensitiveScopes: [
      'liga',
      'equipos',
      'partidos',
      'tipos_deporte',
      ...(evalCount > 0 ? ['evaluaciones_personalizadas'] : []),
    ],
  };

  await setOfflineLeagueMeta(summary);

  return {
    liga,
    counts: summary.counts,
    errors,
  };
}
