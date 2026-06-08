/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useNetworkStatus, useNetworkStore } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { enforceOfflineGovernance, getOfflineStats } from '@/lib/offline/offlineDB';
import { toast } from 'sonner';

interface OfflineProviderProps {
  children: ReactNode;
}

const SW_CONTROLLER_RELOAD_KEY = 'edumind:sw-controller-reload:v1';
const SW_CONTROLLER_RELOAD_COOLDOWN_MS = 15000;

export function OfflineProvider({ children }: OfflineProviderProps) {
  const networkStatus = useNetworkStatus();
  const { setOnline, setSlowConnection, setPendingCount, setConflictCount, pendingCount } = useNetworkStore();
  const { syncPendingOperations } = useOfflineSync();
  const pendingCountRef = useRef(pendingCount);

  useEffect(() => {
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);

  // Sync network status to store
  useEffect(() => {
    setOnline(networkStatus.isOnline);
    setSlowConnection(networkStatus.isSlowConnection);
  }, [networkStatus.isOnline, networkStatus.isSlowConnection, setOnline, setSlowConnection]);

  // Load initial offline stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const governance = await enforceOfflineGovernance();
        if (governance.expiredLeagueIds.length > 0) {
          toast.info(
            governance.expiredLeagueIds.length === 1
              ? 'Se ha eliminado una copia offline caducada por privacidad.'
              : `Se han eliminado ${governance.expiredLeagueIds.length} copias offline caducadas por privacidad.`
          );
        }
        if (governance.removedUnscopedRecords > 0) {
          toast.info('Se ha limpiado caché local no preparada explícitamente para modo offline.');
        }
        const stats = await getOfflineStats();
        setPendingCount(stats.pendingOperations);
        setConflictCount(stats.conflicts);
      } catch (error) {
        console.error('Error loading offline stats:', error);
      }
    };

    loadStats();
  }, [setPendingCount, setConflictCount]);

  // Register service worker update handler
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registrationRef: ServiceWorkerRegistration | null = null;
    let updateIntervalId: number | null = null;
    let updateToastShown = false;
    let controllerChangeHandled = false;

    const guardedReload = () => {
      const now = Date.now();
      try {
        const lastReloadRaw = window.sessionStorage.getItem(SW_CONTROLLER_RELOAD_KEY);
        const lastReloadAt = lastReloadRaw ? Number(lastReloadRaw) : 0;
        if (Number.isFinite(lastReloadAt) && now - lastReloadAt < SW_CONTROLLER_RELOAD_COOLDOWN_MS) {
          return;
        }
        window.sessionStorage.setItem(SW_CONTROLLER_RELOAD_KEY, String(now));
      } catch {
        // Ignore storage issues and continue with reload fallback.
      }
      window.location.reload();
    };

    const requestUpdateActivation = (registration: ServiceWorkerRegistration): boolean => {
      if (!registration.waiting) return false;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    };

    const notifyReload = (registration: ServiceWorkerRegistration, hasPendingChanges: boolean) => {
      if (updateToastShown) return;
      updateToastShown = true;

      const message = hasPendingChanges
        ? 'Nueva version lista. Recarga cuando termines para mantener tus cambios pendientes.'
        : 'Nueva version lista. Recarga cuando te venga bien para aplicar la ultima version.';

      toast(message, {
        action: {
          label: 'Recargar',
          onClick: () => {
            requestUpdateActivation(registration);
            guardedReload();
          }
        },
        duration: hasPendingChanges ? 15000 : 9000
      });
    };

    const applyUpdateIfSafe = (registration: ServiceWorkerRegistration) => {
      const hasPendingChanges = pendingCountRef.current > 0;
      notifyReload(registration, hasPendingChanges);
    };

    const onUpdateFound = () => {
      const registration = registrationRef;
      if (!registration) return;

      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          applyUpdateIfSafe(registration);
        }
      });
    };

    const onControllerChange = () => {
      if (controllerChangeHandled) return;
      controllerChangeHandled = true;

      if (!updateToastShown) {
        updateToastShown = true;
        toast('Version instalada. Recarga cuando te venga bien para ver la version nueva.', {
          action: {
            label: 'Recargar',
            onClick: () => guardedReload(),
          },
          duration: 15000,
        });
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.ready.then((registration) => {
      registrationRef = registration;
      registration.addEventListener('updatefound', onUpdateFound);
      if (registration.waiting && navigator.serviceWorker.controller) {
        applyUpdateIfSafe(registration);
      }

      const checkForUpdates = () => {
        void registration.update().catch(() => undefined);
      };
      checkForUpdates();
      updateIntervalId = window.setInterval(checkForUpdates, 5 * 60 * 1000);
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (registrationRef) {
        registrationRef.removeEventListener('updatefound', onUpdateFound);
      }
      if (updateIntervalId) {
        window.clearInterval(updateIntervalId);
      }
    };
  }, []);

  // Auth expiration notifications from offline sync workflows
  useEffect(() => {
    const onAuthExpired = () => {
      toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión para sincronizar los cambios pendientes.');
    };

    window.addEventListener('edumind:auth-expired', onAuthExpired);
    return () => window.removeEventListener('edumind:auth-expired', onAuthExpired);
  }, []);

  useEffect(() => {
    if (!networkStatus.isOnline) return;

    const sync = () => {
      void syncPendingOperations();
    };

    const timeoutId = window.setTimeout(sync, 1500);
    const onVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        sync();
      }
    };
    const onOnline = () => sync();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, [networkStatus.isOnline, syncPendingOperations]);

  return (
    <>
      {children}
      <ConflictResolutionDialog />
    </>
  );
}
