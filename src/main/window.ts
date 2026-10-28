import { join } from 'node:path'
import { app, BrowserWindow, nativeTheme, screen, shell } from 'electron'
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

let mainWindow: BrowserWindow | null = null

/** Fenêtre créée masquée (démarrage avec Windows) : elle s'agrandira à sa première ouverture. */
let maximizeOnShow = false

/** Passe à `true` quand l'utilisateur quitte vraiment l'app (et pas seulement la fenêtre). */
let isQuitting = false

export function markAppAsQuitting(): void {
  isQuitting = true
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/**
 * Crée la fenêtre principale. `hidden` : lancée avec Windows, Tessera reste dans la zone de
 * notification jusqu'à ce que l'utilisateur l'ouvre.
 */
export function createMainWindow({ hidden = false }: { hidden?: boolean } = {}): BrowserWindow {
  // « Dernière taille » : on reprend la position mémorisée, sinon on agrandit
  const savedState = getSettings().window.startupMode === 'last' ? loadWindowState() : null

  mainWindow = new BrowserWindow({
    title: APP_NAME,
    icon: getAppIcons().window,
    width: 1280,
    height: 800,
    ...savedState?.bounds,
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
  secureWebviews(mainWindow.webContents)
  protectModuleFrames(mainWindow.webContents)

  // Agrandie = occupe tout l'écran courant, sans être en plein écran
  mainWindow.once('ready-to-show', () => {
    const maximize = !savedState || savedState.isMaximized
    // `maximize()` afficherait la fenêtre : on attend sa première ouverture
    if (hidden) {
      maximizeOnShow = maximize
      return
    }
    if (maximize) mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (mainWindow) saveWindowState(mainWindow)
    // Sans arrière-plan, la fenêtre se ferme normalement et l'app quitte (voir index.ts)
    if (isQuitting || !getSettings().window.closeToTray) return

    // L'app continue de tourner dans la zone de notification (et regarde s'il y a une mise à jour)
    event.preventDefault()
    mainWindow?.hide()
    checkForUpdatesOnClose()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Suit le thème choisi pour la couleur de fond visible pendant les redimensionnements
  const updateBackground = (): void => mainWindow?.setBackgroundColor(getWindowBackground())
  nativeTheme.on('updated', updateBackground)
  mainWindow.on('closed', () => nativeTheme.off('updated', updateBackground))

  // Plein écran (F11 ou bouton du menu latéral) : l'interface met son bouton à jour
  const sendFullScreen = (): void => {
    if (!mainWindow) return
    mainWindow.webContents.send(IpcChannels.windowFullScreenChanged, mainWindow.isFullScreen())
    setFramesFullScreen(mainWindow.isFullScreen())
  }
  mainWindow.on('enter-full-screen', sendFullScreen)
  mainWindow.on('leave-full-screen', sendFullScreen)

  // Plein écran d'une vidéo (YouTube…) pendant le plein écran de Tessera : à sa sortie,
  // Electron rend à la fenêtre sa taille d'avant la vidéo et la barre des tâches de Windows
  // repasse devant. Le plein écran de Tessera est alors rétabli.
  // Lu un instant après : le plein écran d'une page (vidéo) est signalé après celui de la
  // fenêtre, et ce n'est pas un choix de l'utilisateur
  const remember = (): void => {
    setTimeout(() => {
      if (!htmlFullScreen && !held && mainWindow) wantedFullScreen = mainWindow.isFullScreen()
    }, 0)
  }
  mainWindow.on('enter-full-screen', remember)
  mainWindow.on('leave-full-screen', remember)
  mainWindow.on('enter-html-full-screen', () => {
    htmlFullScreen = true
  })
  // L'état voulu est rétabli un instant après, décidé à ce moment-là : plein écran choisi par
  // l'utilisateur (F11), ou vidéo plein écran qui glisse pour montrer la page (`held`)
  mainWindow.on('leave-html-full-screen', () => {
    htmlFullScreen = false
    setTimeout(() => {
      const window = mainWindow
      if (!window || window.isDestroyed() || htmlFullScreen) return
      if (!held && !wantedFullScreen) {
        if (window.isFullScreen()) window.setFullScreen(false)
        return
      }
      // Toujours marquée plein écran mais à la taille d'avant : sortie puis retour
      const screenBounds = screen.getDisplayMatching(window.getBounds()).bounds
      const bounds = window.getBounds()
      const fills = bounds.width >= screenBounds.width && bounds.height >= screenBounds.height
      if (window.isFullScreen() && fills) return
      if (window.isFullScreen()) window.setFullScreen(false)
      window.setFullScreen(true)
    }, 100)
  })

  protectNavigation(mainWindow)

  // En dev, electron-vite fournit l'URL du serveur Vite (rechargement à chaud)
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/** Plein écran (comme F11), ou retour à la fenêtre. */
export function toggleFullScreen(): void {
  mainWindow?.setFullScreen(!mainWindow.isFullScreen())
}

/** Plein écran choisi par l'utilisateur (F11), hors vidéo en plein écran. */
let wantedFullScreen = false
/** Vidéo en plein écran (stores/videoStage) : Tessera reste en plein écran tant qu'elle dure. */
let held = false
/** Une page (vidéo) est en vrai plein écran dans la fenêtre. */
let htmlFullScreen = false

/**
 * Vidéo en plein écran : Tessera passe (et reste) en plein écran, la page peut glisser sous la
 * vidéo. À la fin, il retrouve l'état choisi par l'utilisateur (plein écran F11 ou non).
 */
export function holdFullScreen(value: boolean): void {
  const window = mainWindow
  if (!window || held === value) return
  if (value) {
    held = true
    if (!window.isFullScreen()) window.setFullScreen(true)
  } else {
    held = false
    // Page encore en vrai plein écran : l'état est rétabli quand elle le quitte
    if (!htmlFullScreen && window.isFullScreen() !== wantedFullScreen) {
      window.setFullScreen(wantedFullScreen)
    }
  }
}

export const isFullScreen = (): boolean => mainWindow?.isFullScreen() ?? false

/** Affiche la fenêtre principale (la recrée si besoin) et lui donne le focus. */
export function showMainWindow(): void {
  const window = mainWindow ?? createMainWindow()
  if (window.isMinimized()) window.restore()
  if (maximizeOnShow) {
    maximizeOnShow = false
    window.maximize()
  }
  window.show()
  window.focus()
}

export function toggleMainWindow(): void {
  if (mainWindow?.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
  } else {
    showMainWindow()
  }
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
