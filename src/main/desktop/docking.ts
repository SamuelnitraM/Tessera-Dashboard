import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { app, nativeImage, screen, type BrowserWindow } from 'electron'
import type { DesktopApp, DesktopAppState, HostRect } from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { readJsonFile, writeJsonFile } from '../json-file'
import { getSettings } from '../settings-store'
import { saveMinSize } from './programs'
import * as w from './win32'

/**
 * Fenêtres des applications installées affichées dans Tessera (mode « ancré »).
 *
 * La fenêtre de l'application reste une vraie fenêtre Windows. Tessera en devient la
 * propriétaire (elle reste au-dessus de Tessera, hors de la barre des tâches), lui retire sa
 * barre de titre si elle en a une, puis la maintient exactement sur le bloc ou l'onglet qui
 * l'affiche : déplacement et redimensionnement de Tessera, changement de page, réduction…
 *
 * Pourquoi pas une vraie sous-fenêtre (SetParent) ? Testé : si Tessera plantait, la fenêtre
 * de l'application serait détruite avec elle, et les applications WPF ne s'y affichent pas.
 * Ici, en cas de plantage, l'application reste ouverte et Tessera lui rend son apparence au
 * lancement suivant (fichier `docked-windows.json`).
 *
 * Aucun minuteur : tout est déclenché par les événements de Tessera et de Windows.
 */

interface SavedWindow {
  style: number
  exStyle: number
  owner: number
  placement: w.WindowPlacement
}

interface DockedWindow {
  appId: string
  hwnd: w.Hwnd
  pid: number
  saved: SavedWindow
  /** Affichée par Tessera. Sert à reconnaître ce que l'application fait d'elle-même. */
  shown: boolean
  /** Masquée par l'application elle-même (Discord fermé dans sa zone de notification…). */
  hiddenByApp: boolean
  /** Rectangle de la fenêtre après le dernier placement, et emplacement visé. */
  placed: w.Rect | null
  target: string | null
  /** Taille visée (px physiques), pour recadrer les captures. */
  size: { width: number; height: number }
  clipped: boolean
  /** Repositionnements demandés par l'application elle-même (protection contre les boucles). */
  corrections: { count: number; since: number }
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
}

/** Délai maximal d'apparition de la fenêtre après le lancement. */
const LAUNCH_TIMEOUT_MS = 30_000
/** Une fenêtre plus petite est un écran de démarrage, pas la fenêtre principale. */
const MIN_MAIN_WINDOW = { width: 400, height: 300 }
const NOT_MAXIMIZED = ~(w.WS.MAXIMIZE | w.WS.MINIMIZE)

let hostWindow: BrowserWindow | null = null
let hostHwnd: w.Hwnd = 0
let listeners: DockingListeners = { changed: () => {}, reveal: () => {} }
/** Fenêtre de Tessera recouverte par son interface (fenêtre de dialogue, mode édition…). */
let suspended = false

const hosts = new Map<string, Host>()
/** Bloc ou onglet qui affiche chaque application. */
const activeHosts = new Map<string, string>()
const windows = new Map<string, DockedWindow>()
const states = new Map<string, DesktopAppState>()

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
// Sauvegarde de secours (plantage de Tessera)
// ---------------------------------------------------------------------------

interface CrashEntry {
  hwnd: number
  pid: number
  hiddenByApp: boolean
  saved: SavedWindow
}

const crashFile = (): string => join(app.getPath('userData'), 'docked-windows.json')

/** Écrite immédiatement (pas de délai) : elle doit exister même si Tessera plante juste après. */
function saveCrashList(): void {
  const entries: CrashEntry[] = [...windows.values()].map(({ hwnd, pid, hiddenByApp, saved }) => ({
    hwnd,
    pid,
    hiddenByApp,
    saved
  }))
  writeJsonFile(crashFile(), entries)
}

/** Au démarrage : rend leur apparence aux fenêtres restées ancrées après un plantage. */
function recoverAfterCrash(): void {
  const entries = readJsonFile(crashFile())
  if (!Array.isArray(entries) || entries.length === 0) return
  for (const entry of entries as CrashEntry[]) {
    if (typeof entry?.hwnd !== 'number' || !entry.saved?.placement) continue
    // Même numéro de fenêtre ET même processus : c'est bien la fenêtre ancrée
    if (!w.isWindow(entry.hwnd) || w.getProcessId(entry.hwnd) !== entry.pid) continue
    restoreWindow(entry.hwnd, entry.saved, entry.hiddenByApp)
  }
  writeJsonFile(crashFile(), [])
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

function hide(docked: DockedWindow): void {
  if (!docked.shown) return
  docked.shown = false
  w.showWindow(docked.hwnd, w.SW.HIDE)
}

/** Sort la fenêtre de l'état réduit ou agrandi, directement à l'emplacement visé. */
function normalize(hwnd: w.Hwnd, rect: w.Rect): void {
  if (!w.isMinimized(hwnd) && !w.isMaximized(hwnd)) return
  const placement = w.getPlacement(hwnd)
  w.setPlacement(hwnd, {
    ...placement,
    flags: 0,
    showCmd: w.SW.SHOWNOACTIVATE,
    rcNormalPosition: rect
  })
}

/** Bloc ou onglet visible qui affiche l'application, en px physiques à l'écran. */
function hostTarget(appId: string): { screen: w.Rect; rect: HostRect; scale: number } | null {
  const hostId = activeHosts.get(appId)
  const rect = hostId ? hosts.get(hostId)?.rect : null
  const clip = rect?.clip
  if (!rect || suspended || !hostIsVisible() || (clip && (clip.width <= 0 || clip.height <= 0))) {
    return null
  }
  const scale = hostScale()
  const origin = w.clientOrigin(hostHwnd)
  const left = origin.x + Math.round(rect.x * scale)
  const top = origin.y + Math.round(rect.y * scale)
  return {
    screen: {
      left,
      top,
      right: left + Math.max(1, Math.round(rect.width * scale)),
      bottom: top + Math.max(1, Math.round(rect.height * scale))
    },
    rect,
    scale
  }
}

/** Place la fenêtre sur son bloc, ou la masque si son bloc n'est pas visible. */
function place(docked: DockedWindow): void {
  if (!w.isWindow(docked.hwnd)) {
    forget(docked)
    return setState(docked.appId, { status: 'closed' })
  }
  const target = docked.hiddenByApp ? null : hostTarget(docked.appId)
  if (!target) return hide(docked)

  const { screen: area, scale } = target
  const clip = target.rect.clip
  const { left, top } = area
  const width = area.right - area.left
  const height = area.bottom - area.top

  const current = w.getWindowRect(docked.hwnd)
  const key = [left, top, width, height, clip?.x, clip?.y, clip?.width, clip?.height].join()
  if (docked.shown && key === docked.target && sameRect(docked.placed, current)) return

  normalize(docked.hwnd, area)
  // Bordures invisibles (fenêtres redimensionnables) : le cadre visible doit couvrir le bloc
  const frame = w.getFrameRect(docked.hwnd)
  const outer = w.getWindowRect(docked.hwnd)
  const border = {
    left: frame.left - outer.left,
    top: frame.top - outer.top,
    right: outer.right - frame.right,
    bottom: outer.bottom - frame.bottom
  }
  w.setWindowPos(
    docked.hwnd,
    left - border.left,
    top - border.top,
    width + border.left + border.right,
    height + border.top + border.bottom,
    w.SWP.NOACTIVATE | w.SWP.NOZORDER | w.SWP.NOOWNERZORDER
  )
  const placed = w.getWindowRect(docked.hwnd)
  docked.placed = placed
  docked.target = key
  docked.size = { width, height }

  // Partie visible : le bloc (fenêtre plus grande que lui à cause de sa taille minimale), ou
  // la partie du bloc visible dans la page qui défile
  const tooBig =
    placed.right - placed.left > width + border.left + border.right ||
    placed.bottom - placed.top > height + border.top + border.bottom
  const scaled = clip && {
    x: Math.round(clip.x * scale),
    y: Math.round(clip.y * scale),
    width: Math.round(clip.width * scale),
    height: Math.round(clip.height * scale)
  }
  if (scaled || tooBig) {
    const area = scaled ?? { x: 0, y: 0, width, height }
    w.setRegion(docked.hwnd, {
      left: border.left + area.x,
      top: border.top + area.y,
      right: border.left + area.x + area.width,
      bottom: border.top + area.y + area.height
    })
    docked.clipped = true
  } else if (docked.clipped) {
    w.setRegion(docked.hwnd, null)
    docked.clipped = false
  }

  if (!docked.shown) {
    docked.shown = true
    // ShowWindow et non SWP_SHOWWINDOW : envoie WM_SHOWWINDOW, sans quoi WPF ne se redessine pas
    w.showWindow(docked.hwnd, w.SW.SHOWNA)
  }
}

function placeAll(): void {
  for (const docked of windows.values()) place(docked)
}

// ---------------------------------------------------------------------------
// Ancrage
// ---------------------------------------------------------------------------

/** Rend à la fenêtre son apparence et sa position d'origine. */
function restoreWindow(hwnd: w.Hwnd, saved: SavedWindow, hidden: boolean): void {
  w.showWindow(hwnd, w.SW.HIDE)
  w.setOwner(hwnd, saved.owner)
  w.setRegion(hwnd, null)
  w.setStyle(hwnd, saved.style & ~w.WS.VISIBLE & NOT_MAXIMIZED)
  w.setExStyle(hwnd, saved.exStyle)
  w.setDockedLook(hwnd, false)
  w.setWindowPos(
    hwnd,
    0,
    0,
    0,
    0,
    w.SWP.NOMOVE | w.SWP.NOSIZE | w.SWP.NOZORDER | w.SWP.FRAMECHANGED | w.SWP.NOACTIVATE
  )
  // Réaffichée comme avant (normale, agrandie ou réduite), sauf si l'application s'était masquée
  w.setPlacement(hwnd, hidden ? { ...saved.placement, showCmd: w.SW.HIDE } : saved.placement)
}

function forget(docked: DockedWindow): void {
  docked.unwatch()
  if (windows.get(docked.appId) === docked) windows.delete(docked.appId)
  saveCrashList()
}

function undock(docked: DockedWindow): void {
  forget(docked)
  if (w.isWindow(docked.hwnd)) restoreWindow(docked.hwnd, docked.saved, docked.hiddenByApp)
}

function dock(appId: string, hwnd: w.Hwnd, pid: number): void {
  const saved: SavedWindow = {
    style: w.getStyle(hwnd),
    exStyle: w.getExStyle(hwnd),
    owner: w.getOwner(hwnd),
    placement: w.getPlacement(hwnd)
  }
  const docked: DockedWindow = {
    appId,
    hwnd,
    pid,
    saved,
    shown: true,
    hiddenByApp: false,
    placed: null,
    target: null,
    size: { width: 0, height: 0 },
    clipped: false,
    corrections: { count: 0, since: 0 },
    unwatch: () => {}
  }
  const stripCaption = w.hasNativeCaption(hwnd)
  hide(docked)
  // Réduite ou agrandie : remise à l'état normal, directement sur son bloc
  normalize(hwnd, hostTarget(appId)?.screen ?? w.getWindowRect(hwnd))
  w.showWindow(hwnd, w.SW.HIDE)

  w.setOwner(hwnd, hostHwnd)
  let style = w.getStyle(hwnd) & NOT_MAXIMIZED
  if (stripCaption) style &= ~(w.WS.CAPTION | w.WS.THICKFRAME)
  w.setStyle(hwnd, style)
  w.setExStyle(hwnd, saved.exStyle & ~w.WS_EX_APPWINDOW) // hors de la barre des tâches
  w.setDockedLook(hwnd, true)
  // Au-dessus de Tessera : changer de propriétaire ne réordonne pas les fenêtres
  w.setWindowPos(
    hwnd,
    0,
    0,
    0,
    0,
    w.SWP.NOMOVE | w.SWP.NOSIZE | w.SWP.FRAMECHANGED | w.SWP.NOACTIVATE
  )

  // Taille minimale imposée par l'application : on lui demande 1×1 et on regarde ce qu'elle garde
  w.setWindowPos(hwnd, 0, 0, 1, 1, w.SWP.NOMOVE | w.SWP.NOZORDER | w.SWP.NOACTIVATE)
  const frame = w.getFrameRect(hwnd)
  const scale = hostScale()
  saveMinSize(
    appId,
    Math.round((frame.right - frame.left) / scale),
    Math.round((frame.bottom - frame.top) / scale)
  )

  docked.unwatch = w.watchProcessWindows(pid, (event, target) => {
    if (target === hwnd) onWindowEvent(docked, event)
  })
  windows.set(appId, docked)
  saveCrashList()
  setState(appId, { status: 'running', error: null })
  place(docked)
}

/** Ce que l'application fait d'elle-même (les événements arrivent après coup). */
function onWindowEvent(docked: DockedWindow, event: number): void {
  if (windows.get(docked.appId) !== docked) return
  switch (event) {
    case w.WinEvent.OBJECT_DESTROY:
      forget(docked)
      setState(docked.appId, { status: 'closed' })
      return

    case w.WinEvent.OBJECT_HIDE:
      // Masquée alors que Tessera l'affichait : fermée dans sa zone de notification
      if (docked.shown && !w.isVisible(docked.hwnd)) {
        docked.shown = false
        docked.hiddenByApp = true
        saveCrashList()
        setState(docked.appId, { status: 'closed' })
      }
      return

    case w.WinEvent.OBJECT_SHOW:
      // Réaffichée par l'application (rouverte, clic sur sa notification…)
      if (!docked.shown && w.isVisible(docked.hwnd)) {
        docked.shown = true
        docked.hiddenByApp = false
        docked.target = null
        saveCrashList()
        setState(docked.appId, { status: 'running', error: null })
        const hostId = activeHosts.get(docked.appId)
        if (hostId && hosts.get(hostId)?.rect && hostIsVisible() && !suspended) place(docked)
        else {
          // Son bloc n'est pas affiché : Tessera s'ouvre dessus
          docked.shown = false
          w.showWindow(docked.hwnd, w.SW.HIDE)
          listeners.reveal(docked.appId)
        }
      }
      return

    case w.WinEvent.SYSTEM_MINIMIZESTART:
      // Son bouton « réduire » : dans un bloc, la fenêtre reste en place
      setTimeout(() => {
        docked.target = null
        place(docked)
      }, 0)
      return

    case w.WinEvent.OBJECT_LOCATIONCHANGE: {
      // Déplacée ou agrandie par l'application : remise sur son bloc (10 fois par seconde au plus)
      if (!docked.shown || sameRect(docked.placed, w.getWindowRect(docked.hwnd))) return
      const now = Date.now()
      if (now - docked.corrections.since > 1000) docked.corrections = { count: 0, since: now }
      if (++docked.corrections.count > 10) return
      docked.target = null
      place(docked)
    }
  }
}

// ---------------------------------------------------------------------------
// Lancement
// ---------------------------------------------------------------------------

/** Découpe des arguments en respectant les guillemets : `a "b c" d` -> [a, b c, d]. */
function splitArgs(args: string): string[] {
  return [...args.matchAll(/"([^"]*)"|(\S+)/g)].map((match) => match[1] ?? match[2])
}

/** Fenêtre principale de l'application, si elle est ouverte. */
function findMainWindow(desktopApp: DesktopApp): w.TopWindow | undefined {
  const taken = new Set([...windows.values()].map((docked) => docked.hwnd))
  return w
    .findTopWindows(desktopApp.processName)
    .find(
      (candidate) =>
        !taken.has(candidate.hwnd) &&
        candidate.title !== '' &&
        (w.isMinimized(candidate.hwnd) ||
          (candidate.width >= MIN_MAIN_WINDOW.width && candidate.height >= MIN_MAIN_WINDOW.height))
    )
}

/** Ancre la fenêtre de l'application si elle est déjà ouverte. */
function connect(desktopApp: DesktopApp): boolean {
  const found = findMainWindow(desktopApp)
  if (!found) return false
  dock(desktopApp.id, found.hwnd, found.pid)
  return true
}

/** Lance (ou rouvre) l'application, puis ancre sa fenêtre dès qu'elle apparaît. */
export async function launchApp(appId: string): Promise<void> {
  const desktopApp = findApp(appId)
  if (!desktopApp || getAppState(appId).status === 'starting') return
  const docked = windows.get(appId)
  if (docked && w.isVisible(docked.hwnd) && !docked.hiddenByApp) return place(docked)
  if (!docked && connect(desktopApp)) return

  setState(appId, { status: 'starting', error: null })
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(desktopApp.path, splitArgs(desktopApp.args), {
        cwd: dirname(desktopApp.path),
        detached: true,
        stdio: 'ignore'
      })
      child.once('error', reject)
      child.once('spawn', () => {
        child.unref()
        resolve()
      })
    })
  } catch (error) {
    setState(appId, { status: 'error', error: (error as Error).message })
    return
  }

  // Une application déjà ancrée mais masquée (Discord) se réaffiche : géré par OBJECT_SHOW
  const start = Date.now()
  while (Date.now() - start < LAUNCH_TIMEOUT_MS) {
    await sleep(400)
    const current = windows.get(appId)
    if (current && !current.hiddenByApp) return
    if (!current && findMainWindow(desktopApp)) {
      // Laisse le temps à un éventuel écran de démarrage de se fermer
      await sleep(800)
      if (connect(desktopApp)) return
    }
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
  if (getAppState(appId).status === 'starting') return
  // Déjà ouverte : ancrée tout de suite. Sinon, lancée la première fois seulement :
  // une application fermée par l'utilisateur attend qu'il la rouvre.
  if (!connect(desktopApp) && getAppState(appId).status === 'idle') void launchApp(appId)
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

/** Rend sa fenêtre normale à l'application (elle quitte Tessera). */
export function releaseApp(appId: string): void {
  const docked = windows.get(appId)
  if (docked) undock(docked)
  states.delete(appId)
  listeners.changed(appId, getAppState(appId))
}

/** Masque les fenêtres pendant que l'interface de Tessera passe au-dessus (dialogue, édition…). */
export function setSuspended(value: boolean): void {
  if (suspended === value) return
  suspended = value
  placeAll()
}

/** Images des fenêtres affichées, montrées à leur place pendant qu'elles sont masquées. */
export function captureApps(): Record<string, string> {
  const images: Record<string, string> = {}
  for (const docked of windows.values()) {
    if (!docked.shown) continue
    const capture = w.captureWindow(docked.hwnd)
    if (!capture) continue
    const frame = w.getFrameRect(docked.hwnd)
    const outer = w.getWindowRect(docked.hwnd)
    const image = nativeImage
      .createFromBitmap(capture.bits, { width: capture.width, height: capture.height })
      .crop({
        x: frame.left - outer.left,
        y: frame.top - outer.top,
        width: Math.min(docked.size.width, frame.right - frame.left),
        height: Math.min(docked.size.height, frame.bottom - frame.top)
      })
    images[docked.appId] = `data:image/jpeg;base64,${image.toJPEG(85).toString('base64')}`
  }
  return images
}

/** Applications supprimées des réglages : leur fenêtre redevient normale. */
export function releaseRemovedApps(): void {
  const ids = new Set(getSettings().apps.items.map((item) => item.id))
  for (const appId of [...windows.keys()]) if (!ids.has(appId)) releaseApp(appId)
}

/** Avant de quitter : toutes les applications retrouvent leur fenêtre normale. */
export function releaseAllApps(): void {
  for (const docked of [...windows.values()]) undock(docked)
}

/** Branche le gestionnaire sur la fenêtre de Tessera. */
export function initDocking(window: BrowserWindow, next: DockingListeners): void {
  hostWindow = window
  hostHwnd = Number(window.getNativeWindowHandle().readBigInt64LE(0))
  listeners = next
  recoverAfterCrash()

  // Suit la fenêtre de Tessera (les événements « move » arrivent pendant le déplacement)
  window.on('move', placeAll)
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
