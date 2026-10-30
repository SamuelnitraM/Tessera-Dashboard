import { join } from 'node:path'
import { app, BrowserWindow, nativeTheme, screen, shell, type Rectangle } from 'electron'
import { APP_NAME } from '@shared/app'
import { IpcChannels } from '@shared/ipc'
import { getAppIcons } from './app-icon'
import { setFramesFullScreen } from './desktop/frames'
import { protectModuleFrames } from './plugins/module-protocol'
import { getSettings } from './settings-store'
import { getWindowBackground } from './system'
import { checkForUpdatesOnClose } from './updater'
import { secureWebviews } from './web'
import { loadWindowState, saveWindowState } from './window-state'

/**
 * Fenêtres de Tessera. La première est la fenêtre principale ; les autres naissent d'un onglet
 * de page glissé hors d'une fenêtre (voir windows.ts, qui répartit les pages). Fermer une
 * fenêtre quand il en reste d'autres fait rejoindre ses pages à une autre fenêtre ; seule la
 * dernière part dans la zone de notification (réglage « Garder en arrière-plan »).
 */

interface TesseraWindow {
  window: BrowserWindow
  /** Plein écran choisi par l'utilisateur (F11), hors vidéo en plein écran. */
  wantedFullScreen: boolean
  /** Vidéo en plein écran (stores/videoStage) : la fenêtre reste en plein écran tant qu'elle dure. */
  held: boolean
  /** Une page (vidéo) est en vrai plein écran dans la fenêtre. */
  htmlFullScreen: boolean
}

/** Fenêtres ouvertes, la principale en premier. */
const entries: TesseraWindow[] = []

/** Fenêtre créée masquée (démarrage avec Windows) : elle s'agrandira à sa première ouverture. */
let maximizeOnShow = false

/** Passe à `true` quand l'utilisateur quitte vraiment l'app (et pas seulement la fenêtre). */
let isQuitting = false

export function markAppAsQuitting(): void {
  isQuitting = true
}

export const isAppQuitting = (): boolean => isQuitting

/** Fenêtre principale (la première ouverte). */
export function getMainWindow(): BrowserWindow | null {
  return entries[0]?.window ?? null
}

/** Toutes les fenêtres de Tessera (pas les fenêtres auxiliaires : captures, vidéo, popups). */
export function getTesseraWindows(): BrowserWindow[] {
  return entries.map((entry) => entry.window)
}

/** Poignée Windows (HWND) d'une fenêtre. */
export const hwndOf = (window: BrowserWindow): number =>
  Number(window.getNativeWindowHandle().readBigInt64LE(0))

/** Fenêtre de Tessera qui contient cette interface (`null` : une autre fenêtre). */
export function tesseraWindowOf(contents: Electron.WebContents): BrowserWindow | null {
  return entries.find((entry) => entry.window.webContents === contents)?.window ?? null
}

const entryOf = (window: BrowserWindow | null): TesseraWindow | undefined =>
  entries.find((entry) => entry.window === window)

/** Nouvelle fenêtre (le gestionnaire des applications insérées s'y branche). */
let onCreated: (window: BrowserWindow) => void = () => {}

export function setWindowCreatedListener(listener: (window: BrowserWindow) => void): void {
  onCreated = listener
}

export interface WindowOptions {
  /** Lancée avec Windows : Tessera reste dans la zone de notification. */
  hidden?: boolean
  /** Position et taille (fenêtre secondaire) ; sinon celles de la fenêtre principale. */
  bounds?: Rectangle
  maximized?: boolean
}

/**
 * Crée une fenêtre de Tessera. Sans `bounds` : la fenêtre principale (« Dernière taille » : la
 * position mémorisée, sinon agrandie).
 */
export function createTesseraWindow(options: WindowOptions = {}): BrowserWindow {
  const primary = !options.bounds
  const savedState =
    primary && getSettings().window.startupMode === 'last' ? loadWindowState() : null
  const bounds = options.bounds ?? savedState?.bounds

  const window = new BrowserWindow({
    title: APP_NAME,
    icon: getAppIcons().window,
    width: 1280,
    height: 800,
    ...bounds,
    minWidth: 960,
    minHeight: 600,
    show: false, // affichée seulement une fois prête, pour éviter un flash blanc
    backgroundColor: getWindowBackground(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      // Sécurité : le renderer n'a aucun accès direct à Node.js
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Pages web intégrées (onglets d'applications, widgets web), verrouillées par web.ts
      webviewTag: true,
      spellcheck: true
    }
  })
  const entry: TesseraWindow = {
    window,
    wantedFullScreen: false,
    held: false,
    htmlFullScreen: false
  }
  entries.push(entry)
  secureWebviews(window.webContents)
  protectModuleFrames(window.webContents)

  // Agrandie = occupe tout l'écran courant, sans être en plein écran
  window.once('ready-to-show', () => {
    const maximize = primary ? !savedState || savedState.isMaximized : options.maximized === true
    // `maximize()` afficherait la fenêtre : on attend sa première ouverture
    if (options.hidden) {
      if (primary) maximizeOnShow = maximize
      return
    }
    if (maximize) window.maximize()
    window.show()
  })

  window.on('close', (event) => {
    // En quittant : la fenêtre principale garde sa taille (les autres sont notées par windows.ts)
    if (isQuitting) {
      if (window === getMainWindow()) saveWindowState(window)
      return
    }
    // D'autres fenêtres restent : celle-ci se ferme, ses pages rejoignent une autre fenêtre
    // (windows.ts)
    if (entries.length > 1) return
    saveWindowState(window)
    // Sans arrière-plan, la fenêtre se ferme normalement et l'app quitte (voir index.ts)
    if (!getSettings().window.closeToTray) return

    // L'app continue de tourner dans la zone de notification (et regarde s'il y a une mise à jour)
    event.preventDefault()
    window.hide()
    checkForUpdatesOnClose()
  })

  window.on('closed', () => {
    const index = entries.indexOf(entry)
    if (index >= 0) entries.splice(index, 1)
  })

  // Suit le thème choisi pour la couleur de fond visible pendant les redimensionnements
  const updateBackground = (): void => {
    if (!window.isDestroyed()) window.setBackgroundColor(getWindowBackground())
  }
  nativeTheme.on('updated', updateBackground)
  window.on('closed', () => nativeTheme.off('updated', updateBackground))

  // Plein écran (F11 ou bouton du menu latéral) : l'interface met son bouton à jour
  const sendFullScreen = (): void => {
    if (window.isDestroyed()) return
    window.webContents.send(IpcChannels.windowFullScreenChanged, window.isFullScreen())
    setFramesFullScreen(hwndOf(window), window.isFullScreen())
  }
  window.on('enter-full-screen', sendFullScreen)
  window.on('leave-full-screen', sendFullScreen)

  // Plein écran d'une vidéo (YouTube…) pendant le plein écran de Tessera : à sa sortie,
  // Electron rend à la fenêtre sa taille d'avant la vidéo et la barre des tâches de Windows
  // repasse devant. Le plein écran de Tessera est alors rétabli.
  // Lu un instant après : le plein écran d'une page (vidéo) est signalé après celui de la
  // fenêtre, et ce n'est pas un choix de l'utilisateur
  const remember = (): void => {
    setTimeout(() => {
      if (!entry.htmlFullScreen && !entry.held && !window.isDestroyed()) {
        entry.wantedFullScreen = window.isFullScreen()
      }
    }, 0)
  }
  window.on('enter-full-screen', remember)
  window.on('leave-full-screen', remember)
  window.on('enter-html-full-screen', () => {
    entry.htmlFullScreen = true
  })
  // L'état voulu est rétabli un instant après, décidé à ce moment-là : plein écran choisi par
  // l'utilisateur (F11), ou vidéo plein écran qui glisse pour montrer la page (`held`)
  window.on('leave-html-full-screen', () => {
    entry.htmlFullScreen = false
    setTimeout(() => {
      if (window.isDestroyed() || entry.htmlFullScreen) return
      if (!entry.held && !entry.wantedFullScreen) {
        if (window.isFullScreen()) window.setFullScreen(false)
        return
      }
      // Toujours marquée plein écran mais à la taille d'avant : sortie puis retour
      const screenBounds = screen.getDisplayMatching(window.getBounds()).bounds
      const current = window.getBounds()
      const fills = current.width >= screenBounds.width && current.height >= screenBounds.height
      if (window.isFullScreen() && fills) return
      if (window.isFullScreen()) window.setFullScreen(false)
      window.setFullScreen(true)
    }, 100)
  })

  protectNavigation(window)

  // En dev, electron-vite fournit l'URL du serveur Vite (rechargement à chaud)
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  onCreated(window)
  return window
}

/** Plein écran (comme F11), ou retour à la fenêtre. */
export function toggleFullScreen(window: BrowserWindow | null): void {
  window?.setFullScreen(!window.isFullScreen())
}

/**
 * Vidéo en plein écran : la fenêtre passe (et reste) en plein écran, la page peut glisser sous
 * la vidéo. À la fin, elle retrouve l'état choisi par l'utilisateur (plein écran F11 ou non).
 */
export function holdFullScreen(window: BrowserWindow | null, value: boolean): void {
  const entry = entryOf(window)
  if (!entry || entry.held === value) return
  if (value) {
    entry.held = true
    if (!entry.window.isFullScreen()) entry.window.setFullScreen(true)
  } else {
    entry.held = false
    // Page encore en vrai plein écran : l'état est rétabli quand elle le quitte
    if (!entry.htmlFullScreen && entry.window.isFullScreen() !== entry.wantedFullScreen) {
      entry.window.setFullScreen(entry.wantedFullScreen)
    }
  }
}

export const isFullScreen = (window: BrowserWindow | null): boolean =>
  window?.isFullScreen() ?? false

/** Affiche une fenêtre et lui donne le focus. */
export function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore()
  if (maximizeOnShow && window === getMainWindow()) {
    maximizeOnShow = false
    window.maximize()
  }
  window.show()
  window.focus()
}

/** Affiche les fenêtres de Tessera (la principale recréée si besoin), la principale devant. */
export function showMainWindow(): void {
  const main = getMainWindow() ?? createTesseraWindow()
  for (const window of getTesseraWindows()) if (window !== main) showWindow(window)
  showWindow(main)
}

export function toggleMainWindow(): void {
  const main = getMainWindow()
  if (main?.isVisible() && main.isFocused()) {
    main.hide()
  } else {
    showMainWindow()
  }
}

/** Redessine l'icône de chaque fenêtre (changement d'accent). */
export function setWindowsIcon(icon: Electron.NativeImage): void {
  for (const window of getTesseraWindows()) window.setIcon(icon)
}

/**
 * L'interface ne doit jamais quitter la page de l'app :
 * les liens externes s'ouvrent dans le navigateur par défaut.
 */
function protectNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      if (isExternalUrl(url)) void shell.openExternal(url)
    }
  })
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://')
}
