/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface ConflictMeta {
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  operation?: 'create' | 'update' | 'delete';
  payload?: unknown;
}

export interface OfflineRecord<T> {
  id: string; // Composite key: `${entityType}_${entityId}`
  entityType: string;
  entityId: number | string;
  data: T;
  lastModified: number; // Unix timestamp
  serverVersion?: number; // Server's lastModified for conflict detection
  syncStatus: SyncStatus;
  conflictData?: T; // Server's version when conflict detected
  conflictMeta?: ConflictMeta;
}

export interface PendingOperation {
  id: string; // UUID
  entityType: string;
  entityId: number | string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface OfflineLeagueCounts {
  partidos: number;
  equipos: number;
  tiposDeporte: number;
  evaluacionesPersonalizadas: number;
}

export interface OfflineLeagueMeta {
  liga_id: number;
  updatedAt: string;
  expiresAt: string;
  counts: OfflineLeagueCounts;
  errors: number;
  modo_evaluacion?: string;
  preparedBy: string | null;
  policyVersion: string;
  explicitPreparation: boolean;
  sensitiveScopes: string[];
}

// =============================================================================
// DATABASE SCHEMA
// =============================================================================

interface LigaEdumindDB extends DBSchema {
  // Cached data stores
  partidos: {
    key: string;
    value: OfflineRecord<unknown>;
    indexes: {
      'by-entity': string;
      'by-sync-status': SyncStatus;
      'by-modified': number;
    };
  };
  evaluaciones: {
    key: string;
    value: OfflineRecord<unknown>;
    indexes: {
      'by-entity': string;
      'by-sync-status': SyncStatus;
      'by-partido': string;
    };
  };
  equipos: {
    key: string;
    value: OfflineRecord<unknown>;
    indexes: {
      'by-entity': string;
      'by-liga': number;
    };
  };
  ligas: {
    key: string;
    value: OfflineRecord<unknown>;
    indexes: {
      'by-entity': string;
    };
  };
  tiposDeporte: {
    key: string;
    value: OfflineRecord<unknown>;
    indexes: {
      'by-codigo': string;
    };
  };
  // Operation queue
  pendingOperations: {
    key: string;
    value: PendingOperation;
    indexes: {
      'by-created': number;
      'by-entity': string;
    };
  };
  // Metadata
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: number;
    };
  };
}

// =============================================================================
// DATABASE SINGLETON
// =============================================================================

const DB_NAME = 'liga-edumind-offline';
const DB_VERSION = 1;
const OFFLINE_READY_PREFIX = 'offline_ready_liga_';

export const OFFLINE_POLICY_VERSION = '2026-04-02';
export const OFFLINE_DEFAULT_TTL_DAYS = 30;

let dbInstance: IDBPDatabase<LigaEdumindDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<LigaEdumindDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<LigaEdumindDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Partidos store
      if (!db.objectStoreNames.contains('partidos')) {
        const partidosStore = db.createObjectStore('partidos', { keyPath: 'id' });
        partidosStore.createIndex('by-entity', 'entityType');
        partidosStore.createIndex('by-sync-status', 'syncStatus');
        partidosStore.createIndex('by-modified', 'lastModified');
      }

      // Evaluaciones store
      if (!db.objectStoreNames.contains('evaluaciones')) {
        const evaluacionesStore = db.createObjectStore('evaluaciones', { keyPath: 'id' });
        evaluacionesStore.createIndex('by-entity', 'entityType');
        evaluacionesStore.createIndex('by-sync-status', 'syncStatus');
        evaluacionesStore.createIndex('by-partido', 'data.partido_id');
      }

      // Equipos store
      if (!db.objectStoreNames.contains('equipos')) {
        const equiposStore = db.createObjectStore('equipos', { keyPath: 'id' });
        equiposStore.createIndex('by-entity', 'entityType');
        equiposStore.createIndex('by-liga', 'data.liga_id');
      }

      // Ligas store
      if (!db.objectStoreNames.contains('ligas')) {
        const ligasStore = db.createObjectStore('ligas', { keyPath: 'id' });
        ligasStore.createIndex('by-entity', 'entityType');
      }

      // TiposDeporte store
      if (!db.objectStoreNames.contains('tiposDeporte')) {
        const tiposStore = db.createObjectStore('tiposDeporte', { keyPath: 'id' });
        tiposStore.createIndex('by-codigo', 'data.codigo');
      }

      // Pending operations queue
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
        pendingStore.createIndex('by-created', 'createdAt');
        pendingStore.createIndex('by-entity', 'entityType');
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// =============================================================================
// GENERIC CRUD OPERATIONS
// =============================================================================

type StoreName = 'partidos' | 'evaluaciones' | 'equipos' | 'ligas' | 'tiposDeporte';

function generateId(entityType: string, entityId: number | string): string {
  return `${entityType}_${entityId}`;
}

function getOfflineLeagueMetaKey(ligaId: number | string): string {
  return `${OFFLINE_READY_PREFIX}${ligaId}`;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readLeagueIdFromData(data: unknown): number | null {
  const record = asObject(data);
  if (!record) return null;

  const direct = readNumericId(record.liga_id);
  if (direct !== null) return direct;

  const liga = asObject(record.liga);
  return liga ? readNumericId(liga.id) : null;
}

function readPartidoIdFromData(data: unknown): number | null {
  const record = asObject(data);
  if (!record) return null;
  return readNumericId(record.partido_id);
}

function readSportIdFromData(data: unknown): number | null {
  const record = asObject(data);
  if (!record) return null;

  const direct = readNumericId(record.tipo_deporte_id ?? record.id);
  if (direct !== null && (record.tipo_deporte_id !== undefined || record.codigo !== undefined)) {
    return direct;
  }

  const tipoDeporte = asObject(record.tipo_deporte);
  return tipoDeporte ? readNumericId(tipoDeporte.id) : null;
}

function normalizeOfflineLeagueMeta(raw: unknown, ligaIdFallback?: number): OfflineLeagueMeta | undefined {
  const record = asObject(raw);
  if (!record) return undefined;

  const ligaId = readNumericId(record.liga_id) ?? ligaIdFallback;
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : null;
  if (!ligaId || !updatedAt) return undefined;

  const countsRecord = asObject(record.counts);
  const counts: OfflineLeagueCounts = {
    partidos: readNumericId(countsRecord?.partidos) ?? 0,
    equipos: readNumericId(countsRecord?.equipos) ?? 0,
    tiposDeporte: readNumericId(countsRecord?.tiposDeporte) ?? 0,
    evaluacionesPersonalizadas: readNumericId(countsRecord?.evaluacionesPersonalizadas) ?? 0,
  };

  const baseUpdatedAtMs = Date.parse(updatedAt);
  const expiresAt = typeof record.expiresAt === 'string'
    ? record.expiresAt
    : new Date(
        (Number.isFinite(baseUpdatedAtMs) ? baseUpdatedAtMs : Date.now()) +
        OFFLINE_DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

  const sensitiveScopes = Array.isArray(record.sensitiveScopes)
    ? record.sensitiveScopes.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [
        'liga',
        'equipos',
        'partidos',
        'tipos_deporte',
        ...(counts.evaluacionesPersonalizadas > 0 ? ['evaluaciones_personalizadas'] : []),
      ];

  return {
    liga_id: ligaId,
    updatedAt,
    expiresAt,
    counts,
    errors: readNumericId(record.errors) ?? 0,
    modo_evaluacion: typeof record.modo_evaluacion === 'string' ? record.modo_evaluacion : undefined,
    preparedBy: typeof record.preparedBy === 'string' ? record.preparedBy : null,
    policyVersion: typeof record.policyVersion === 'string' ? record.policyVersion : 'legacy',
    explicitPreparation: record.explicitPreparation !== false,
    sensitiveScopes,
  };
}

async function pruneUnusedSportTypes(db: IDBPDatabase<LigaEdumindDB>): Promise<number> {
  const remainingPartidos = await db.getAll('partidos');
  const referencedSportIds = new Set<number>();

  remainingPartidos.forEach((record) => {
    const sportId = readSportIdFromData(record.data);
    if (sportId !== null) {
      referencedSportIds.add(sportId);
    }
  });

  const sportRecords = await db.getAll('tiposDeporte');
  const orphaned = sportRecords.filter((record) => {
    const sportId = readNumericId(record.entityId) ?? readSportIdFromData(record.data);
    return sportId !== null && !referencedSportIds.has(sportId);
  });

  await Promise.all(orphaned.map((record) => db.delete('tiposDeporte', record.id)));
  return orphaned.length;
}

export async function saveRecord<T>(
  storeName: StoreName,
  entityType: string,
  entityId: number | string,
  data: T,
  options: {
    syncStatus?: SyncStatus;
    serverVersion?: number;
  } = {}
): Promise<void> {
  const db = await getDB();
  const id = generateId(entityType, entityId);

  const record: OfflineRecord<T> = {
    id,
    entityType,
    entityId,
    data,
    lastModified: Date.now(),
    syncStatus: options.syncStatus || 'synced',
    serverVersion: options.serverVersion,
  };

  await db.put(storeName, record as OfflineRecord<unknown>);
}

export async function getRecord<T>(
  storeName: StoreName,
  entityType: string,
  entityId: number | string
): Promise<OfflineRecord<T> | undefined> {
  const db = await getDB();
  const id = generateId(entityType, entityId);
  return db.get(storeName, id) as Promise<OfflineRecord<T> | undefined>;
}

export async function getAllRecords<T>(
  storeName: StoreName,
  entityType?: string
): Promise<OfflineRecord<T>[]> {
  const db = await getDB();

  if (entityType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any).getAllFromIndex(storeName, 'by-entity', entityType) as Promise<OfflineRecord<T>[]>;
  }

  return db.getAll(storeName) as Promise<OfflineRecord<T>[]>;
}

export async function deleteRecord(
  storeName: StoreName,
  entityType: string,
  entityId: number | string
): Promise<void> {
  const db = await getDB();
  const id = generateId(entityType, entityId);
  await db.delete(storeName, id);
}

export async function getPendingRecords<T>(
  storeName: StoreName
): Promise<OfflineRecord<T>[]> {
  const db = await getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).getAllFromIndex(storeName, 'by-sync-status', 'pending') as Promise<OfflineRecord<T>[]>;
}

export async function getConflictRecords<T>(
  storeName: StoreName
): Promise<OfflineRecord<T>[]> {
  const db = await getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).getAllFromIndex(storeName, 'by-sync-status', 'conflict') as Promise<OfflineRecord<T>[]>;
}

// =============================================================================
// PENDING OPERATIONS QUEUE
// =============================================================================

export async function queueOperation(
  operation: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>
): Promise<string> {
  const db = await getDB();

  // Coalesce repeated update operations for the same entity/endpoint.
  // This prevents huge queues when timers emit frequent updates.
  if (operation.operation === 'update') {
    const existing = (await db.getAll('pendingOperations'))
      .find((op) =>
        op.operation === 'update' &&
        op.entityType === operation.entityType &&
        op.entityId === operation.entityId &&
        op.endpoint === operation.endpoint &&
        op.method === operation.method
      );

    if (existing) {
      existing.payload = operation.payload;
      existing.lastError = undefined;
      existing.retryCount = 0;
      await db.put('pendingOperations', existing);
      return existing.id;
    }
  }

  const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const pendingOp: PendingOperation = {
    ...operation,
    id,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await db.put('pendingOperations', pendingOp);
  return id;
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingOperations', 'by-created');
}

export async function removePendingOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingOperations', id);
}

export async function updateOperationRetry(
  id: string,
  error: string
): Promise<void> {
  const db = await getDB();
  const op = await db.get('pendingOperations', id);

  if (op) {
    op.retryCount += 1;
    op.lastError = error;
    await db.put('pendingOperations', op);
  }
}

export async function getPendingOperationCount(): Promise<number> {
  const db = await getDB();
  return db.count('pendingOperations');
}

// =============================================================================
// METADATA HELPERS
// =============================================================================

export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('metadata', {
    key,
    value,
    updatedAt: Date.now(),
  });
}

export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const record = await db.get('metadata', key);
  return record?.value as T | undefined;
}

export async function getOfflineLeagueMeta(ligaId: number | string): Promise<OfflineLeagueMeta | undefined> {
  const numericLigaId = readNumericId(ligaId);
  if (numericLigaId === null) return undefined;
  const rawMeta = await getMetadata<unknown>(getOfflineLeagueMetaKey(numericLigaId));
  return normalizeOfflineLeagueMeta(rawMeta, numericLigaId);
}

export async function listOfflineLeagueMetas(): Promise<OfflineLeagueMeta[]> {
  const db = await getDB();
  const records = await db.getAll('metadata');

  return records
    .filter((record) => record.key.startsWith(OFFLINE_READY_PREFIX))
    .map((record) => {
      const fallbackLigaId = readNumericId(record.key.slice(OFFLINE_READY_PREFIX.length)) ?? undefined;
      return normalizeOfflineLeagueMeta(record.value, fallbackLigaId);
    })
    .filter((record): record is OfflineLeagueMeta => Boolean(record))
    .sort((a, b) => a.liga_id - b.liga_id);
}

export function isOfflineLeagueExpired(meta: OfflineLeagueMeta, now: number = Date.now()): boolean {
  const expiryMs = Date.parse(meta.expiresAt);
  if (!Number.isFinite(expiryMs)) return true;
  return expiryMs <= now;
}

export async function isLeaguePreparedOffline(ligaId: number | string): Promise<boolean> {
  const meta = await getOfflineLeagueMeta(ligaId);
  if (!meta) return false;
  return !isOfflineLeagueExpired(meta);
}

export async function setOfflineLeagueMeta(meta: OfflineLeagueMeta): Promise<void> {
  await setMetadata(getOfflineLeagueMetaKey(meta.liga_id), meta);
}

// =============================================================================
// CONFLICT RESOLUTION
// =============================================================================

export async function markAsConflict<T>(
  storeName: StoreName,
  entityType: string,
  entityId: number | string,
  serverData: T,
  conflictMeta?: ConflictMeta
): Promise<void> {
  const db = await getDB();
  const id = generateId(entityType, entityId);
  const record = await db.get(storeName, id);

  if (record) {
    record.syncStatus = 'conflict';
    record.conflictData = serverData as unknown;
    if (conflictMeta) {
      record.conflictMeta = conflictMeta;
    }
    await db.put(storeName, record);
  }
}

export async function resolveConflict(
  storeName: StoreName,
  entityType: string,
  entityId: number | string,
  useLocal: boolean
): Promise<void> {
  const db = await getDB();
  const id = generateId(entityType, entityId);
  const record = await db.get(storeName, id);

  if (record) {
    if (!useLocal && record.conflictData) {
      // Use server version
      record.data = record.conflictData;
    }
    record.conflictData = undefined;
    const meta = record.conflictMeta;
    record.conflictMeta = undefined;

    if (useLocal && meta) {
      await queueOperation({
        entityType,
        entityId,
        operation: meta.operation || 'update',
        endpoint: meta.endpoint,
        method: meta.method,
        payload: meta.payload ?? record.data,
      });
      record.syncStatus = 'pending';
    } else {
      record.syncStatus = 'synced';
    }

    record.lastModified = Date.now();
    await db.put(storeName, record);
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export async function bulkSave<T>(
  storeName: StoreName,
  entityType: string,
  records: Array<{ id: number | string; data: T }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');

  await Promise.all([
    ...records.map(r =>
      tx.store.put({
        id: generateId(entityType, r.id),
        entityType,
        entityId: r.id,
        data: r.data,
        lastModified: Date.now(),
        syncStatus: 'synced' as SyncStatus,
      })
    ),
    tx.done,
  ]);
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDB();
  await db.clear(storeName);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('partidos'),
    db.clear('evaluaciones'),
    db.clear('equipos'),
    db.clear('ligas'),
    db.clear('tiposDeporte'),
    db.clear('pendingOperations'),
    db.clear('metadata'),
  ]);
}

export async function clearLeagueOfflineData(
  ligaId: number | string,
  options: { force?: boolean } = {}
): Promise<{
  partidos: number;
  evaluaciones: number;
  equipos: number;
  ligas: number;
  tiposDeporte: number;
  metadata: number;
}> {
  const numericLigaId = readNumericId(ligaId);
  if (numericLigaId === null) {
    throw new Error('Liga inválida para limpieza offline');
  }

  if (!options.force) {
    const pendingOperations = await getPendingOperationCount();
    if (pendingOperations > 0) {
      throw new Error('Hay cambios pendientes de sincronizar. No se puede borrar la copia offline todavía.');
    }
  }

  const db = await getDB();
  const [partidoRecords, equipoRecords, evaluacionRecords] = await Promise.all([
    db.getAll('partidos'),
    db.getAll('equipos'),
    db.getAll('evaluaciones'),
  ]);

  const allLeaguePartidoIds = new Set(
    partidoRecords
      .filter((record) => readLeagueIdFromData(record.data) === numericLigaId)
      .map((record) => readNumericId(record.entityId))
      .filter((value): value is number => value !== null)
  );

  if (!options.force) {
    const hasProtectedLocalChanges =
      partidoRecords.some((record) =>
        readLeagueIdFromData(record.data) === numericLigaId && record.syncStatus !== 'synced'
      ) ||
      equipoRecords.some((record) =>
        readLeagueIdFromData(record.data) === numericLigaId && record.syncStatus !== 'synced'
      ) ||
      evaluacionRecords.some((record) => {
        const partidoId = readPartidoIdFromData(record.data) ?? readNumericId(record.entityId);
        return partidoId !== null && allLeaguePartidoIds.has(partidoId) && record.syncStatus !== 'synced';
      });

    if (hasProtectedLocalChanges) {
      throw new Error('Hay datos locales con cambios sin resolver en esta liga. Sincroniza o revisa conflictos antes de borrar.');
    }
  }

  const partidosToDelete = partidoRecords.filter(
    (record) => readLeagueIdFromData(record.data) === numericLigaId && record.syncStatus === 'synced'
  );
  const partidoIds = new Set(
    partidosToDelete
      .map((record) => readNumericId(record.entityId))
      .filter((value): value is number => value !== null)
  );

  const equiposToDelete = equipoRecords.filter(
    (record) => readLeagueIdFromData(record.data) === numericLigaId && record.syncStatus === 'synced'
  );

  const evaluacionesToDelete = evaluacionRecords.filter((record) => {
    if (record.syncStatus !== 'synced') return false;
    const partidoId = readPartidoIdFromData(record.data) ?? readNumericId(record.entityId);
    return partidoId !== null && partidoIds.has(partidoId);
  });

  const ligaRecordKey = generateId('liga', numericLigaId);
  const ligaRecord = await db.get('ligas', ligaRecordKey);

  await Promise.all([
    ...partidosToDelete.map((record) => db.delete('partidos', record.id)),
    ...equiposToDelete.map((record) => db.delete('equipos', record.id)),
    ...evaluacionesToDelete.map((record) => db.delete('evaluaciones', record.id)),
    ligaRecord ? db.delete('ligas', ligaRecordKey) : Promise.resolve(),
    db.delete('metadata', getOfflineLeagueMetaKey(numericLigaId)),
  ]);

  const removedSportTypes = await pruneUnusedSportTypes(db);

  return {
    partidos: partidosToDelete.length,
    evaluaciones: evaluacionesToDelete.length,
    equipos: equiposToDelete.length,
    ligas: ligaRecord ? 1 : 0,
    tiposDeporte: removedSportTypes,
    metadata: 1,
  };
}

export async function enforceOfflineGovernance(): Promise<{
  expiredLeagueIds: number[];
  removedUnscopedRecords: number;
}> {
  const db = await getDB();
  const metas = await listOfflineLeagueMetas();
  const now = Date.now();

  const expiredLeagueIds = metas
    .filter((meta) => isOfflineLeagueExpired(meta, now))
    .map((meta) => meta.liga_id);

  for (const ligaId of expiredLeagueIds) {
    await clearLeagueOfflineData(ligaId, { force: true });
  }

  const activeLeagueIds = new Set(
    metas
      .filter((meta) => !isOfflineLeagueExpired(meta, now))
      .map((meta) => meta.liga_id)
  );

  const [partidoRecords, equipoRecords, ligaRecords, evaluacionRecords] = await Promise.all([
    db.getAll('partidos'),
    db.getAll('equipos'),
    db.getAll('ligas'),
    db.getAll('evaluaciones'),
  ]);

  const partidosToDelete = partidoRecords.filter((record) => {
    if (record.syncStatus !== 'synced') return false;
    const leagueId = readLeagueIdFromData(record.data);
    return leagueId !== null && !activeLeagueIds.has(leagueId);
  });

  const activePartidoIds = new Set<number>(
    partidoRecords
      .filter((record) => !partidosToDelete.some((candidate) => candidate.id === record.id))
      .map((record) => readNumericId(record.entityId))
      .filter((value): value is number => value !== null)
  );

  const equiposToDelete = equipoRecords.filter((record) => {
    if (record.syncStatus !== 'synced') return false;
    const leagueId = readLeagueIdFromData(record.data);
    return leagueId !== null && !activeLeagueIds.has(leagueId);
  });

  const ligasToDelete = ligaRecords.filter((record) => {
    if (record.syncStatus !== 'synced') return false;
    const leagueId = readNumericId(record.entityId);
    return leagueId !== null && !activeLeagueIds.has(leagueId);
  });

  const evaluacionesToDelete = evaluacionRecords.filter((record) => {
    if (record.syncStatus !== 'synced') return false;
    const partidoId = readPartidoIdFromData(record.data) ?? readNumericId(record.entityId);
    return partidoId !== null && !activePartidoIds.has(partidoId);
  });

  await Promise.all([
    ...partidosToDelete.map((record) => db.delete('partidos', record.id)),
    ...equiposToDelete.map((record) => db.delete('equipos', record.id)),
    ...ligasToDelete.map((record) => db.delete('ligas', record.id)),
    ...evaluacionesToDelete.map((record) => db.delete('evaluaciones', record.id)),
  ]);

  const removedUnscopedRecords =
    partidosToDelete.length +
    equiposToDelete.length +
    ligasToDelete.length +
    evaluacionesToDelete.length +
    await pruneUnusedSportTypes(db);

  return {
    expiredLeagueIds,
    removedUnscopedRecords,
  };
}

export async function clearOfflineData(): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

// =============================================================================
// STATS & DEBUGGING
// =============================================================================

export async function getOfflineStats(): Promise<{
  partidos: number;
  evaluaciones: number;
  equipos: number;
  ligas: number;
  tiposDeporte: number;
  pendingOperations: number;
  conflicts: number;
  preparedLeagues: number;
  expiredLeagues: number;
}> {
  const db = await getDB();

  const [partidos, evaluaciones, equipos, ligas, tiposDeporte, pendingOps] = await Promise.all([
    db.count('partidos'),
    db.count('evaluaciones'),
    db.count('equipos'),
    db.count('ligas'),
    db.count('tiposDeporte'),
    db.count('pendingOperations'),
  ]);

  // Count conflicts across all stores
  const [pConflicts, eConflicts] = await Promise.all([
    db.countFromIndex('partidos', 'by-sync-status', 'conflict'),
    db.countFromIndex('evaluaciones', 'by-sync-status', 'conflict'),
  ]);

  const leagueMetas = await listOfflineLeagueMetas();
  const expiredLeagues = leagueMetas.filter((meta) => isOfflineLeagueExpired(meta)).length;

  return {
    partidos,
    evaluaciones,
    equipos,
    ligas,
    tiposDeporte,
    pendingOperations: pendingOps,
    conflicts: pConflicts + eConflicts,
    preparedLeagues: leagueMetas.length,
    expiredLeagues,
  };
}
