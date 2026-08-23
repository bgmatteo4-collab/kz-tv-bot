import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

/**
 * Un seul build produit les deux surfaces. Elles n'ont rien à voir l'une avec
 * l'autre — une animation à budget serré d'un côté, un tableau de bord dense
 * de l'autre — mais elles partagent les contrats et les tokens.
 */
export default defineConfig({
  root: '.',
  base: './',
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        overlay: resolve(import.meta.dirname, 'overlay/index.html'),
        regie: resolve(import.meta.dirname, 'regie/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
