import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

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
      '@spectralsuite/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '/favicon.webp': path.resolve(__dirname, './apps/tonic/public/favicon.webp')
    },
    setupFiles: ['./tests/setup.ts']
  }
} );
