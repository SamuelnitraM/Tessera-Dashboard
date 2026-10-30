import { BrowserWindow, screen } from 'electron'
import { resolveAccentColor, type VideoWheelMode } from '@shared/settings'
import { getTranslation } from './i18n'
import { getSettings, onSettingsChange, updateSettings } from './settings-store'
import { getSystemPreferences } from './system'
import { getMainWindow } from './window'

/**
 * Interrupteur de la molette d'une vidéo en plein écran (Page / Vidéo), en haut de l'écran.
 *
 * La vidéo en plein écran passe devant toute l'interface (page d'un lecteur en plein écran,
 * fenêtre d'un navigateur inséré) : l'interrupteur est une petite fenêtre à part, toujours
 * au-dessus. Il apparaît quand la souris bouge et disparaît après quelques secondes sans
 * mouvement. Sa page n'a accès à rien : un clic est signalé par un message de console, et le
 * choix est enregistré dans les réglages (`window.videoWheel`), que l'interface suit.
 */

/** Message de console de la page de l'interrupteur : `<préfixe>page` ou `<préfixe>video`. */
const SIGNAL = '__tessera_video_wheel__:'
const WIDTH = 230
const HEIGHT = 44
/** Délai sans mouvement de la souris avant de masquer l'interrupteur (ms). */
const HIDE_AFTER_MS = 1500
const POLL_MS = 200

let overlay: BrowserWindow | null = null
/** Dernier mouvement de la souris (ou changement du choix) : l'interrupteur est alors affiché. */
let movedAt = 0
let poll: ReturnType<typeof setInterval> | null = null
let stopWatching: (() => void) | null = null

/** Souris dont la molette est en couleur d'accent : entre « Page » et « Vidéo ». */
function mouseIcon(label: string): string {
  const { appearance } = getSettings()
  const accent = resolveAccentColor(appearance.accentColor, getSystemPreferences().accentColor)
  return `<svg role="img" aria-label="${label}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><title>${label}</title><rect x="6" y="2.5" width="12" height="19" rx="6"/><line x1="12" y1="6.5" x2="12" y2="10.5" stroke="${accent}" stroke-width="3"/></svg>`
}

function page(mode: VideoWheelMode): string {
  const texts = getTranslation().videoStage
  const button = (value: VideoWheelMode, label: string): string =>
    `<button data-value="${value}" aria-pressed="${value === mode}">${label}</button>`
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>
html, body { margin: 0; background: transparent; overflow: hidden; user-select: none; }
body { display: grid; place-items: center; height: 100vh; font: 13px 'Segoe UI Variable Text', 'Segoe UI', sans-serif; }
.bar { display: flex; align-items: center; gap: 6px; padding: 4px; border-radius: 999px;
  background: rgb(20 22 30 / 0.82); color: #fff; box-shadow: 0 6px 20px rgb(0 0 0 / 0.4); }
svg { flex-shrink: 0; opacity: 0.9; }
button { padding: 4px 12px; border: none; border-radius: 999px; background: none; color: #fff; font: inherit; cursor: pointer; }
button:hover { background: rgb(255 255 255 / 0.12); }
button[aria-pressed='true'] { background: #fff; color: #111; font-weight: 600; }
</style></head><body><div class="bar">
${button('page', texts.page)}${mouseIcon(texts.wheel)}${button('video', texts.video)}</div>
<script>
for (const button of document.querySelectorAll('button')) {
  button.addEventListener('click', () => console.log(${JSON.stringify(SIGNAL)} + button.dataset.value))
}
</script></body></html>`
}

function render(): void {
  if (!overlay) return
  const html = page(getSettings().window.videoWheel)
  void overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

function createOverlay(): BrowserWindow {
  const window = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    hasShadow: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  window.setAlwaysOnTop(true, 'screen-saver')
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.on('console-message', (...args: unknown[]) => {
    const details = args[0] as { message?: string }
    const message = details?.message ?? (args[2] as string | undefined)
    if (typeof message !== 'string' || !message.startsWith(SIGNAL)) return
    const value = message.slice(SIGNAL.length)
    if (value === 'page' || value === 'video') updateSettings({ window: { videoWheel: value } })
  })
  return window
}

/** Fenêtre de Tessera de la vidéo en plein écran. */
let stageWindow: BrowserWindow | null = null

/** Place l'interrupteur en haut, au milieu de l'écran de la fenêtre de la vidéo. */
function position(window: BrowserWindow): void {
  const host = stageWindow && !stageWindow.isDestroyed() ? stageWindow : getMainWindow()
  const display = host ? screen.getDisplayMatching(host.getBounds()) : screen.getPrimaryDisplay()
  const { x, y, width } = display.bounds
  window.setBounds({
    x: x + Math.round((width - WIDTH) / 2),
    y: y + 12,
    width: WIDTH,
    height: HEIGHT
  })
}

/**
 * Clic molette sur la vidéo en plein écran : la molette passe de la page à la vidéo, ou
 * l'inverse (l'interrupteur s'affiche avec le nouveau choix).
 */
export function toggleVideoWheel(): void {
  const { videoWheel } = getSettings().window
  updateSettings({ window: { videoWheel: videoWheel === 'page' ? 'video' : 'page' } })
}

/** Vidéo en plein écran (ou fin) : l'interrupteur est disponible, ou retiré. */
export function setVideoStage(active: boolean, window: BrowserWindow | null = null): void {
  if (active) stageWindow = window
  if (!active) {
    if (poll) clearInterval(poll)
    poll = null
    stopWatching?.()
    stopWatching = null
    overlay?.destroy()
    overlay = null
    return
  }
  if (overlay) return
  overlay = createOverlay()
  render()
  // Choix changé (par l'interrupteur ou les paramètres) : affiché
  stopWatching = onSettingsChange((next, previous) => {
    if (next.window.videoWheel === previous.window.videoWheel) return
    render()
    movedAt = Date.now()
  })
  // Apparaît quand la souris bouge, disparaît après un moment sans mouvement (sauf au-dessus)
  let last = screen.getCursorScreenPoint()
  movedAt = Date.now()
  poll = setInterval(() => {
    const window = overlay
    if (!window || window.isDestroyed()) return
    const point = screen.getCursorScreenPoint()
    const bounds = window.getBounds()
    const over =
      point.x >= bounds.x &&
      point.x < bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y < bounds.y + bounds.height
    if (point.x !== last.x || point.y !== last.y || over) movedAt = Date.now()
    last = point
    const visible = Date.now() - movedAt < HIDE_AFTER_MS
    if (visible && !window.isVisible()) {
      position(window)
      window.showInactive()
    } else if (!visible && window.isVisible()) {
      window.hide()
    }
  }, POLL_MS)
}
