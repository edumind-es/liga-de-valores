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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const frontendPackage = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string }

function runGit(command: string, fallback: string): string {
  try {
    const value = execSync(command, {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()
    return value || fallback
  } catch {
    return fallback
  }
}

const appVersion = process.env.APP_VERSION || frontendPackage.version
const appStage = process.env.APP_STAGE || 'Stable'
const buildHash = runGit('git rev-parse --short HEAD', 'nogit')
const buildCount = runGit('git rev-list --count HEAD', '0')
const buildDirty = runGit('git status --porcelain', '') !== ''
const buildTime = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_STAGE__: JSON.stringify(appStage),
    __APP_BUILD_HASH__: JSON.stringify(buildHash),
    __APP_BUILD_COUNT__: JSON.stringify(buildCount),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __APP_BUILD_DIRTY__: JSON.stringify(buildDirty),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32x32.png', 'favicon-16x16.png', 'icons/*.png', 'sounds/*.mp3'],
      manifest: false, // We use our own manifest.json in public/
      workbox: {
        // Cache strategies for different resource types
        runtimeCaching: [
          {
            // Auth endpoints: NEVER cache — always network only
            urlPattern: /\/api\/v1\/auth\//i,
            handler: 'NetworkOnly',
          },
          {
            // API endpoints: network only (no cache for business data)
            urlPattern: /\/api\/v1\//i,
            handler: 'NetworkOnly',
          },
          {
            // Keep connectivity probes resilient without caching business payloads.
            urlPattern: /^https?:\/\/.*\/api\/live$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'live-health-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Cache static assets with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache sounds (for scoreboard)
            urlPattern: /\.(?:mp3|wav|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache ARASAAC pictograms
            urlPattern: /^https:\/\/api\.arasaac\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arasaac-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        // Precache the app shell - exclude large files
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/liga_logo_oficial.png'], // Exclude 6MB logo
        // Increase max file size for larger JS bundles
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true, // Enable PWA in development for testing
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          'vendor-charts': ['recharts'],
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-konva': ['konva', 'react-konva'],
          'vendor-jspdf': ['jspdf'],
          'vendor-html2canvas': ['html2canvas'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
      },
    },
  },
})
