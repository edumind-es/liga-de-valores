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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'  // Initialize i18n before app
import App from './App.tsx'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/react-query'
import { Toaster } from 'sonner'
import { initializeMatomo } from './lib/matomo'

const AUTO_RECOVERY_KEY = 'edumind:auto-recover:v1';
const AUTO_RECOVERY_COOLDOWN_MS = 2 * 60 * 1000;

async function refreshServiceWorkerBeforeReload(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      try {
        await registration.update();
      } catch {
        // Ignore update failures and continue with reload strategy.
      }

      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    }),
  );
}

function shouldRecoverFromRuntimeError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? `${reason.message} ${reason.stack ?? ''}`.toLowerCase()
      : String(reason ?? '').toLowerCase();

  return (
    message.includes('minified react error #310') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading module script')
  );
}

function recoverAppIfNeeded(reason: unknown): void {
  if (typeof window === 'undefined') return;
  if (!shouldRecoverFromRuntimeError(reason)) return;

  try {
    const now = Date.now();
    const lastRecoverRaw = window.sessionStorage.getItem(AUTO_RECOVERY_KEY);
    const lastRecoverAt = lastRecoverRaw ? Number(lastRecoverRaw) : 0;
    if (Number.isFinite(lastRecoverAt) && now - lastRecoverAt < AUTO_RECOVERY_COOLDOWN_MS) {
      return;
    }

    window.sessionStorage.setItem(AUTO_RECOVERY_KEY, String(now));
    const hardReload = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('app_recovery', String(now));
      window.location.replace(url.toString());
    };

    void refreshServiceWorkerBeforeReload()
      .catch(() => undefined)
      .finally(hardReload);
  } catch {
    // Ignore recovery failures and let regular UI error handling continue.
  }
}

window.addEventListener('error', (event) => {
  recoverAppIfNeeded(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  recoverAppIfNeeded(event.reason);
});

initializeMatomo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        className="z-[70]"
        toastOptions={{
          style: {
            background: 'rgba(14, 24, 44, 0.95)',
            border: '1px solid rgba(128, 161, 214, 0.4)',
            color: '#f2f7ff',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
