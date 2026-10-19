import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Configuration des trois cibles de build Electron :
// - main     : processus principal (Node.js)
// - preload  : pont sécurisé entre main et renderer
// - renderer : interface React (Chromium)
export default defineConfig({
  main: {
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    }
  },
  preload: {
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rolldownOptions: {
        input: {
          // Pont entre l'interface de Tessera et le processus principal
          index: resolve('src/preload/index.ts'),
          // Script de Tessera dans les pages web intégrées (voir src/preload/webview.ts)
          webview: resolve('src/preload/webview.ts')
        },
        // Un preload « sandboxé » doit être en CommonJS
        output: { format: 'cjs', entryFileNames: '[name].cjs' }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@resources': resolve('resources'),
        // SDK importé par les extensions du dossier plugins/
        '@tessera/plugin-sdk': resolve('src/renderer/src/plugin-sdk')
      }
    },
    plugins: [react()]
  }
})
