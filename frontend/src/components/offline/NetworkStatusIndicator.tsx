/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, AlertTriangle, Loader2, Check } from 'lucide-react';
import { useNetworkStore } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTranslation } from 'react-i18next';

interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
  position?: 'navbar' | 'floating' | 'inline';
}

export function NetworkStatusIndicator({
  showDetails = false,
  position = 'navbar',
}: NetworkStatusIndicatorProps) {
  const { t } = useTranslation();
  const { isOnline, pendingCount, conflictCount, lastSyncTime } = useNetworkStore();
  const { syncPendingOperations } = useOfflineSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Show toast when going online/offline
  useEffect(() => {
    if (!isOnline) {
      setToastMessage(t('offline.nowOffline', 'Estás trabajando sin conexión. Los cambios se guardarán localmente.'));
      setShowToast(true);
    } else if (pendingCount > 0) {
      setToastMessage(t('offline.syncingChanges', 'Conexión restaurada. Sincronizando {{count}} cambios...', { count: pendingCount }));
      setShowToast(true);
    }

    const timeout = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(timeout);
  }, [isOnline, pendingCount, t]);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingOperations();
      if (result.syncedCount > 0) {
        setToastMessage(t('offline.syncComplete', '{{count}} cambios sincronizados correctamente', { count: result.syncedCount }));
        setShowToast(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-400" />;
    }
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 text-mint animate-spin" />;
    }
    if (pendingCount > 0) {
      return <Cloud className="h-4 w-4 text-yellow-400" />;
    }
    if (conflictCount > 0) {
      return <AlertTriangle className="h-4 w-4 text-orange-400" />;
    }
    return <Wifi className="h-4 w-4 text-mint" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return t('offline.offline', 'Sin conexión');
    }
    if (isSyncing) {
      return t('offline.syncing', 'Sincronizando...');
    }
    if (pendingCount > 0) {
      return t('offline.pendingChanges', '{{count}} pendientes', { count: pendingCount });
    }
    if (conflictCount > 0) {
      return t('offline.conflicts', '{{count}} conflictos', { count: conflictCount });
    }
    return t('offline.synced', 'Sincronizado');
  };

  const getStatusVariant = () => {
    if (!isOnline) return 'status-chip--danger';
    if (isSyncing || pendingCount > 0 || conflictCount > 0) return 'status-chip--warning';
    return 'status-chip--success';
  };

  // Navbar style
  if (position === 'navbar') {
    return (
      <>
        <button
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className={`
            status-chip ${getStatusVariant()} transition-all
            text-xs md:text-sm
            ${isSyncing ? 'cursor-wait' : isOnline ? 'cursor-pointer' : 'cursor-not-allowed'}
          `}
          title={isOnline ? t('offline.clickToSync', 'Clic para sincronizar') : t('offline.waitingConnection', 'Esperando conexión')}
        >
          {getStatusIcon()}
          {showDetails && (
            <span>
              {t('offline.statusLabel', 'Red')}: {getStatusText()}
            </span>
          )}
        </button>

        {/* Toast notification */}
        {showToast && (
          <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 duration-300">
            <div className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
              ${!isOnline
                ? 'bg-red-950/95 border-red-300/60 text-red-100'
                : 'bg-lme-surface border-lme-border text-ink'
              }
            `}>
              {!isOnline ? (
                <CloudOff className="h-5 w-5 text-red-400" />
              ) : (
                <Check className="h-5 w-5 text-mint" />
              )}
              <span className="text-sm">{toastMessage}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  // Floating style (for mobile/tablet)
  if (position === 'floating') {
    if (isOnline && pendingCount === 0 && conflictCount === 0) {
      return null; // Don't show when everything is synced
    }

    return (
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 max-w-[calc(100vw-2rem)]">
        <button
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className={`
            status-chip ${getStatusVariant()} shadow-lg text-sm transition-all
          `}
        >
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </button>
      </div>
    );
  }

  // Inline style
  return (
    <div className="flex items-center gap-2 text-sm">
      {getStatusIcon()}
      <span className={!isOnline ? 'text-red-300' : 'text-sub'}>{getStatusText()}</span>
      {lastSyncTime && isOnline && (
        <span className="text-sub/70 text-xs">
          {t('offline.lastSync', 'Última sync')}: {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
