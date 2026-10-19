import { join } from 'node:path'
import { app, BrowserWindow, nativeTheme, shell } from 'electron'
import { APP_NAME } from '@shared/app'
import { getResourcePath } from './paths'
import { getSettings } from './settings-store'
import { getWindowBackground } from './system'
import { secureWebviews } from './web'
import { loadWindowState, saveWindowState } from './window-state'

let mainWindow: BrowserWindow | null = null

/** Passe à `true` quand l'utilisateur quitte vraiment l'app (et pas seulement la fenêtre). */
let isQuitting = false

export function markAppAsQuitting(): void {
  isQuitting = true
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): BrowserWindow {
  // « Dernière taille » : on reprend la position mémorisée, sinon on agrandit
  const savedState = getSettings().window.startupMode === 'last' ? loadWindowState() : null

  mainWindow = new BrowserWindow({
    title: APP_NAME,
    icon: getResourcePath('icon.png'),
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

  // Agrandie = occupe tout l'écran courant, sans être en plein écran
  mainWindow.once('ready-to-show', () => {
    if (!savedState || savedState.isMaximized) mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (mainWindow) saveWindowState(mainWindow)
    // Sans arrière-plan, la fenêtre se ferme normalement et l'app quitte (voir index.ts)
    if (isQuitting || !getSettings().window.closeToTray) return

    // L'app continue de tourner dans la zone de notification
    event.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Suit le thème choisi pour la couleur de fond visible pendant les redimensionnements
  const updateBackground = (): void => mainWindow?.setBackgroundColor(getWindowBackground())
  nativeTheme.on('updated', updateBackground)
  mainWindow.on('closed', () => nativeTheme.off('updated', updateBackground))

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

/** Affiche la fenêtre principale (la recrée si besoin) et lui donne le focus. */
export function showMainWindow(): void {
  const window = mainWindow ?? createMainWindow()
  if (window.isMinimized()) window.restore()
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
