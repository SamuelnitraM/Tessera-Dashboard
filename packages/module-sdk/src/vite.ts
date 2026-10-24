import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { PackageError, readManifest } from './package'

export interface TesseraModuleOptions {
  /** Point d'entrée du code (par défaut `src/index.tsx`, sinon `src/index.ts`). */
  entry?: string
  /** Manifeste du module (par défaut `manifest.json` à la racine du projet). */
  manifest?: string
}

/**
 * Extension Vite qui construit un module Tessera dans `dist/` :
 * - `index.js` (tout le code, React compris), `index.css` (tous les styles) et `assets/` ;
 * - `manifest.json`, copié après validation (une erreur arrête la construction).
 *
 * `vite build --watch` reconstruit à chaque modification : en mode développeur, Tessera
 * recharge alors les blocs du module.
 */
export function tesseraModule(options: TesseraModuleOptions = {}): Plugin {
  let root = process.cwd()
  let manifestPath = ''

  return {
    name: 'tessera-module',
    config(config, { mode }) {
      root = resolve(config.root ?? process.cwd())
      manifestPath = resolve(root, options.manifest ?? 'manifest.json')
      const entry =
        options.entry ??
        (existsSync(resolve(root, 'src/index.tsx')) ? 'src/index.tsx' : 'src/index.ts')
      return {
        // Les adresses des fichiers (images, morceaux chargés à la demande) restent relatives
        base: './',
        build: {
          outDir: 'dist',
          emptyOutDir: true,
          target: 'es2023',
          sourcemap: mode === 'development' ? 'inline' : false,
          minify: mode !== 'development',
          // Tous les styles dans index.css (chargé par Tessera à côté de index.js)
          cssCodeSplit: false,
          copyPublicDir: true,
          rolldownOptions: {
            input: resolve(root, entry),
            output: {
              format: 'es',
              entryFileNames: 'index.js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: (asset) =>
                asset.names.some((name) => name.endsWith('.css'))
                  ? 'index.css'
                  : 'assets/[name]-[hash][extname]'
            }
          }
        }
      }
    },
    buildStart() {
      // Le manifeste est validé avant la construction, et relu à chaque reconstruction
      this.addWatchFile(manifestPath)
      try {
        readManifest(manifestPath)
      } catch (error) {
        this.error(error instanceof PackageError ? error.message : String(error))
      }
    },
    generateBundle() {
      const manifest = readManifest(manifestPath)
      if (manifest.entry !== 'index.js') {
        this.error(
          `manifest.json → entry : « index.js » attendu (fichier produit par la construction).`
        )
      }
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: readFileSync(manifestPath, 'utf8')
      })
    }
  }
}
