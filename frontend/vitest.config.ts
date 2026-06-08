import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __APP_STAGE__: JSON.stringify('Stable'),
    __APP_BUILD_HASH__: JSON.stringify('testhash'),
    __APP_BUILD_COUNT__: JSON.stringify('0'),
    __APP_BUILD_TIME__: JSON.stringify('2026-04-03T00:00:00.000Z'),
    __APP_BUILD_DIRTY__: JSON.stringify(false),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: true,
  },
})
