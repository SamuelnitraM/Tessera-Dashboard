import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * Identifiants des applications de Tessera chez Google et Twitch (« Se connecter
 * avec… »), injectés dans le processus principal : fichier local non versionné, ou variable
 * d'environnement (intégration continue). Voir docs/applications-oauth.md.
 */
function oauthClients(): unknown {
  const file = resolve('oauth-clients.local.json')
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
    if (process.env.TESSERA_OAUTH_CLIENTS) return JSON.parse(process.env.TESSERA_OAUTH_CLIENTS)
  } catch (error) {
    throw new Error(`Identifiants OAuth illisibles : ${(error as Error).message}`, { cause: error })
  }
  return {}
}

// Configuration des trois cibles de build Electron :
// - main     : processus principal (Node.js)
// - preload  : pont sécurisé entre main et renderer
// - renderer : interface React (Chromium)
export default defineConfig({
  main: {
    define: { __OAUTH_CLIENTS__: JSON.stringify(oauthClients()) },
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rolldownOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          // Hébergeur des cadres des applications installées (processus séparé) et son fil
          'frame-host': resolve('src/main/frame-host/index.ts'),
          'frame-worker': resolve('src/main/frame-host/worker.ts')
        }
      }
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
