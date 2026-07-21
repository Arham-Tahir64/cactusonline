import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': path.resolve(dirname, '../src/engine'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // The Colyseus server (src/server/app.config.ts) serves this directory as static files.
    outDir: '../public',
    emptyOutDir: true,
  },
});
