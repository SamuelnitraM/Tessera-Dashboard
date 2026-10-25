import { dirname } from 'node:path'
import { nativeImage, screen, type BrowserWindow } from 'electron'
import type {
  DesktopApp,
  DesktopAppPan,
  DesktopAppSnapshot,
  DesktopAppState,
  HostRect,
  QuitMode
} from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { getSettings } from '../settings-store'
import {
  adoptWindow,
  createFrame,
  releaseFrame,
  setFrameHostLostListener,
  setFramePanListener,
  setFramePannable,
  setFrameWheel,
  setFrameWheelListeners
} from './frames'
import { saveMinSize } from './programs'
import { childStyle, returnWindow, saveWindow, type SavedWindow } from './saved-window'
import * as w from './win32'

/**
 * Fenêtres des applications installées affichées dans Tessera.
 *
 * Chaque fenêtre est insérée dans un « cadre » : une petite fenêtre sans bordure, de la taille
 * exacte de la partie visible du bloc, posée au-dessus de Tessera. La fenêtre de l'application
 * y garde sa taille réelle (au moins sa taille minimale) : ce qui dépasse est caché, et le
 * décalage choisi par l'utilisateur fait glisser le contenu. Le clic gauche + droit sur une
 * fenêtre rognée est détecté par l'hébergeur et transmis au bloc, qui déplace le contenu.
 *
 * Les cadres sont créés par un processus séparé (src/main/frame-host) : si Tessera plantait,
 * la fenêtre insérée serait détruite avec un cadre lui appartenant. L'hébergeur, lui, rend leur
 * fenêtre aux applications dès que Tessera disparaît.
 *
 * Insérée dans un cadre, la fenêtre n'a plus de barre de titre, de bord redimensionnable ni de
 * bouton agrandir. Si l'application essaie quand même de se déplacer ou de se redimensionner
 * (glisser sa barre de titre dessinée…), l'opération est annulée et la fenêtre remise en place.
 *
 * Aucun minuteur : tout est déclenché par les événements de Tessera et de Windows.
 */

interface DockedWindow {
  appId: string
  hwnd: w.Hwnd
  pid: number
  frame: w.Hwnd
  saved: SavedWindow
  /** Taille minimale imposée par l'application (px physiques). */
  min: { width: number; height: number }
  /** Cadre affiché. */
  shown: boolean
  /** Fenêtre rognée (plus grande que son bloc) : l'hébergeur le sait, pour le clic gauche + droit. */
  pannable: boolean
  /** Masquée par l'application elle-même (Discord fermé dans sa zone de notification…). */
  hiddenByApp: boolean
  /** Rectangle de la fenêtre (écran) après le dernier placement, et emplacement visé. */
  placed: w.Rect | null
  target: string | null
  /** Taille de la fenêtre (px physiques), pour les captures. */
  size: { width: number; height: number }
  /** Repositionnements demandés par l'application elle-même (protection contre les boucles). */
  corrections: { count: number; since: number }
  /** Étirée au-delà de son bloc : son cadre est passé au-dessus des autres. */
  raised: boolean
  /** Sa molette fait défiler la page (l'hébergeur le sait). */
  pageWheel: boolean
  unwatch: () => void
}

interface Host {
  appId: string
  rect: HostRect | null
}

interface DockingListeners {
  changed: (appId: string, state: DesktopAppState) => void
  /** L'application demande à s'afficher (clic sur sa notification…) : l'interface va vers elle. */
  reveal: (appId: string) => void
  /** Clic gauche + droit sur une fenêtre rognée : son bloc déplace le contenu. */
  pan: (pan: DesktopAppPan) => void
  /** La fenêtre de Tessera a bougé : les fenêtres étirées reprennent la taille de leur bloc. */
  moved: () => void
  /** Molette au-dessus de la fenêtre d'un bloc (px, positif vers le bas) : la page défile. */
  wheel: (hostId: string, deltaY: number) => void
  /** Clic dans l'application d'un bloc : il devient actif (`null` : souris sortie). */
  activate: (hostId: string | null) => void
}

/** Délai maximal d'apparition de la fenêtre après le lancement. */
const LAUNCH_TIMEOUT_MS = 30_000
/** Une fenêtre plus petite est un écran de démarrage, pas la fenêtre principale. */
const MIN_MAIN_WINDOW = { width: 400, height: 300 }

let hostWindow: BrowserWindow | null = null
let hostHwnd: w.Hwnd = 0
let listeners: DockingListeners = {
  changed: () => {},
  reveal: () => {},
  pan: () => {},
  moved: () => {},
  wheel: () => {},
  activate: () => {}
}
/** Fenêtre de Tessera recouverte par son interface (fenêtre de dialogue, mode édition…). */
let suspended = false

const hosts = new Map<string, Host>()
/** Bloc ou onglet qui affiche chaque application. */
const activeHosts = new Map<string, string>()
const windows = new Map<string, DockedWindow>()
const states = new Map<string, DesktopAppState>()
/** Applications en cours d'insertion (création du cadre). */
const docking = new Set<string>()

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function findApp(appId: string): DesktopApp | undefined {
  return getSettings().apps.items.find(
    (item): item is DesktopApp => item.id === appId && isDesktopApp(item)
  )
}

export function getAppState(appId: string): DesktopAppState {
  return states.get(appId) ?? { status: 'idle', hostId: null, error: null }
}

export function getAppStates(): Record<string, DesktopAppState> {
  return Object.fromEntries(states)
}

function setState(appId: string, patch: Partial<DesktopAppState>): void {
  const next = { ...getAppState(appId), hostId: activeHosts.get(appId) ?? null, ...patch }
  const previous = states.get(appId)
  if (JSON.stringify(previous) === JSON.stringify(next)) return
  states.set(appId, next)
  listeners.changed(appId, next)
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

const sameRect = (a: w.Rect | null, b: w.Rect): boolean =>
  a !== null && a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom

function hostIsVisible(): boolean {
  return !!hostWindow && hostWindow.isVisible() && !hostWindow.isMinimized()
}

/** Facteur px CSS -> px physiques (échelle de l'écran de Tessera × zoom de l'interface). */
function hostScale(): number {
  if (!hostWindow) return 1
  const display = screen.getDisplayMatching(hostWindow.getBounds())
  return display.scaleFactor * hostWindow.webContents.getZoomFactor()
}

interface Layout {
  /** Cadre : partie visible du bloc, à l'écran. */
  frame: { x: number; y: number; width: number; height: number }
  /** Fenêtre de l'application, relative au cadre. */
  window: { x: number; y: number; width: number; height: number }
  /** Fenêtre plus grande que le bloc. */
  cropped: boolean
  /** Étirée par l'utilisateur : au-dessus des autres blocs. */
  raised: boolean
  /** La molette fait défiler la page. */
  pageWheel: boolean
}

/** Où poser le cadre et la fenêtre, ou `null` si le bloc n'est pas visible. */
function layoutFor(docked: DockedWindow): Layout | null {
  const hostId = activeHosts.get(docked.appId)
  const rect = hostId ? hosts.get(hostId)?.rect : null
  if (!rect || suspended || docked.hiddenByApp || !hostIsVisible()) return null
  const scale = hostScale()
  const px = (value: number): number => Math.round(value * scale)
  const origin = w.clientOrigin(hostHwnd)

  // Bloc entier (px physiques, écran) et partie visible (page qui défile)
  const block = {
    x: origin.x + px(rect.x),
    y: origin.y + px(rect.y),
    width: Math.max(1, px(rect.width)),
    height: Math.max(1, px(rect.height))
  }
  const clip = rect.clip
    ? {
        x: px(rect.clip.x),
        y: px(rect.clip.y),
        width: px(rect.clip.width),
        height: px(rect.clip.height)
      }
    : { x: 0, y: 0, width: block.width, height: block.height }
  if (clip.width <= 0 || clip.height <= 0) return null

  // Fenêtre : au moins sa taille minimale ; le décalage choisit la partie affichée
  const width = Math.max(block.width, docked.min.width)
  const height = Math.max(block.height, docked.min.height)
  const offsetX = Math.min(Math.max(0, px(rect.offset?.x ?? 0)), width - block.width)
  const offsetY = Math.min(Math.max(0, px(rect.offset?.y ?? 0)), height - block.height)
  return {
    frame: { x: block.x + clip.x, y: block.y + clip.y, width: clip.width, height: clip.height },
    window: { x: -clip.x - offsetX, y: -clip.y - offsetY, width, height },
    cropped: width > block.width || height > block.height,
    raised: rect.raised === true,
    pageWheel: rect.pageWheel === true
  }
}

function hideFrame(docked: DockedWindow): void {
  if (!docked.shown) return
  docked.shown = false
  w.showWindow(docked.frame, w.SW.HIDE)
}

/** Remet la fenêtre dans l'état normal (ni réduite ni agrandie). */
function normalize(hwnd: w.Hwnd): void {
  if (!w.isMinimized(hwnd) && !w.isMaximized(hwnd)) return
  const placement = w.getPlacement(hwnd)
  w.setPlacement(hwnd, { ...placement, flags: 0, showCmd: w.SW.SHOWNOACTIVATE })
}

/** Place le cadre sur son bloc et la fenêtre dans le cadre, ou masque le cadre. */
function place(docked: DockedWindow): void {
  if (!w.isWindow(docked.hwnd) || !w.isWindow(docked.frame)) {
    forget(docked)
    return setState(docked.appId, { status: 'closed' })
  }
  const layout = layoutFor(docked)
  if (!layout) return hideFrame(docked)

  const { frame, window } = layout
  if (docked.pannable !== layout.cropped) {
    docked.pannable = layout.cropped
    setFramePannable(docked.frame, layout.cropped)
  }
  if (docked.pageWheel !== layout.pageWheel) {
    docked.pageWheel = layout.pageWheel
    setFrameWheel(docked.frame, layout.pageWheel)
  }
  const key = JSON.stringify(layout)
  const current = w.getWindowRect(docked.hwnd)
  if (docked.shown && key === docked.target && sameRect(docked.placed, current)) return

  normalize(docked.hwnd)
  // Demandes postées : une application occupée (ou l'hébergeur qui l'attend) ne bloque pas
  // Tessera. La position visée est retenue, la fenêtre y sera dans un instant.
  const quiet = w.SWP.NOACTIVATE | w.SWP.NOZORDER | w.SWP.NOOWNERZORDER | w.SWP.ASYNCWINDOWPOS
  w.setWindowPos(docked.frame, frame.x, frame.y, frame.width, frame.height, quiet)
  w.setWindowPos(docked.hwnd, window.x, window.y, window.width, window.height, quiet)
  docked.placed = {
    left: frame.x + window.x,
    top: frame.y + window.y,
    right: frame.x + window.x + window.width,
    bottom: frame.y + window.y + window.height
  }
  docked.target = key
  docked.size = { width: window.width, height: window.height }
  // Étirée : son cadre passe au-dessus des autres (applications, blocs voisins)
  if (layout.raised && !docked.raised) {
    const flags = (quiet & ~w.SWP.NOZORDER) | w.SWP.NOMOVE | w.SWP.NOSIZE
    w.setWindowPos(docked.frame, 0, 0, 0, 0, flags, w.HWND_TOP)
  }
  docked.raised = layout.raised

  if (!(w.getStyle(docked.hwnd) & w.WS.VISIBLE)) w.showWindow(docked.hwnd, w.SW.SHOWNA)
  if (!docked.shown) {
    docked.shown = true
    w.showWindow(docked.frame, w.SW.SHOWNA)
  }
}

function placeAll(): void {
  for (const docked of windows.values()) place(docked)
}

// ---------------------------------------------------------------------------
// Insertion dans un cadre
// ---------------------------------------------------------------------------

function forget(docked: DockedWindow): void {
  docked.unwatch()
  if (windows.get(docked.appId) === docked) windows.delete(docked.appId)
  releaseFrame(docked.hwnd, docked.frame)
}

/**
 * Sort la fenêtre de son cadre. `close` : elle est fermée comme par son bouton ✕ (sans jamais
 * apparaître sur le bureau). Sinon, elle retrouve sa place et son apparence d'origine.
 */
function undock(docked: DockedWindow, mode: 'close' | 'restore'): void {
  docked.unwatch()
  if (windows.get(docked.appId) === docked) windows.delete(docked.appId)
  if (w.isWindow(docked.hwnd)) {
    returnWindow(docked.hwnd, docked.saved, mode === 'restore' && !docked.hiddenByApp)
    if (mode === 'close') w.postMessage(docked.hwnd, w.WM_CLOSE)
  }
  releaseFrame(docked.hwnd, docked.frame)
}

async function dock(appId: string, hwnd: w.Hwnd, pid: number): Promise<void> {
  if (docking.has(appId) || windows.has(appId)) return
  docking.add(appId)
  try {
    const saved = saveWindow(hwnd)
    w.showWindow(hwnd, w.SW.HIDE)
    // Réduite ou agrandie : remise à l'état normal (encore masquée), puis taille minimale
    // imposée par l'application : on lui demande 1×1 et on regarde ce qu'elle garde
    normalize(hwnd)
    w.showWindow(hwnd, w.SW.HIDE)
    w.setWindowPos(hwnd, 0, 0, 1, 1, w.SWP.NOMOVE | w.SWP.NOZORDER | w.SWP.NOACTIVATE)
    const measured = w.getFrameRect(hwnd)
    const min = {
      width: Math.max(1, measured.right - measured.left),
      height: Math.max(1, measured.bottom - measured.top)
    }
    const scale = hostScale()
    saveMinSize(appId, Math.round(min.width / scale), Math.round(min.height / scale))

    const frame = await createFrame(hostHwnd, { x: 0, y: 0, width: 1, height: 1 })
    if (!frame || !w.isWindow(hwnd)) {
      if (w.isWindow(hwnd)) returnWindow(hwnd, saved, true)
      setState(appId, { status: 'error', error: 'frame' })
      return
    }
    adoptWindow(hwnd, frame, saved)
    w.setStyle(hwnd, childStyle(saved.style))
    w.setExStyle(hwnd, saved.exStyle & ~w.WS_EX_APPWINDOW)
    w.setParent(hwnd, frame)
    w.setWindowPos(
      hwnd,
      0,
      0,
      0,
      0,
      w.SWP.NOMOVE | w.SWP.NOSIZE | w.SWP.NOZORDER | w.SWP.FRAMECHANGED | w.SWP.NOACTIVATE
    )

    const docked: DockedWindow = {
      appId,
      hwnd,
      pid,
      frame,
      saved,
      min,
      shown: false,
      pannable: false,
      hiddenByApp: false,
      placed: null,
      target: null,
      size: { width: 0, height: 0 },
      corrections: { count: 0, since: 0 },
      raised: false,
      pageWheel: false,
      unwatch: () => {}
    }
    docked.unwatch = w.watchProcessWindows(pid, (event, target) => {
      if (target === hwnd) onWindowEvent(docked, event)
    })
    windows.set(appId, docked)
    setState(appId, { status: 'running', error: null })
    w.showWindow(hwnd, w.SW.SHOWNA)
    place(docked)
  } finally {
    docking.delete(appId)
  }
}

/** Ce que l'application fait d'elle-même (les événements arrivent après coup). */
function onWindowEvent(docked: DockedWindow, event: number): void {
  if (windows.get(docked.appId) !== docked) return
  const visible = (w.getStyle(docked.hwnd) & w.WS.VISIBLE) !== 0
  switch (event) {
    case w.WinEvent.OBJECT_DESTROY:
      forget(docked)
      setState(docked.appId, { status: 'closed' })
      return

    case w.WinEvent.OBJECT_HIDE:
      // Masquée par l'application : fermée dans sa zone de notification (Discord…)
      if (!visible && !docked.hiddenByApp) {
        docked.hiddenByApp = true
        hideFrame(docked)
        setState(docked.appId, { status: 'closed' })
      }
      return

    case w.WinEvent.OBJECT_SHOW:
      // Réaffichée par l'application (rouverte, clic sur sa notification…)
      if (visible && docked.hiddenByApp) {
        docked.hiddenByApp = false
        docked.target = null
        setState(docked.appId, { status: 'running', error: null })
        if (layoutFor(docked)) place(docked)
        else listeners.reveal(docked.appId) // son bloc n'est pas affiché : Tessera va vers lui
      }
      return

    case w.WinEvent.SYSTEM_MOVESIZESTART:
      // L'utilisateur tire la fenêtre (barre de titre dessinée, bord) : opération annulée
      w.postMessage(docked.hwnd, w.WM_CANCELMODE)
      setTimeout(() => {
        docked.target = null
        place(docked)
      }, 0)
      return

    case w.WinEvent.SYSTEM_MINIMIZESTART:
      // Son bouton « réduire » : dans un bloc, la fenêtre reste en place
      setTimeout(() => {
        docked.target = null
        place(docked)
      }, 0)
      return

    case w.WinEvent.OBJECT_LOCATIONCHANGE: {
      // Déplacée, agrandie ou redimensionnée par l'application : remise en place
      // (20 fois par seconde au plus, contre les boucles)
      if (!docked.shown || sameRect(docked.placed, w.getWindowRect(docked.hwnd))) return
      const now = Date.now()
      if (now - docked.corrections.since > 1000) docked.corrections = { count: 0, since: now }
      if (++docked.corrections.count > 20) return
      docked.target = null
      place(docked)
    }
  }
}

// ---------------------------------------------------------------------------
// Lancement
// ---------------------------------------------------------------------------

/** Fenêtre principale de l'application, si elle est ouverte (hors de Tessera). */
function findMainWindow(desktopApp: DesktopApp): w.TopWindow | undefined {
  return w
    .findTopWindows(desktopApp.processName)
    .find(
      (candidate) =>
        candidate.title !== '' &&
        (w.isMinimized(candidate.hwnd) ||
          (candidate.width >= MIN_MAIN_WINDOW.width && candidate.height >= MIN_MAIN_WINDOW.height))
    )
}

/** Insère la fenêtre de l'application si elle est déjà ouverte. */
function connect(desktopApp: DesktopApp): boolean {
  const found = findMainWindow(desktopApp)
  if (!found) return false
  void dock(desktopApp.id, found.hwnd, found.pid)
  return true
}

/** Lance (ou rouvre, ou ramène dans Tessera) l'application, puis insère sa fenêtre. */
export async function launchApp(appId: string): Promise<void> {
  const desktopApp = findApp(appId)
  if (!desktopApp || getAppState(appId).status === 'starting') return
  const docked = windows.get(appId)
  if (docked && !docked.hiddenByApp) return place(docked)
  if (!docked && connect(desktopApp)) return

  setState(appId, { status: 'starting', error: null })
  // Lancé comme un double-clic : l'application n'hérite d'aucune ressource de Tessera
  if (!w.shellExecute(desktopApp.path, desktopApp.args, dirname(desktopApp.path))) {
    setState(appId, { status: 'error', error: 'launch' })
    return
  }

  // Une application déjà insérée mais masquée (Discord) se réaffiche : géré par OBJECT_SHOW
  const start = Date.now()
  while (Date.now() - start < LAUNCH_TIMEOUT_MS) {
    await sleep(400)
    const current = windows.get(appId)
    if (current && !current.hiddenByApp) return
    if (!current && !docking.has(appId) && findMainWindow(desktopApp)) {
      // Laisse le temps à un éventuel écran de démarrage de se fermer
      await sleep(800)
      if (connect(desktopApp)) return
    }
    if (docking.has(appId)) return
  }
  setState(appId, { status: 'error', error: 'timeout' })
}

// ---------------------------------------------------------------------------
// Blocs et onglets (appels de l'interface)
// ---------------------------------------------------------------------------

/** Un bloc ou un onglet affiche l'application (elle s'ouvre si besoin). */
export function attachHost(hostId: string, appId: string, rect: HostRect | null): void {
  const desktopApp = findApp(appId)
  if (!desktopApp) return
  hosts.set(hostId, { appId, rect })
  activeHosts.set(appId, hostId)
  setState(appId, {})

  const docked = windows.get(appId)
  if (docked) {
    docked.target = null
    return place(docked)
  }
  const { status } = getAppState(appId)
  // Sortie de Tessera par l'utilisateur, ou en cours d'ouverture : on attend
  if (status === 'starting' || status === 'outside' || docking.has(appId)) return
  // Déjà ouverte : insérée tout de suite. Sinon, lancée la première fois seulement :
  // une application fermée par l'utilisateur attend qu'il la rouvre.
  if (!connect(desktopApp) && status === 'idle') void launchApp(appId)
}

/** Nouvel emplacement du bloc ou de l'onglet (déplacement, redimensionnement, défilement). */
export function moveHost(hostId: string, rect: HostRect | null): void {
  const host = hosts.get(hostId)
  if (!host) return
  host.rect = rect
  const docked = windows.get(host.appId)
  if (docked && activeHosts.get(host.appId) === hostId) place(docked)
}

/** Le bloc ou l'onglet n'est plus affiché (autre page, bloc retiré…). */
export function detachHost(hostId: string): void {
  const host = hosts.get(hostId)
  if (!host) return
  hosts.delete(hostId)
  if (activeHosts.get(host.appId) === hostId) {
    // Un autre bloc affiche la même application : il prend le relais
    const other = [...hosts.entries()].find(([, candidate]) => candidate.appId === host.appId)
    if (other) activeHosts.set(host.appId, other[0])
    else activeHosts.delete(host.appId)
    setState(host.appId, {})
  }
  const docked = windows.get(host.appId)
  if (docked) place(docked)
}

/**
 * Ferme l'application (bloc retiré, onglet fermé, application supprimée), comme par son bouton
 * ✕ : une application peut encore demander d'enregistrer, Discord passe dans sa zone de
 * notification. Elle n'apparaît jamais sur le bureau.
 */
export function closeApp(appId: string): void {
  const docked = windows.get(appId)
  if (docked) undock(docked, 'close')
  states.delete(appId)
  listeners.changed(appId, getAppState(appId))
}

/** « Sortir la fenêtre de Tessera » : l'application retrouve sa fenêtre sur le bureau. */
export function takeOutApp(appId: string): void {
  const docked = windows.get(appId)
  if (docked) undock(docked, 'restore')
  setState(appId, { status: 'outside', error: null })
}

/** Masque les fenêtres pendant que l'interface de Tessera passe au-dessus (dialogue, édition…). */
export function setSuspended(value: boolean): void {
  if (suspended === value) return
  suspended = value
  placeAll()
}

/** Images des fenêtres affichées (taille réelle), montrées à leur place pendant qu'elles sont masquées. */
export function captureApps(): Record<string, DesktopAppSnapshot> {
  const images: Record<string, DesktopAppSnapshot> = {}
  const scale = hostScale()
  for (const docked of windows.values()) {
    if (!docked.shown) continue
    const capture = w.captureWindow(docked.hwnd)
    if (!capture) continue
    const image = nativeImage.createFromBitmap(capture.bits, {
      width: capture.width,
      height: capture.height
    })
    images[docked.appId] = {
      url: `data:image/jpeg;base64,${image.toJPEG(85).toString('base64')}`,
      width: capture.width / scale,
      height: capture.height / scale
    }
  }
  return images
}

/** Applications supprimées des réglages : elles sont fermées. */
export function closeRemovedApps(): void {
  const ids = new Set(getSettings().apps.items.map((item) => item.id))
  for (const appId of [...windows.keys()]) if (!ids.has(appId)) closeApp(appId)
}

/** Avant de quitter : les applications sont fermées, ou rendues au bureau (réglage). */
export function releaseAllApps(mode: QuitMode): void {
  for (const docked of [...windows.values()]) undock(docked, mode)
}

/** Branche le gestionnaire sur la fenêtre de Tessera. */
export function initDocking(window: BrowserWindow, next: DockingListeners): void {
  hostWindow = window
  hostHwnd = Number(window.getNativeWindowHandle().readBigInt64LE(0))
  listeners = next

  // L'hébergeur des cadres s'est arrêté : les fenêtres insérées ont disparu avec ses cadres
  setFrameHostLostListener(() => {
    for (const docked of [...windows.values()]) {
      docked.unwatch()
      windows.delete(docked.appId)
      setState(docked.appId, { status: 'closed' })
    }
  })

  // Clic gauche + droit sur une fenêtre rognée : transmis à son bloc (px CSS)
  setFramePanListener(({ pan, frame, dx, dy }) => {
    const docked = [...windows.values()].find((candidate) => candidate.frame === frame)
    const hostId = docked && activeHosts.get(docked.appId)
    if (!hostId) return
    const scale = hostScale()
    listeners.pan({ hostId, phase: pan, dx: dx / scale, dy: dy / scale })
  })

  // Molette au-dessus de la fenêtre d'un bloc, clic dans son application : transmis au bloc
  const hostOfFrame = (frame: number): string | null => {
    const docked = [...windows.values()].find((candidate) => candidate.frame === frame)
    return (docked && activeHosts.get(docked.appId)) ?? null
  }
  setFrameWheelListeners({
    // Un cran de molette (120) : 100 px, comme dans une page web
    wheel: ({ wheel, delta }) => {
      const hostId = hostOfFrame(wheel)
      if (hostId) listeners.wheel(hostId, (-delta / 120) * 100)
    },
    active: ({ active }) => listeners.activate(active ? hostOfFrame(active) : null)
  })

  // Suit la fenêtre de Tessera (les événements « move » arrivent pendant le déplacement).
  // Une fenêtre étirée reprend alors la taille de son bloc.
  window.on('move', () => {
    listeners.moved()
    placeAll()
  })
  window.on('resize', placeAll)
  window.on('maximize', placeAll)
  window.on('unmaximize', placeAll)
  window.on('minimize', placeAll)
  window.on('restore', placeAll)
  window.on('hide', placeAll)
  window.on('show', placeAll)
  screen.on('display-metrics-changed', placeAll)

  // Interface rechargée : les blocs vont se réenregistrer
  window.webContents.on('did-start-loading', () => {
    hosts.clear()
    activeHosts.clear()
    placeAll()
  })
  window.on('closed', () => {
    screen.off('display-metrics-changed', placeAll)
    hostWindow = null
  })
}
