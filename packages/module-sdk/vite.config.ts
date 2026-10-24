import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Construction du SDK : un seul passage pour ses trois points d'entrée.
 * - `index` : le SDK utilisé dans le bloc (navigateur) ;
 * - `vite` : l'extension Vite qui construit un module ;
 * - `cli` : l'outil `tessera-module` (Node.js).
 * React, Vite et les modules de Node restent externes : ceux du projet du module sont utilisés.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2023',
    minify: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        vite: resolve(import.meta.dirname, 'src/vite.ts'),
        cli: resolve(import.meta.dirname, 'src/cli.ts')
      },
      formats: ['es']
    },
    rolldownOptions: {
      external: [/^react(?:-dom)?(?:\/.*)?$/, /^vite(?:\/.*)?$/, /^node:/]
    }
  }
})
