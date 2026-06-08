/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNetworkStore } from './useNetworkStatus';
import {
  getPendingOperations,
  removePendingOperation,
  updateOperationRetry,
  queueOperation,
  saveRecord,
  getRecord,
  markAsConflict,
  getPendingOperationCount,
  getConflictRecords,
  type PendingOperation,
} from '@/lib/offline/offlineDB';
import { apiClient, restoreCurrentUserSession } from '@/api/client';
import axios from 'axios';

// Conflict threshold: 5 minutes
// If both versions were modified within 5 minutes, show manual resolution
const CONFLICT_THRESHOLD_MS = 5 * 60 * 1000;

// Max retries before giving up on an operation
const MAX_RETRIES = 3;

type StoreName = 'partidos' | 'evaluaciones' | 'equipos' | 'ligas' | 'tiposDeporte';

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
}

type VersionedPayload = Record<string, unknown> & {
  expected_version?: string;
};

function isPublicOperation(op: PendingOperation): boolean {
  return op.endpoint.startsWith('/public/');
}

function isVersionedPayload(payload: unknown): payload is VersionedPayload {
  return Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload);
}

function getServerVersion(serverData: unknown): string | null {
  if (!serverData || typeof serverData !== 'object' || Array.isArray(serverData)) return null;
  const data = serverData as Record<string, unknown>;
  const version =
    data.marcador_version ??
    data.evaluacion_version ??
    data.version;
  return typeof version === 'string' && version.length > 0 ? version : null;
}

function withExpectedVersion(payload: unknown, expectedVersion: string): unknown {
  if (!isVersionedPayload(payload)) return payload;
  return {
    ...payload,
    expected_version: expectedVersion,
  };
}

export function useOfflineSync() {
  const { isOnline, setPendingCount, setConflictCount, setLastSyncTime } = useNetworkStore();
  const syncInProgress = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canAttemptOnline = isOnline;

  const updateCounts = useCallback(async () => {
    const pendingCount = await getPendingOperationCount();
    setPendingCount(pendingCount);

    const [pConflicts, eConflicts] = await Promise.all([
      getConflictRecords('partidos'),
      getConflictRecords('evaluaciones'),
    ]);
    setConflictCount(pConflicts.length + eConflicts.length);
  }, [setPendingCount, setConflictCount]);

  const processOperation = useCallback(async (op: PendingOperation): Promise<boolean> => {
    try {
      const requestWithPayload = async (payload: unknown) => {
        switch (op.method) {
          case 'POST':
            return apiClient.client.post(op.endpoint, payload);
          case 'PUT':
            return apiClient.client.put(op.endpoint, payload);
          case 'PATCH':
            return apiClient.client.patch(op.endpoint, payload);
          case 'DELETE':
            return apiClient.client.delete(op.endpoint);
        }
      };

      try {
        await requestWithPayload(op.payload);
        await removePendingOperation(op.id);
        return true;
      } catch (firstError: unknown) {
        if (axios.isAxiosError(firstError) && firstError.response?.status === 409) {
          const serverData = firstError.response.data?.serverData;
          const serverVersion = getServerVersion(serverData);
          const hasExpectedVersion = isVersionedPayload(op.payload) && typeof op.payload.expected_version === 'string';

          if (serverVersion && hasExpectedVersion && op.method !== 'DELETE') {
            const retryPayload = withExpectedVersion(op.payload, serverVersion);
            try {
              await requestWithPayload(retryPayload);
              await removePendingOperation(op.id);
              return true;
            } catch {
              // fallthrough to conflict handling below
            }
          }
        }
        throw firstError;
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await updateOperationRetry(op.id, 'auth_required');
        return false;
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        await updateOperationRetry(op.id, 'forbidden');
        if (op.retryCount + 1 >= MAX_RETRIES) {
          await removePendingOperation(op.id);
        }
        return false;
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const serverData = error.response.data?.serverData;
        if (serverData) {
          const storeName = getStoreNameForEntity(op.entityType);
          if (storeName) {
            await markAsConflict(storeName, op.entityType, op.entityId, serverData, {
              endpoint: op.endpoint,
              method: op.method,
              operation: op.operation,
              payload: op.payload,
            });
          }
        }
        await removePendingOperation(op.id);
        return false;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateOperationRetry(op.id, errorMessage);

      if (op.retryCount >= MAX_RETRIES) {
        console.error(`Operation ${op.id} failed after ${MAX_RETRIES} retries, removing from queue`);
        await removePendingOperation(op.id);
      }

      return false;
    }
  }, []);

  const syncPendingOperations = useCallback(async (): Promise<SyncResult> => {
    if (syncInProgress.current || !canAttemptOnline) {
      return { success: false, syncedCount: 0, failedCount: 0, conflictCount: 0 };
    }

    syncInProgress.current = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const operations = await getPendingOperations();
      const publicOperations = operations.filter(isPublicOperation);
      const privateOperations = operations.filter((op) => !isPublicOperation(op));

      // Las operaciones públicas por PIN no necesitan sesión docente en ese dispositivo.
      // El resto sigue protegido por la sesión del usuario autenticado.
      const sessionOk = privateOperations.length > 0
        ? await restoreCurrentUserSession()
        : true;
      if (!sessionOk) {
        failedCount += privateOperations.length;
      }
      const operationsToProcess = sessionOk
        ? operations
        : publicOperations;

      for (const op of operationsToProcess) {
        const success = await processOperation(op);
        if (success) {
          syncedCount++;
        } else {
          failedCount++;
        }
      }

      const [pConflicts, eConflicts] = await Promise.all([
        getConflictRecords('partidos'),
        getConflictRecords('evaluaciones'),
      ]);
      const conflictCount = pConflicts.length + eConflicts.length;

      setLastSyncTime(Date.now());
      await updateCounts();

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        conflictCount,
      };
    } finally {
      syncInProgress.current = false;
    }
  }, [canAttemptOnline, processOperation, setLastSyncTime, updateCounts]);

  const saveWithOfflineSupport = useCallback(async <T, L = unknown>(
    storeName: StoreName,
    entityType: string,
    entityId: number | string,
    data: T,
    options: {
      endpoint: string;
      method: 'POST' | 'PUT' | 'PATCH';
      isNew?: boolean;
      localData?: L;
    }
  ): Promise<{ success: boolean; isOffline: boolean; serverData?: T }> => {
    const now = Date.now();
    const recordData = options.localData ?? data;
    const recordPayload =
      recordData && typeof recordData === 'object' && !Array.isArray(recordData)
        ? { ...(recordData as Record<string, unknown>), _localModified: now }
        : { value: recordData as unknown, _localModified: now };

    await saveRecord(storeName, entityType, entityId, recordPayload, {
      syncStatus: 'pending',
    });

    if (canAttemptOnline) {
      try {
        let response;
        if (options.method === 'POST') {
          response = await apiClient.client.post(options.endpoint, data);
        } else if (options.method === 'PUT') {
          response = await apiClient.client.put(options.endpoint, data);
        } else {
          response = await apiClient.client.patch(options.endpoint, data);
        }

        const serverData = response.data;
        await saveRecord(storeName, entityType, serverData.id || entityId, serverData, {
          syncStatus: 'synced',
          serverVersion: serverData.updated_at ? new Date(serverData.updated_at).getTime() : now,
        });

        return { success: true, isOffline: false, serverData };
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          await queueOperation({
            entityType,
            entityId,
            operation: options.isNew ? 'create' : 'update',
            endpoint: options.endpoint,
            method: options.method,
            payload: data,
          });
          await updateCounts();
          return { success: true, isOffline: true };
        }

        if (axios.isAxiosError(error) && error.response?.status === 409) {
          const serverData = error.response.data?.serverData;
          const storeForEntity = getStoreNameForEntity(entityType);
          const serverVersion = getServerVersion(serverData);
          const hasExpectedVersion = isVersionedPayload(data) && typeof data.expected_version === 'string';

          if (serverVersion && hasExpectedVersion && options.method !== 'POST') {
            try {
              const retryPayload = withExpectedVersion(data, serverVersion) as T;
              const retryResponse = options.method === 'PUT'
                ? await apiClient.client.put(options.endpoint, retryPayload)
                : await apiClient.client.patch(options.endpoint, retryPayload);

              const retryServerData = retryResponse.data;
              await saveRecord(storeName, entityType, retryServerData.id || entityId, retryServerData, {
                syncStatus: 'synced',
                serverVersion: retryServerData.updated_at ? new Date(retryServerData.updated_at).getTime() : now,
              });
              return { success: true, isOffline: false, serverData: retryServerData };
            } catch {
              // continue to manual conflict if retry fails
            }
          }

          if (serverData && storeForEntity) {
            await markAsConflict(storeForEntity, entityType, entityId, serverData, {
              endpoint: options.endpoint,
              method: options.method,
              operation: options.isNew ? 'create' : 'update',
              payload: data,
            });
          }
          await updateCounts();
          return { success: false, isOffline: false, serverData };
        }

        console.error('Online save failed, queueing for sync:', error);

        await saveRecord(storeName, entityType, entityId, recordPayload, {
          syncStatus: 'pending',
        });

        await queueOperation({
          entityType,
          entityId,
          operation: options.isNew ? 'create' : 'update',
          endpoint: options.endpoint,
          method: options.method,
          payload: data,
        });

        await updateCounts();
        return { success: true, isOffline: true };
      }
    }

    await queueOperation({
      entityType,
      entityId,
      operation: options.isNew ? 'create' : 'update',
      endpoint: options.endpoint,
      method: options.method,
      payload: data,
    });

    await updateCounts();
    return { success: true, isOffline: true };
  }, [canAttemptOnline, updateCounts]);

  const deleteWithOfflineSupport = useCallback(async (
    storeName: StoreName,
    entityType: string,
    entityId: number | string,
    endpoint: string
  ): Promise<{ success: boolean; isOffline: boolean }> => {
    const existing = await getRecord(storeName, entityType, entityId);
    if (existing) {
      await saveRecord(storeName, entityType, entityId, {
        ...existing.data as Record<string, unknown>,
        _deleted: true,
      }, {
        syncStatus: 'pending',
      });
    }

    if (canAttemptOnline) {
      try {
        await apiClient.client.delete(endpoint);

        const db = await import('@/lib/offline/offlineDB');
        await db.deleteRecord(storeName, entityType, entityId);

        return { success: true, isOffline: false };
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          await queueOperation({
            entityType,
            entityId,
            operation: 'delete',
            endpoint,
            method: 'DELETE',
          });
          await updateCounts();
          return { success: true, isOffline: true };
        }

        console.error('Online delete failed, queueing for sync:', error);

        await queueOperation({
          entityType,
          entityId,
          operation: 'delete',
          endpoint,
          method: 'DELETE',
        });

        await updateCounts();
        return { success: true, isOffline: true };
      }
    }

    await queueOperation({
      entityType,
      entityId,
      operation: 'delete',
      endpoint,
      method: 'DELETE',
    });

    await updateCounts();
    return { success: true, isOffline: true };
  }, [canAttemptOnline, updateCounts]);

  useEffect(() => {
    if (canAttemptOnline && !syncInProgress.current) {
      syncTimeoutRef.current = setTimeout(() => {
        void syncPendingOperations();
      }, 2000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [canAttemptOnline, syncPendingOperations]);

  useEffect(() => {
    void updateCounts();
  }, [updateCounts]);

  return {
    syncPendingOperations,
    saveWithOfflineSupport,
    deleteWithOfflineSupport,
    isOnline,
    isSyncing: syncInProgress.current,
  };
}

function getStoreNameForEntity(entityType: string): StoreName | null {
  const mapping: Record<string, StoreName> = {
    partido: 'partidos',
    partidos: 'partidos',
    evaluacion: 'evaluaciones',
    evaluaciones: 'evaluaciones',
    evaluacion_personalizada: 'evaluaciones',
    equipo: 'equipos',
    equipos: 'equipos',
    liga: 'ligas',
    ligas: 'ligas',
    tipoDeporte: 'tiposDeporte',
    tiposDeporte: 'tiposDeporte',
  };

  return mapping[entityType] || null;
}

export async function shouldAutoResolve(
  localModified: number,
  serverModified: number
): Promise<boolean> {
  return Math.abs(localModified - serverModified) > CONFLICT_THRESHOLD_MS;
}

export async function autoResolveConflict<T extends { updated_at?: string }>(
  storeName: StoreName,
  entityType: string,
  entityId: number | string,
  localData: T,
  serverData: T,
  localModified: number
): Promise<'local' | 'server'> {
  const serverModified = serverData.updated_at
    ? new Date(serverData.updated_at).getTime()
    : 0;

  if (localModified > serverModified) {
    await saveRecord(storeName, entityType, entityId, localData, {
      syncStatus: 'pending',
      serverVersion: serverModified,
    });
    return 'local';
  }

  await saveRecord(storeName, entityType, entityId, serverData, {
    syncStatus: 'synced',
    serverVersion: serverModified,
  });
  return 'server';
}
