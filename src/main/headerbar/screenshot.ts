import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  nativeImage,
  screen,
  shell,
  type Display,
  type NativeImage,
  type WebContents
} from 'electron'
import type { Screenshot } from '@shared/header-bar'
import * as w from '../desktop/win32'
import { writeClipboardImage } from './clipboard'
import { getTranslation } from '../i18n'
import { notifyFromTessera } from '../notifications'
import { getSettings } from '../settings-store'

/**
 * Capture d'écran (widget de la barre des pages) : l'outil Capture de Windows, ou celui de
 * Tessera (zone, écran entier, fenêtre). Les captures de Tessera sont copiées et enregistrées
 * dans le dossier choisi (par défaut Images\Captures d'écran, celui de Windows aussi).
 */

const IMAGE = /\.(png|jpe?g)$/i
const RECENT = 8

export function screenshotsFolder(): string {
  return getSettings().headerBar.screenshot.folder || join(app.getPath('pictures'), 'Screenshots')
}

/** Chemin d'une capture du dossier (refuse tout autre fichier). */
function inFolder(path: unknown): string | null {
  if (typeof path !== 'string' || !IMAGE.test(path)) return null
  const folder = resolve(screenshotsFolder())
  const full = resolve(path)
  return full.startsWith(folder + sep) ? full : null
}

export async function openWindowsTool(): Promise<void> {
  await shell.openExternal('ms-screenclip:')
}

export async function listScreenshots(): Promise<Screenshot[]> {
  const folder = screenshotsFolder()
  let names: string[]
  try {
    names = (await readdir(folder)).filter((name) => IMAGE.test(name))
  } catch {
    return []
  }
  const files = await Promise.all(
    names.map(async (name) => {
      const path = join(folder, name)
      try {
        return { path, name, createdAt: (await stat(path)).mtimeMs }
      } catch {
        return null
      }
    })
  )
  const recent = files
    .filter((file): file is NonNullable<typeof file> => file !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT)
  const result = await Promise.all(
    recent.map(async (file) => {
      try {
        const thumbnail = await nativeImage.createThumbnailFromPath(file.path, {
          width: 240,
          height: 135
        })
        return { ...file, preview: thumbnail.toDataURL() }
      } catch {
        return null
      }
    })
  )
  return result.filter((item): item is Screenshot => item !== null)
}

export function openScreenshot(path: string): void {
  const file = inFolder(path)
  if (file) void shell.openPath(file)
}

export function showScreenshot(path: string): void {
  const file = inFolder(path)
  if (file) shell.showItemInFolder(file)
}

export function openScreenshotsFolder(): void {
  const folder = screenshotsFolder()
  void mkdir(folder, { recursive: true }).then(() => shell.openPath(folder))
}

export function copyScreenshot(path: string): void {
  const file = inFolder(path)
  if (file) void writeClipboardImage(nativeImage.createFromPath(file))
}

/** Glisser une capture vers une autre application (mail, discussion…). */
export function dragScreenshot(sender: WebContents, path: string): void {
  const file = inFolder(path)
  if (!file) return
  const icon = nativeImage.createFromPath(file)
  if (icon.isEmpty()) return
  sender.startDrag({ file, icon: icon.resize({ width: 96 }) })
}

export async function pickScreenshotsFolder(parent: BrowserWindow | null): Promise<string | null> {
  const options = {
    defaultPath: screenshotsFolder(),
    properties: ['openDirectory' as const, 'createDirectory' as const]
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

/* ---------- Outil de Tessera ---------- */

export type CaptureMode = 'region' | 'screen'

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

/** Image d'un écran, en pixels réels. */
async function captureDisplay(display: Display): Promise<NativeImage> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor)
    }
  })
  const index = screen.getAllDisplays().findIndex((item) => item.id === display.id)
  const source =
    sources.find((item) => item.display_id === String(display.id)) ?? sources[index] ?? sources[0]
  if (!source || source.thumbnail.isEmpty()) throw new Error('capture failed')
  return source.thumbnail
}

/** Enregistre la capture, la copie et prévient l'utilisateur. */
async function save(image: NativeImage): Promise<Screenshot> {
  const folder = screenshotsFolder()
  await mkdir(folder, { recursive: true })
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const prefix = getTranslation().headerBar.screenshot.filePrefix
  let name = `${prefix} ${stamp}.png`
  for (let index = 2; await exists(join(folder, name)); index += 1) {
    name = `${prefix} ${stamp} (${index}).png`
  }
  const path = join(folder, name)
  await writeFile(path, image.toPNG())
  await writeClipboardImage(image)
  const text = getTranslation().headerBar.screenshot
  void notifyFromTessera({ title: text.savedTitle, body: text.savedBody, tag: 'screenshot' })
  return {
    path,
    name,
    preview: image.resize({ width: 240 }).toDataURL(),
    createdAt: now.getTime()
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Fenêtre plein écran, au-dessus de tout (applications insérées comprises), sur un écran :
 * une page locale (dans un dossier temporaire) qui répond en changeant l'ancre de son
 * adresse. Renvoie cette ancre, ou `null` si la fenêtre est fermée.
 */
export async function showOverlay(
  display: Display,
  files: Record<string, Buffer | string>
): Promise<string | null> {
  const folder = join(tmpdir(), `tessera-overlay-${process.pid}-${Date.now()}`)
  await mkdir(folder, { recursive: true })
  for (const [name, data] of Object.entries(files)) await writeFile(join(folder, name), data)

  const overlay = new BrowserWindow({
    ...display.bounds,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    backgroundColor: '#000000',
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  overlay.webContents.on('will-navigate', (event) => event.preventDefault())

  try {
    return await new Promise((done) => {
      overlay.webContents.on('did-navigate-in-page', (_event, url) =>
        done(new URL(url).hash.slice(1) || null)
      )
      overlay.on('closed', () => done(null))
      // Autre application au premier plan (Alt+Tab) : annulé
      overlay.on('blur', () => done(null))
      overlay.once('ready-to-show', () => {
        overlay.setBounds(display.bounds)
        overlay.show()
        overlay.focus()
      })
      void overlay.loadFile(join(folder, 'index.html'))
    })
  } finally {
    if (!overlay.isDestroyed()) overlay.destroy()
    void rm(folder, { recursive: true, force: true })
  }
}

/** Écran sous la souris et son image figée. */
export async function captureCursorDisplay(): Promise<{ display: Display; image: NativeImage }> {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  return { display, image: await captureDisplay(display) }
}

/** Zone choisie à la souris (pixels de l'écran, avant mise à l'échelle), `null` si annulé. */
async function selectRegion(
  display: Display,
  image: NativeImage
): Promise<{ x: number; y: number; width: number; height: number } | 'screen' | null> {
  // L'image figée sert de fond : ce qui est sélectionné est exactement ce qui sera enregistré
  const hash = await showOverlay(display, {
    'screen.jpg': image.toJPEG(88),
    'index.html': overlayPage(getTranslation().headerBar.screenshot.hint)
  })
  const match = /^done:(\d+),(\d+),(\d+),(\d+)$/.exec(hash ?? '')
  if (match) {
    const [x, y, width, height] = match.slice(1).map(Number)
    return { x, y, width, height }
  }
  return hash === 'screen' ? 'screen' : null
}

/** Zone ou écran entier (celui sous la souris). */
export async function captureScreen(mode: CaptureMode): Promise<Screenshot | null> {
  // Le panneau du widget vient de se fermer : on laisse l'écran se redessiner
  await wait(350)
  const { display, image } = await captureCursorDisplay()
  if (mode === 'screen') return save(image)
  const region = await selectRegion(display, image)
  if (!region) return null
  if (region === 'screen') return save(image)
  const scale = image.getSize().width / display.size.width
  return save(
    image.crop({
      x: Math.round(region.x * scale),
      y: Math.round(region.y * scale),
      width: Math.max(1, Math.round(region.width * scale)),
      height: Math.max(1, Math.round(region.height * scale))
    })
  )
}

/** Fenêtres ouvertes, pour choisir celle à capturer. */
export async function listCaptureWindows(): Promise<
  { id: string; name: string; preview: string }[]
> {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 320, height: 180 }
  })
  return sources
    .filter((source) => !source.thumbnail.isEmpty() && source.name.trim())
    .map((source) => ({ id: source.id, name: source.name, preview: source.thumbnail.toDataURL() }))
}

/** Une fenêtre, même cachée derrière une autre, sans ses bordures invisibles. */
export async function captureWindowById(id: string): Promise<Screenshot | null> {
  const match = /^window:(\d+):/.exec(String(id))
  if (!match) return null
  const hwnd = Number(match[1])
  if (!w.isWindow(hwnd)) return null
  await wait(250)
  const capture = w.captureWindow(hwnd)
  if (!capture) return null
  const image = nativeImage.createFromBitmap(capture.bits, {
    width: capture.width,
    height: capture.height
  })
  const outer = w.getWindowRect(hwnd)
  const frame = w.getFrameRect(hwnd)
  const crop = {
    x: Math.max(0, frame.left - outer.left),
    y: Math.max(0, frame.top - outer.top),
    width: Math.min(capture.width, frame.right - frame.left),
    height: Math.min(capture.height, frame.bottom - frame.top)
  }
  return save(crop.width > 0 && crop.height > 0 ? image.crop(crop) : image)
}

function overlayPage(hint: string): string {
  const escaped = hint.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src file:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>
html,body{margin:0;height:100%;overflow:hidden;cursor:crosshair;user-select:none;background:#000}
img{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
#shade{position:fixed;inset:0;background:rgba(0,0,0,.4)}
#selection{position:fixed;display:none;outline:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 0 100vmax rgba(0,0,0,.4)}
#size{position:fixed;display:none;padding:2px 6px;border-radius:4px;background:rgba(20,20,24,.85);color:#fff;font:12px "Segoe UI",sans-serif}
#hint{position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:8px;background:rgba(20,20,24,.85);color:#fff;font:13px "Segoe UI",sans-serif;pointer-events:none}
</style></head>
<body><img src="screen.jpg" alt=""><div id="shade"></div><div id="selection"></div><div id="size"></div><div id="hint">${escaped}</div>
<script>
const selection = document.getElementById('selection'), shade = document.getElementById('shade'), size = document.getElementById('size'), hint = document.getElementById('hint')
let start = null, rect = null
const finish = (hash) => { location.hash = hash }
addEventListener('keydown', (event) => { if (event.key === 'Escape') finish('cancel'); if (event.key === 'Enter') finish('screen') })
addEventListener('contextmenu', (event) => { event.preventDefault(); finish('cancel') })
addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return
  start = { x: event.clientX, y: event.clientY }
  document.body.setPointerCapture(event.pointerId)
})
addEventListener('pointermove', (event) => {
  if (!start) return
  const x = Math.min(start.x, event.clientX), y = Math.min(start.y, event.clientY)
  rect = { x, y, width: Math.abs(event.clientX - start.x), height: Math.abs(event.clientY - start.y) }
  Object.assign(selection.style, { display: 'block', left: x + 'px', top: y + 'px', width: rect.width + 'px', height: rect.height + 'px' })
  shade.style.display = 'none'
  hint.style.display = 'none'
  const ratio = devicePixelRatio
  size.textContent = Math.round(rect.width * ratio) + ' × ' + Math.round(rect.height * ratio)
  Object.assign(size.style, { display: 'block', left: x + 'px', top: Math.max(0, y - 26) + 'px' })
})
addEventListener('pointerup', () => {
  if (!start) return
  start = null
  // Simple clic : l'écran entier
  if (!rect || rect.width < 4 || rect.height < 4) return finish('screen')
  finish('done:' + [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(','))
})
</script></body></html>`
}
