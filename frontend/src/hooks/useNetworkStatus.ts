/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSiteBaseUrl } from '@/utils/url';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | undefined;
  effectiveType: string | undefined;
  lastOnline: number | null;
  lastOffline: number | null;
}

interface NetworkInformation {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  type: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

const getConnection = (): NetworkInformation | undefined => {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const REQUIRED_CONSECUTIVE_FAILURES = 2;

export function useNetworkStatus(): NetworkStatus & {
  checkConnection: () => Promise<boolean>;
} {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: getConnection()?.type,
    effectiveType: getConnection()?.effectiveType,
    lastOnline: null,
    lastOffline: null,
  }));

  const checkInProgressRef = useRef(false);
  const successStreakRef = useRef(0);
  const failureStreakRef = useRef(0);

  // Check if we actually have internet (not just network connection)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to verify actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const healthUrl = `${getSiteBaseUrl()}/api/live`;

      const response = await fetch(healthUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    successStreakRef.current = 1;
    failureStreakRef.current = 0;
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnline: Date.now(),
    }));
  }, []);

  // Handle offline event
  const handleOffline = useCallback(() => {
    successStreakRef.current = 0;
    failureStreakRef.current = REQUIRED_CONSECUTIVE_FAILURES;
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastOffline: Date.now(),
    }));
  }, []);

  // Handle connection change
  const handleConnectionChange = useCallback(() => {
    const connection = getConnection();

    if (connection) {
      const isSlowConnection =
        connection.effectiveType === '2g' ||
        connection.effectiveType === 'slow-2g' ||
        connection.downlink < 1; // Less than 1 Mbps

      setStatus(prev => ({
        ...prev,
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
        isSlowConnection,
      }));
    }
  }, []);

  useEffect(() => {
    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial check (deferred to avoid synchronous setState in effect body)
    const initialConnectionCheck = setTimeout(() => {
      handleConnectionChange();
    }, 0);

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(async () => {
      if (checkInProgressRef.current) {
        return;
      }

      checkInProgressRef.current = true;
      const actuallyOnline = await checkConnection();
      checkInProgressRef.current = false;

      if (actuallyOnline) {
        successStreakRef.current += 1;
        failureStreakRef.current = 0;
      } else {
        successStreakRef.current = 0;
        failureStreakRef.current += 1;
      }

      setStatus(prev => {
        const shouldSwitchToOnline = actuallyOnline && !prev.isOnline;
        const shouldSwitchToOffline =
          !actuallyOnline &&
          prev.isOnline &&
          failureStreakRef.current >= REQUIRED_CONSECUTIVE_FAILURES;

        if (!shouldSwitchToOnline && !shouldSwitchToOffline) {
          return prev;
        }

        return {
          ...prev,
          isOnline: shouldSwitchToOnline,
          ...(shouldSwitchToOnline
            ? { lastOnline: Date.now() }
            : { lastOffline: Date.now() }),
        };
      });
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }

      clearTimeout(initialConnectionCheck);
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, handleConnectionChange, checkConnection]);

  return {
    ...status,
    checkConnection,
  };
}

// Zustand store for global network status
import { create } from 'zustand';

interface NetworkStore {
  isOnline: boolean;
  isSlowConnection: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncTime: number | null;
  setOnline: (online: boolean) => void;
  setSlowConnection: (slow: boolean) => void;
  setPendingCount: (count: number) => void;
  setConflictCount: (count: number) => void;
  setLastSyncTime: (time: number) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSlowConnection: false,
  pendingCount: 0,
  conflictCount: 0,
  lastSyncTime: null,
  setOnline: (online) => set({ isOnline: online }),
  setSlowConnection: (slow) => set({ isSlowConnection: slow }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setConflictCount: (count) => set({ conflictCount: count }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
}));
