/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Smartphone, Cloud, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { getConflictRecords, resolveConflict, type OfflineRecord } from '@/lib/offline/offlineDB';
import { useNetworkStore } from '@/hooks/useNetworkStatus';

interface ConflictItem {
  storeName: 'partidos' | 'evaluaciones';
  record: OfflineRecord<unknown>;
}

export function ConflictResolutionDialog() {
  const { t } = useTranslation();
  const { conflictCount, setConflictCount } = useNetworkStore();
  const [isOpen, setIsOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

  // Load conflicts when count changes
  useEffect(() => {
    if (conflictCount > 0) {
      loadConflicts();
    }
  }, [conflictCount]);

  const loadConflicts = async () => {
    const [partidoConflicts, evaluacionConflicts] = await Promise.all([
      getConflictRecords<unknown>('partidos'),
      getConflictRecords<unknown>('evaluaciones'),
    ]);

    const allConflicts: ConflictItem[] = [
      ...partidoConflicts.map(r => ({ storeName: 'partidos' as const, record: r })),
      ...evaluacionConflicts.map(r => ({ storeName: 'evaluaciones' as const, record: r })),
    ];

    setConflicts(allConflicts);
    if (allConflicts.length > 0) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  };

  const handleResolve = async (useLocal: boolean) => {
    if (conflicts.length === 0) return;

    setIsResolving(true);
    try {
      const current = conflicts[currentIndex];
      await resolveConflict(
        current.storeName,
        current.record.entityType,
        current.record.entityId,
        useLocal
      );

      // Move to next or close
      if (currentIndex < conflicts.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsOpen(false);
        setConflicts([]);
        setCurrentIndex(0);
      }

      // Update count
      setConflictCount(Math.max(0, conflictCount - 1));
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveAll = async (useLocal: boolean) => {
    setIsResolving(true);
    try {
      for (const conflict of conflicts) {
        await resolveConflict(
          conflict.storeName,
          conflict.record.entityType,
          conflict.record.entityId,
          useLocal
        );
      }

      setIsOpen(false);
      setConflicts([]);
      setCurrentIndex(0);
      setConflictCount(0);
    } finally {
      setIsResolving(false);
    }
  };

  if (conflicts.length === 0) return null;

  const current = conflicts[currentIndex];
  const localData = current.record.data as Record<string, unknown>;
  const serverData = current.record.conflictData as Record<string, unknown>;

  // Get display name for the entity
  const getEntityName = (): string => {
    if (current.storeName === 'partidos') {
      return (localData.nombre as string) || `Partido #${current.record.entityId}`;
    }
    if (current.storeName === 'evaluaciones') {
      return `Evaluación #${current.record.entityId}`;
    }
    return `${current.record.entityType} #${current.record.entityId}`;
  };

  // Get key differences
  const getDifferences = () => {
    const differences: Array<{
      key: string;
      localValue: unknown;
      serverValue: unknown;
    }> = [];

    const allKeys = new Set([
      ...Object.keys(localData || {}),
      ...Object.keys(serverData || {}),
    ]);

    for (const key of allKeys) {
      // Skip internal keys
      if (key.startsWith('_')) continue;

      const localVal = localData?.[key];
      const serverVal = serverData?.[key];

      if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
        differences.push({
          key,
          localValue: localVal,
          serverValue: serverVal,
        });
      }
    }

    return differences;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl bg-lme-surface border-lme-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ink">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            {t('conflict.title', 'Conflicto de Datos')}
          </DialogTitle>
          <DialogDescription className="text-sub">
            {t('conflict.description', 'Se han encontrado diferencias entre tu versión local y la del servidor. Elige qué versión mantener.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          {conflicts.length > 1 && (
            <div className="flex items-center justify-between text-sm text-sub">
              <span>{t('conflict.progress', 'Conflicto {{current}} de {{total}}', { current: currentIndex + 1, total: conflicts.length })}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveAll(true)}
                  disabled={isResolving}
                >
                  {t('conflict.useAllLocal', 'Usar todos los locales')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveAll(false)}
                  disabled={isResolving}
                >
                  {t('conflict.useAllServer', 'Usar todos del servidor')}
                </Button>
              </div>
            </div>
          )}

          {/* Entity info */}
          <div className="bg-lme-surface-soft rounded-lg p-4 border border-lme-border">
            <h4 className="font-semibold text-ink mb-2">{getEntityName()}</h4>
            <p className="text-sm text-sub">
              {current.storeName === 'partidos' && t('conflict.entityType.partido', 'Datos de partido')}
              {current.storeName === 'evaluaciones' && t('conflict.entityType.evaluacion', 'Datos de evaluación')}
            </p>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Local version */}
            <div className="bg-sky/10 rounded-lg p-4 border border-sky/30">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-sky" />
                <span className="font-semibold text-sky">{t('conflict.localVersion', 'Tu versión')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-sub mb-3">
                <Clock className="h-3 w-3" />
                <span>{formatDate(current.record.lastModified)}</span>
              </div>
              <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {getDifferences().map(diff => (
                  <div key={diff.key} className="bg-sky/5 rounded p-2">
                    <span className="text-sub text-xs">{diff.key}:</span>
                    <pre className="text-ink text-xs mt-1 whitespace-pre-wrap break-words">
                      {formatValue(diff.localValue)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Server version */}
            <div className="bg-vio/10 rounded-lg p-4 border border-vio/30">
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="h-4 w-4 text-vio" />
                <span className="font-semibold text-vio">{t('conflict.serverVersion', 'Versión del servidor')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-sub mb-3">
                <Clock className="h-3 w-3" />
                <span>
                  {current.record.serverVersion
                    ? formatDate(current.record.serverVersion)
                    : t('conflict.unknownTime', 'Hora desconocida')}
                </span>
              </div>
              <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {getDifferences().map(diff => (
                  <div key={diff.key} className="bg-vio/5 rounded p-2">
                    <span className="text-sub text-xs">{diff.key}:</span>
                    <pre className="text-ink text-xs mt-1 whitespace-pre-wrap break-words">
                      {formatValue(diff.serverValue)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-lme-border">
            <Button
              variant="outline"
              onClick={() => handleResolve(false)}
              disabled={isResolving}
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              {t('conflict.useServer', 'Usar servidor')}
            </Button>
            <Button
              onClick={() => handleResolve(true)}
              disabled={isResolving}
              className="flex items-center gap-2 bg-sky hover:bg-sky/90"
            >
              <Smartphone className="h-4 w-4" />
              {t('conflict.useLocal', 'Usar mi versión')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
