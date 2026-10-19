import { join } from 'node:path'
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  Menu,
  net,
  session,
  shell,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
  type Session,
  type WebContents
} from 'electron'
import { interpolate } from '@shared/i18n'
import { appPartition, isWebPartition, isWebUrl, MAX_APP_ICON_LENGTH } from '@shared/web-apps'
import { getTranslation } from './i18n'
import { JsonStore } from './json-store'

/**
 * Pages web intégrées (onglets d'applications et widgets web), affichées dans des <webview>.
 *
 * Sécurité : une page web n'a jamais accès à Node.js ni à l'API de Tessera. Seule l'interface
 * de Tessera peut créer une <webview>, toujours sandboxée, avec pour seul script injecté celui
 * de Tessera (src/preload/webview.ts), vers une adresse http(s) et avec une session autorisée
 * (une par application).
 */

// ---------------------------------------------------------------------------
// Création des <webview>
// ---------------------------------------------------------------------------

/** Script exécuté dans chaque page web avant ses propres scripts (voir src/preload/webview.ts). */
const WEBVIEW_PRELOAD = join(import.meta.dirname, '../preload/webview.cjs')

/** Verrouille les <webview> créées par l'interface de Tessera. */
export function secureWebviews(host: WebContents): void {
  host.on('will-attach-webview', (event, webPreferences, params) => {
    // Seul le script de Tessera est injecté (jamais un script demandé par l'interface),
    // et la page n'a aucun accès à Node.js
    webPreferences.preload = WEBVIEW_PRELOAD
    webPreferences.nodeIntegration = false
    webPreferences.nodeIntegrationInSubFrames = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    webPreferences.webSecurity = true

    if (!isWebUrl(params.src) || !isWebPartition(params.partition ?? '')) {
      event.preventDefault()
      return
    }
    configureSession(params.partition)
  })
}

/** Menu du clic droit partout, et règles de navigation pour chaque page web intégrée. */
export function watchWebContents(): void {
  app.on('web-contents-created', (_event, contents) => {
    attachContextMenu(contents)
    if (contents.getType() === 'webview') applyWebRules(contents)
  })
}

/** Règles d'une page web intégrée, reprises par ses fenêtres de connexion. */
function applyWebRules(contents: WebContents): void {
  contents.setWindowOpenHandler((details) => {
    if (!isWebUrl(details.url)) return { action: 'deny' }
    // Fenêtre surgissante (connexion Google, Microsoft…) : même session, petite fenêtre
    if (details.disposition === 'new-window') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: BrowserWindow.fromWebContents(contents.hostWebContents ?? contents) ?? undefined,
          width: 520,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            session: contents.session,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false
          }
        }
      }
    }
    // Lien ordinaire vers un nouvel onglet : ouvert dans le navigateur par défaut
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  contents.on('did-create-window', (window) => applyWebRules(window.webContents))

  // Liens vers d'autres protocoles (mailto:, discord:…) : jamais ouverts dans la page.
  // Seul mailto: est confié à Windows (messagerie par défaut).
  contents.on('will-navigate', (event, url) => {
    if (isWebUrl(url)) return
    event.preventDefault()
    if (url.startsWith('mailto:')) void shell.openExternal(url)
  })
}

// ---------------------------------------------------------------------------
// Sessions : identifiant de navigateur et permissions
// ---------------------------------------------------------------------------

const configured = new Set<string>()

/** Permissions accordées sans question : sans risque pour la vie privée. */
const ALWAYS_ALLOWED = new Set([
  'notifications',
  'fullscreen',
  'clipboard-sanitized-write',
  'pointerLock'
])
/** Permissions demandées à l'utilisateur (réponse mémorisée par application). */
const ASK_USER = new Set(['media', 'geolocation'])

type PermissionDecisions = Record<string, Record<string, boolean>>
const decisions = new JsonStore<PermissionDecisions>('web-permissions.json', (input) => {
  const result: PermissionDecisions = {}
  if (typeof input === 'object' && input !== null) {
    for (const [partition, entries] of Object.entries(input)) {
      if (!isWebPartition(partition) || typeof entries !== 'object' || entries === null) continue
      result[partition] = Object.fromEntries(
        Object.entries(entries).filter(([, value]) => typeof value === 'boolean')
      ) as Record<string, boolean>
    }
  }
  return result
})

export const loadWebPermissions = (): void => void decisions.load()
export const flushWebPermissions = (): void => decisions.flush()

function configureSession(partition: string): void {
  if (configured.has(partition)) return
  configured.add(partition)
  const webSession = session.fromPartition(partition)

  // Identifiant de navigateur « Chrome » standard : certains sites refusent les navigateurs
  // qu'ils ne reconnaissent pas (mention d'Electron ou de Tessera)
  webSession.setUserAgent(
    webSession.getUserAgent().replace(/\s(?:Electron|Tessera[-\s]?Dashboard)\/\S+/gi, '')
  )

  webSession.setPermissionCheckHandler((_contents, permission) => {
    if (ALWAYS_ALLOWED.has(permission)) return true
    const stored = decisions.get()[partition] ?? {}
    return Object.entries(stored).some(([key, allowed]) => allowed && key.startsWith(permission))
  })

  webSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    if (ALWAYS_ALLOWED.has(permission)) return callback(true)
    if (!ASK_USER.has(permission)) return callback(false)

    const mediaTypes =
      'mediaTypes' in details && details.mediaTypes?.length
        ? [...details.mediaTypes].sort()
        : ['audio']
    const key = permission === 'media' ? `media:${mediaTypes.join('+')}` : permission
    const remembered = decisions.get()[partition]?.[key]
    if (remembered !== undefined) return callback(remembered)

    void askPermission(contents, details.requestingUrl, permission, mediaTypes).then((allowed) => {
      const current = decisions.get()
      decisions.set({ ...current, [partition]: { ...current[partition], [key]: allowed } })
      callback(allowed)
    })
  })
}

async function askPermission(
  contents: WebContents,
  requestingUrl: string,
  permission: string,
  mediaTypes: string[]
): Promise<boolean> {
  const text = getTranslation().web.permission
  let host = requestingUrl
  try {
    host = new URL(requestingUrl).hostname
  } catch {
    // Adresse illisible : affichée telle quelle
  }
  const what =
    permission === 'geolocation'
      ? text.geolocation
      : mediaTypes.includes('video') && mediaTypes.includes('audio')
        ? text.microphoneAndCamera
        : mediaTypes.includes('video')
          ? text.camera
          : text.microphone

  const window = BrowserWindow.fromWebContents(contents.hostWebContents ?? contents)
  const options: Electron.MessageBoxOptions = {
    type: 'question',
    buttons: [text.allow, text.deny],
    defaultId: 1,
    cancelId: 1,
    title: text.title,
    message: interpolate(text.message, { host, what }),
    detail: text.detail
  }
  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options)
  return response === 0
}

/** Oublie les autorisations données à une application. */
export function resetAppPermissions(appId: string): void {
  const current = { ...decisions.get() }
  delete current[appPartition(appId)]
  decisions.set(current)
}

/** Efface les données d'une application (connexion, cookies, cache) et ses autorisations. */
export async function clearAppData(appId: string): Promise<void> {
  if (!/^[a-z0-9-]{1,64}$/.test(appId)) return
  const webSession: Session = session.fromPartition(appPartition(appId))
  await webSession.clearStorageData()
  await webSession.clearCache()
  resetAppPermissions(appId)
}

// ---------------------------------------------------------------------------
// Icônes d'applications
// ---------------------------------------------------------------------------

/** Télécharge l'icône d'un site (adresse donnée par la page) et la renvoie en image `data:`. */
export async function fetchSiteIcon(url: string): Promise<string | null> {
  if (typeof url !== 'string' || !isWebUrl(url)) return null
  try {
    const response = await net.fetch(url)
    const type = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
    if (!response.ok || !type.startsWith('image/')) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    const dataUrl = `data:${type};base64,${bytes.toString('base64')}`
    return dataUrl.length <= MAX_APP_ICON_LENGTH ? dataUrl : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Menu du clic droit (pages web et interface de Tessera)
// ---------------------------------------------------------------------------

function attachContextMenu(contents: WebContents): void {
  contents.on('context-menu', (_event, params) => {
    const items = buildContextMenu(contents, params)
    if (items.length === 0) return
    const window = BrowserWindow.fromWebContents(contents.hostWebContents ?? contents) ?? undefined
    Menu.buildFromTemplate(items).popup({ window })
  })
}

function buildContextMenu(
  contents: WebContents,
  params: ContextMenuParams
): MenuItemConstructorOptions[] {
  const text = getTranslation().web.contextMenu
  const groups: MenuItemConstructorOptions[][] = []

  // Correcteur orthographique
  if (params.misspelledWord) {
    const suggestions: MenuItemConstructorOptions[] = params.dictionarySuggestions
      .slice(0, 5)
      .map((word) => ({ label: word, click: () => contents.replaceMisspelling(word) }))
    suggestions.push({
      label: text.addToDictionary,
      click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
    })
    groups.push(suggestions)
  }

  if (isWebUrl(params.linkURL)) {
    groups.push([
      { label: text.openLink, click: () => void shell.openExternal(params.linkURL) },
      { label: text.copyLink, click: () => clipboard.writeText(params.linkURL) }
    ])
  }

  if (params.mediaType === 'image') {
    groups.push([{ label: text.copyImage, click: () => contents.copyImageAt(params.x, params.y) }])
  }

  const { editFlags } = params
  if (params.isEditable) {
    groups.push([
      { label: text.cut, role: 'cut', enabled: editFlags.canCut },
      { label: text.copy, role: 'copy', enabled: editFlags.canCopy },
      { label: text.paste, role: 'paste', enabled: editFlags.canPaste },
      { label: text.selectAll, role: 'selectAll', enabled: editFlags.canSelectAll }
    ])
  } else if (params.selectionText.trim()) {
    groups.push([{ label: text.copy, role: 'copy' }])
  }

  // Navigation (pages web seulement)
  if (contents.getType() === 'webview') {
    const history = contents.navigationHistory
    groups.push([
      { label: text.back, enabled: history.canGoBack(), click: () => history.goBack() },
      { label: text.forward, enabled: history.canGoForward(), click: () => history.goForward() },
      { label: text.reload, click: () => contents.reload() }
    ])
  }

  if (!app.isPackaged) {
    groups.push([{ label: text.inspect, click: () => contents.inspectElement(params.x, params.y) }])
  }

  return groups.flatMap((group, index) =>
    index === 0 ? group : [{ type: 'separator' as const }, ...group]
  )
}
