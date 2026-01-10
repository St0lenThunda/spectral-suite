import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig( {
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: [
      'packages/**/__tests__/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'apps/**/__tests__/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    alias: {
      '@spectralsuite/core': '/home/thunda/Dev/543_Tools/spectral-suite/packages/core/src/index.ts',
      '/favicon.webp': '/home/thunda/Dev/543_Tools/spectral-suite/apps/tonic/public/favicon.webp'
    },
    setupFiles: ['./tests/setup.ts']
  }
} );
