import { createReadStream, existsSync } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { protocol, session, type CustomScheme, type WebContents } from 'electron'
import {
  MODULE_SCHEME,
  MODULE_WIDGET_PAGE,
  moduleContentSecurityPolicy,
  moduleIdFromHost
} from '@shared/modules'
import type { PluginManifest } from '@shared/plugins'
import { getServedModule } from './modules'
import { checkEntryPath } from './zip'

/**
 * Protocole `tessera-module://<module>/…` : sert le code des modules tiers à leurs cadres.
 *
 * - Chaque module a sa propre origine (stockage séparé) et son propre processus.
 * - Seuls les fichiers du dossier du module sont servis (ni `..`, ni lien vers l'extérieur,
 *   ni fichier caché), et seulement si le module est installé, valide et activé.
 * - Chaque réponse porte la politique de sécurité du module : son code uniquement, aucun cadre,
 *   et Internet limité aux adresses de sa permission `network`.
 */

/** Déclaration du protocole, à passer à `registerSchemesAsPrivileged` (avant `whenReady`). */
export const moduleScheme: CustomScheme = {
  scheme: MODULE_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}

const MIME: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

/**
 * Styles de base d'un bloc : police et couleurs de Tessera (les variables CSS sont envoyées par
 * Tessera à la connexion, puis à chaque changement de thème), fond transparent.
 */
const BASE_STYLE = `:root{color-scheme:light dark;font-family:'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;color:var(--color-text)}*,*::before,*::after{box-sizing:border-box}html,body,#root{height:100%;margin:0}html,body{background:transparent}button,input,select,textarea{font:inherit;color:inherit}`

function widgetPage(manifest: PluginManifest, folder: string): string {
  const entry = `/${manifest.entry}`
  // Feuille de style produite à côté du script (ex. index.css pour index.js), si elle existe
  const styles = manifest.entry.replace(/\.m?js$/, '.css')
  const link = existsSync(join(folder, styles)) ? `<link rel="stylesheet" href="/${styles}">` : ''
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${BASE_STYLE}</style>${link}</head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`
}

function notFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
}

export function handleModuleProtocol(): void {
  protocol.handle(MODULE_SCHEME, async (request) => {
    const url = new URL(request.url)
    const served = getServedModule(moduleIdFromHost(url.hostname))
    if (!served || request.method !== 'GET') return notFound()
    const { manifest, folder } = served
    const headers: Record<string, string> = {
      'Content-Security-Policy': moduleContentSecurityPolicy(manifest, served.granted),
      'X-Content-Type-Options': 'nosniff',
      // Mode développeur : toujours la dernière construction
      'Cache-Control': 'no-cache'
    }

    if (url.pathname === MODULE_WIDGET_PAGE) {
      return new Response(widgetPage(manifest, folder), {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Chemin demandé : relatif, simple, sans fichier ni dossier caché
    let path: string
    try {
      path = checkEntryPath(decodeURIComponent(url.pathname).replace(/^\//, ''))
    } catch {
      return notFound()
    }
    if (path.split('/').some((segment) => segment.startsWith('.'))) return notFound()

    try {
      const root = await realpath(folder)
      // Le vrai chemin (liens résolus) doit rester dans le dossier du module
      const file = await realpath(resolve(folder, path))
      if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) return notFound()
      const stream = Readable.toWeb(createReadStream(file)) as ReadableStream
      return new Response(stream, {
        headers: {
          ...headers,
          'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'
        }
      })
    } catch {
      return notFound()
    }
  })
}

const isModuleUrl = (url: string): boolean => url.startsWith(`${MODULE_SCHEME}://`)

/**
 * Permissions du navigateur (caméra, micro, position…) : toujours refusées aux modules, qui
 * passent par les permissions de Tessera. L'interface de Tessera garde le comportement par
 * défaut d'Electron.
 */
export function protectModuleSession(): void {
  const allowed = new Set(['clipboard-sanitized-write'])
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(!isModuleUrl(details.requestingUrl) || allowed.has(permission))
  })
  session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => {
    return !isModuleUrl(origin) || allowed.has(permission)
  })
}

/** Un cadre de module ne peut pas quitter son origine (vers un site, ou un autre module). */
export function protectModuleFrames(contents: WebContents): void {
  contents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) return
    const origin = event.frame?.origin ?? ''
    if (isModuleUrl(origin) && !event.url.startsWith(`${origin}/`)) event.preventDefault()
  })
}
