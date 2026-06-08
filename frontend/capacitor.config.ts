import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.edumind.liga',
  appName: 'Liga EDUmind',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
};

export default config;
