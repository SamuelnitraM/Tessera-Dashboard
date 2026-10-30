import { join } from 'node:path'
import { app, ipcMain, screen, type BrowserWindow, type Rectangle } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { PageDrop, WindowNavigate, WindowPages } from '@shared/windows'
import { getDashboard, onDashboardChange } from './dashboard-store'
import { getOwner, rootWindowAt } from './desktop/win32'
import { readJsonFile, writeJsonFile } from './json-file'
import { logApp } from './log'
import {
  createTesseraWindow,
  getMainWindow,
  getTesseraWindows,
  hwndOf,
  isAppQuitting,
  showWindow,
  tesseraWindowOf
} from './window'

/**
 * Pages des fenêtres de Tessera. La fenêtre principale affiche toutes les pages qui ne sont pas
 * dans une autre fenêtre ; une autre fenêtre affiche sa liste de pages. Un onglet de page lâché
 * hors de sa fenêtre ouvre une nouvelle fenêtre, ou rejoint la fenêtre de Tessera sous la
 * souris ; une fenêtre dont la dernière page part se ferme (les fenêtres fusionnent). Les autres
 * fenêtres et leurs pages sont retrouvées au lancement suivant (`windows.json`).
 */

interface Placement {
  /** Pages de la fenêtre (ignorées pour la fenêtre principale). */
  pageIds: string[]
  /** Applications ouvertes en onglet dans cette fenêtre. */
  openedApps: string[]
}

/** Fenêtre secondaire gardée pour le lancement suivant. */
interface SavedWindow {
  pageIds: string[]
  bounds: Rectangle
  isMaximized: boolean
}

const placements = new Map<BrowserWindow, Placement>()
/**
 * Fenêtres du lancement rouvertes : avant cela, rien n'est noté (quitter pendant le démarrage
 * effacerait les fenêtres gardées).
 */
let restored = false

const isPrimary = (window: BrowserWindow): boolean => window === getMainWindow()

const existingPageIds = (): Set<string> => new Set(getDashboard().pages.map((page) => page.id))

/** Pages affichées par les fenêtres secondaires. */
function secondaryPages(except?: BrowserWindow): Set<string> {
  const ids = new Set<string>()
  for (const [window, placement] of placements) {
    if (window === except || isPrimary(window)) continue
    for (const id of placement.pageIds) ids.add(id)
  }
  return ids
}

/** Pages affichées par une fenêtre, dans l'ordre du tableau de bord. */
export function pagesOf(window: BrowserWindow): string[] {
  const all = getDashboard().pages.map((page) => page.id)
  if (isPrimary(window)) {
    const elsewhere = secondaryPages()
    return all.filter((id) => !elsewhere.has(id))
  }
  const own = new Set(placements.get(window)?.pageIds ?? [])
  return all.filter((id) => own.has(id))
}

/**
 * Fenêtre où une application installée est affichée : celle de la page d'un bloc qui l'affiche
 * (ou la garde de côté), sinon celle où elle est ouverte en onglet.
 */
export function windowOfApp(appId: string): BrowserWindow | null {
  for (const page of getDashboard().pages) {
    const shows = page.widgets.some(
      ({ config }) =>
        config.appId === appId ||
        config.embeddedAppId === appId ||
        (Array.isArray(config.parked) && config.parked.includes(appId))
    )
    if (shows) return ownerOfPage(page.id)
  }
  for (const [window, placement] of placements) {
    if (placement.openedApps.includes(appId)) return window
  }
  return null
}

/** Fenêtre qui affiche cette page (la principale par défaut). */
export function ownerOfPage(pageId: string): BrowserWindow | null {
  for (const [window, placement] of placements) {
    if (!isPrimary(window) && placement.pageIds.includes(pageId)) return window
  }
  return getMainWindow()
}

export function pagesFor(window: BrowserWindow): WindowPages {
  const appsElsewhere = new Set<string>()
  for (const [other, placement] of placements) {
    if (other !== window) for (const id of placement.openedApps) appsElsewhere.add(id)
  }
  const primary = isPrimary(window)
  return {
    primary,
    pageIds: primary ? [] : pagesOf(window),
    elsewhere: [...getTesseraWindows()]
      .filter((other) => other !== window)
      .flatMap((other) => pagesOf(other)),
    appsElsewhere: [...appsElsewhere],
    windowCount: placements.size
  }
}

/** Dernières pages envoyées à chaque fenêtre (rien n'est renvoyé si rien n'a changé). */
const sent = new WeakMap<BrowserWindow, string>()

function sendPages(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  const pages = pagesFor(window)
  const key = JSON.stringify(pages)
  if (sent.get(window) === key) return
  sent.set(window, key)
  window.webContents.send(IpcChannels.windowsPagesChanged, pages)
}

/** Chaque fenêtre reçoit ses pages (après un déplacement, une fermeture…). */
function pushPages(): void {
  for (const window of placements.keys()) sendPages(window)
  scheduleSave()
}

/** Ouvre une fenêtre de Tessera ; `pageIds` vide : la fenêtre principale. */
function openWindow(
  pageIds: string[],
  options: { hidden?: boolean; bounds?: Rectangle; maximized?: boolean } = {}
): BrowserWindow {
  const window = createTesseraWindow(options)
  placements.set(window, { pageIds, openedApps: [] })
  window.on('move', scheduleSave)
  window.on('resize', scheduleSave)
  window.on('closed', () => {
    placements.delete(window)
    // Fenêtre principale fermée : la suivante le devient (elle affiche alors toutes les pages
    // qui ne sont dans aucune autre fenêtre, les siennes comprises)
    const main = getMainWindow()
    const placement = main && placements.get(main)
    if (placement) placement.pageIds = []
    if (!isAppQuitting()) pushPages()
  })
  return window
}

/** Fenêtres du lancement : la principale, puis les autres fenêtres gardées avec leurs pages. */
export function openStartupWindows(hidden: boolean): BrowserWindow {
  const main = openWindow([], { hidden })
  const existing = existingPageIds()
  const taken = new Set<string>()
  for (const saved of loadSavedWindows()) {
    const pageIds = saved.pageIds.filter((id) => existing.has(id) && !taken.has(id))
    if (pageIds.length === 0) continue
    for (const id of pageIds) taken.add(id)
    openWindow(pageIds, { hidden, bounds: saved.bounds, maximized: saved.isMaximized })
  }
  restored = true
  onDashboardChange(() => {
    // Pages supprimées : retirées des fenêtres ; une fenêtre qui n'en a plus se ferme
    const ids = existingPageIds()
    for (const [window, placement] of placements) {
      if (isPrimary(window)) continue
      placement.pageIds = placement.pageIds.filter((id) => ids.has(id))
      if (placement.pageIds.length === 0 && !window.isDestroyed()) window.close()
    }
    pushPages()
  })
  return main
}

// ---------------------------------------------------------------------------
// Déplacement des pages
// ---------------------------------------------------------------------------

/** Fenêtre de Tessera sous la souris (ou sous un de ses cadres d'application), sinon `null`. */
function windowUnderCursor(): BrowserWindow | null {
  const point = screen.dipToScreenPoint(screen.getCursorScreenPoint())
  const root = rootWindowAt(point.x, point.y)
  if (!root) return null
  // Le cadre d'une application insérée appartient à sa fenêtre de Tessera
  const candidates = [root, getOwner(root)]
  return (
    getTesseraWindows().find(
      (window) => !window.isDestroyed() && window.isVisible() && candidates.includes(hwndOf(window))
    ) ?? null
  )
}

/** Retire la page de sa fenêtre secondaire (elle revient à la principale si on n'en fait rien). */
function takePage(pageId: string): void {
  for (const [window, placement] of placements) {
    if (!isPrimary(window)) placement.pageIds = placement.pageIds.filter((id) => id !== pageId)
  }
}

/** La fenêtre va à la page (et donne le focus au bloc). */
function navigate(window: BrowserWindow, target: WindowNavigate): void {
  showWindow(window)
  window.webContents.send(IpcChannels.windowsNavigate, target)
}

/** Une fenêtre sans page se ferme : ses applications et ses blocs sont déjà partis. */
function closeIfEmpty(window: BrowserWindow): void {
  if (window.isDestroyed() || pagesOf(window).length > 0) return
  window.close()
}

/** Déplace la page dans une fenêtre existante. */
function moveToWindow(pageId: string, source: BrowserWindow, target: BrowserWindow): void {
  takePage(pageId)
  if (!isPrimary(target)) placements.get(target)?.pageIds.push(pageId)
  pushPages()
  navigate(target, { pageId })
  closeIfEmpty(source)
}

/**
 * Ouvre la page dans une nouvelle fenêtre, de la taille de sa fenêtre d'origine, à `at` (coin
 * haut gauche, px DIP). Seule page de sa fenêtre : c'est la fenêtre qui se déplace.
 */
function moveToNewWindow(
  pageId: string,
  source: BrowserWindow,
  at: { x: number; y: number }
): void {
  const size = source.getNormalBounds()
  const bounds = {
    x: Math.round(at.x),
    y: Math.round(at.y),
    width: size.width,
    height: size.height
  }
  if (pagesOf(source).length <= 1) {
    if (source.isMaximized()) source.unmaximize()
    source.setBounds(bounds)
    showWindow(source)
    return
  }
  takePage(pageId)
  const window = openWindow([pageId], { bounds })
  window.once('ready-to-show', () => navigate(window, { pageId }))
  pushPages()
  logApp(`[fenêtres] page ${pageId} ouverte dans une nouvelle fenêtre`)
}

/**
 * Onglet de page lâché par l'utilisateur : dans sa propre fenêtre (`same`, l'interface range
 * l'onglet), sur une autre fenêtre de Tessera (`moved`), ou ailleurs : nouvelle fenêtre (`new`).
 */
export function dropPage(source: BrowserWindow, pageId: string): PageDrop {
  stopDrag()
  if (ownerOfPage(pageId) !== source) return 'same'
  const target = windowUnderCursor()
  if (target === source) return 'same'
  if (target) {
    moveToWindow(pageId, source, target)
    return 'moved'
  }
  // La nouvelle fenêtre arrive sous la souris, l'onglet à peu près là où il a été lâché
  const cursor = screen.getCursorScreenPoint()
  moveToNewWindow(pageId, source, { x: cursor.x - 120, y: cursor.y - 16 })
  return 'new'
}

/** « Ouvrir dans une nouvelle fenêtre » (menu de la page) : décalée de la fenêtre d'origine. */
export function openPageInNewWindow(source: BrowserWindow, pageId: string): void {
  if (ownerOfPage(pageId) !== source || pagesOf(source).length <= 1) return
  const bounds = source.getBounds()
  moveToNewWindow(pageId, source, { x: bounds.x + 40, y: bounds.y + 40 })
}

/** « Déplacer vers la fenêtre principale » (menu de la page d'une autre fenêtre). */
export function movePageToMain(source: BrowserWindow, pageId: string): void {
  const main = getMainWindow()
  if (!main || main === source || ownerOfPage(pageId) !== source) return
  moveToWindow(pageId, source, main)
}

/** Va à une page, dans la fenêtre qui l'affiche (notification, bloc d'une autre fenêtre…). */
export function showPage(pageId: string, blockId?: string): void {
  const window = ownerOfPage(pageId)
  if (window && !window.isDestroyed()) navigate(window, { pageId, ...(blockId && { blockId }) })
}

/** Page créée dans une fenêtre secondaire : elle y reste. */
export function claimPage(window: BrowserWindow, pageId: string): void {
  const placement = placements.get(window)
  if (!placement || isPrimary(window) || ownerOfPage(pageId) !== getMainWindow()) return
  placement.pageIds.push(pageId)
  pushPages()
}

/** Applications ouvertes en onglet dans une fenêtre : les autres ne les ferment pas. */
export function setOpenedApps(window: BrowserWindow, appIds: string[]): void {
  const placement = placements.get(window)
  if (!placement) return
  placement.openedApps = appIds.slice(0, 200)
  for (const other of placements.keys()) if (other !== window) sendPages(other)
}

// ---------------------------------------------------------------------------
// Onglet tiré au-dessus d'une autre fenêtre
// ---------------------------------------------------------------------------

const DRAG_POLL_MS = 60
let drag: { source: BrowserWindow; timer: NodeJS.Timeout; over: BrowserWindow | null } | null = null

function setDropTarget(window: BrowserWindow | null, value: boolean): void {
  if (window && !window.isDestroyed()) window.webContents.send(IpcChannels.windowsDropTarget, value)
}

/** Glisser d'un onglet de page en cours hors de sa fenêtre : la fenêtre dessous le montre. */
export function dragPage(source: BrowserWindow, dragging: boolean): void {
  stopDrag()
  if (!dragging) return
  const follow = (): void => {
    if (!drag) return
    const under = windowUnderCursor()
    const over = under === drag.source ? null : under
    if (over === drag.over) return
    setDropTarget(drag.over, false)
    setDropTarget(over, true)
    drag.over = over
  }
  drag = { source, timer: setInterval(follow, DRAG_POLL_MS), over: null }
  follow()
}

function stopDrag(): void {
  if (!drag) return
  clearInterval(drag.timer)
  setDropTarget(drag.over, false)
  drag = null
}

// ---------------------------------------------------------------------------
// Fenêtres gardées pour le lancement suivant
// ---------------------------------------------------------------------------

const savedPath = (): string => join(app.getPath('userData'), 'windows.json')

function loadSavedWindows(): SavedWindow[] {
  const data = readJsonFile(savedPath()) as { windows?: unknown } | undefined
  if (!Array.isArray(data?.windows)) return []
  return data.windows.flatMap((item): SavedWindow[] => {
    const record = item as Partial<SavedWindow>
    const bounds = record?.bounds
    if (
      !Array.isArray(record?.pageIds) ||
      !bounds ||
      ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    ) {
      return []
    }
    // Hors de tout écran (écran débranché) : la fenêtre revient sur l'écran principal
    const visible = screen
      .getAllDisplays()
      .some(
        ({ workArea }) =>
          workArea.x < bounds.x + bounds.width &&
          bounds.x < workArea.x + workArea.width &&
          workArea.y < bounds.y + bounds.height &&
          bounds.y < workArea.y + workArea.height
      )
    const area = screen.getPrimaryDisplay().workArea
    return [
      {
        pageIds: record.pageIds.filter((id): id is string => typeof id === 'string'),
        bounds: visible ? bounds : { ...bounds, x: area.x + 60, y: area.y + 60 },
        isMaximized: record.isMaximized === true
      }
    ]
  })
}

/** Fenêtres secondaires et leurs pages, notées pour le lancement suivant. */
export function saveWindows(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  if (!restored) return
  const windows: SavedWindow[] = []
  for (const window of placements.keys()) {
    if (isPrimary(window) || window.isDestroyed()) continue
    windows.push({
      pageIds: pagesOf(window),
      bounds: window.getNormalBounds(),
      isMaximized: window.isMaximized()
    })
  }
  writeJsonFile(savedPath(), { windows })
}

let saveTimer: NodeJS.Timeout | null = null

function scheduleSave(): void {
  if (isAppQuitting()) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveWindows, 1000)
}

// ---------------------------------------------------------------------------
// Appels de l'interface
// ---------------------------------------------------------------------------

const text = (value: unknown): string => (typeof value === 'string' ? value.slice(0, 200) : '')

export function registerWindowHandlers(): void {
  /** Fenêtre de Tessera qui appelle (une autre fenêtre : rien). */
  const from = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
    tesseraWindowOf(event.sender)
  ipcMain.handle(IpcChannels.windowsPages, (event) => {
    const window = from(event)
    if (window) sent.set(window, JSON.stringify(pagesFor(window)))
    return window ? pagesFor(window) : null
  })
  ipcMain.handle(IpcChannels.windowsDragPage, (event, dragging: unknown) => {
    const window = from(event)
    if (window) dragPage(window, dragging === true)
  })
  ipcMain.handle(IpcChannels.windowsDropPage, (event, pageId: unknown) => {
    const window = from(event)
    return window ? dropPage(window, text(pageId)) : 'same'
  })
  ipcMain.handle(IpcChannels.windowsOpenPage, (event, pageId: unknown) => {
    const window = from(event)
    if (window) openPageInNewWindow(window, text(pageId))
  })
  ipcMain.handle(IpcChannels.windowsMovePage, (event, pageId: unknown) => {
    const window = from(event)
    if (window) movePageToMain(window, text(pageId))
  })
  ipcMain.handle(IpcChannels.windowsShowPage, (_event, pageId: unknown, blockId: unknown) =>
    showPage(text(pageId), text(blockId) || undefined)
  )
  ipcMain.handle(IpcChannels.windowsClaimPage, (event, pageId: unknown) => {
    const window = from(event)
    if (window) claimPage(window, text(pageId))
  })
  ipcMain.handle(IpcChannels.windowsSetOpenedApps, (event, appIds: unknown) => {
    const window = from(event)
    if (window && Array.isArray(appIds)) setOpenedApps(window, appIds.map(text).filter(Boolean))
  })
}
