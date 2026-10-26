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
  setFrameFocusListener,
  setFramePanListener,
  setFramePannable,
  setFrameWheel,
  setFrameWheelListeners
} from './frames'
import { logDocking } from './log'
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
 * Le placement est déclenché par les événements de Tessera et de Windows. En plus, tant qu'une
 * fenêtre est insérée, une vérification toutes les 2 secondes compare l'état réel (cadre et
 * fenêtre visibles, parent, position, application qui répond) à l'état attendu : un écart est
 * noté dans le journal et réparé (bloc resté gris ou vide).
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
  /** Masquée par Tessera avec son cadre (dialogue, autre page…) : ce n'est pas l'application. */
  hiddenByUs: boolean
  hiddenByUsAt: number
  /** Rectangle de la fenêtre (écran) après le dernier placement, et emplacement visé. */
  placed: w.Rect | null
  target: string | null
  /** Taille de la fenêtre (px physiques), pour les captures. */
  size: { width: number; height: number }
  /** Repositionnements demandés par l'application elle-même (protection contre les boucles). */
  corrections: { count: number; since: number }
  /** Étirée au-delà de son bloc : son cadre est passé au-dessus des autres. */
  raised: boolean
  /** Fenêtre d'un jeu : elle garde sa taille (jamais réduite ni agrandie à celle du bloc). */
  fixedSize: boolean
  /** Dernier état noté dans le journal (affichée, ou raison du masquage), et dernière anomalie. */
  logged: string
  problem: string
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

/** Masquage signalé moins de 2 s après celui de Tessera : c'est le sien, pas celui de l'application. */
const OWN_HIDE_MS = 2000
/** Délai maximal d'apparition de la fenêtre après le lancement. */
const LAUNCH_TIMEOUT_MS = 30_000
/** Une fenêtre plus petite est un écran de démarrage, pas la fenêtre principale. */
const MIN_MAIN_WINDOW = { width: 400, height: 300 }
/** Fenêtre avec barre de titre ou bord : plus petite, ce n'est qu'une boîte de dialogue. */
const MIN_FRAMED_WINDOW = { width: 240, height: 160 }
/** Après ce délai, une fenêtre sans barre de titre ni bord est prise pour la fenêtre principale. */
const UNFRAMED_AFTER_MS = 12_000

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
/** Fermées ou sorties de Tessera pendant leur insertion : l'insertion s'arrête. */
const cancelled = new Set<string>()

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

/** Pourquoi la fenêtre n'est pas affichée en ce moment (journal), ou `null` si elle doit l'être. */
function hiddenReason(docked: DockedWindow): string | null {
  const hostId = activeHosts.get(docked.appId)
  if (!hostId) return 'aucun bloc ne l’affiche (autre page, navigateur mis de côté…)'
  const rect = hosts.get(hostId)?.rect
  if (!rect) return `bloc ${hostId} hors de la vue`
  if (suspended) return `interface par-dessus (${suspendReasons || 'raison inconnue'})`
  if (docked.hiddenByApp) return 'masquée par l’application'
  if (!hostIsVisible()) return 'Tessera réduit ou caché'
  if (rect.clip && (rect.clip.width <= 0 || rect.clip.height <= 0)) return 'bloc hors de la vue'
  return null
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

  // Fenêtre : au moins sa taille minimale (un jeu garde la sienne) ; le décalage choisit la
  // partie affichée
  const width = docked.fixedSize ? docked.min.width : Math.max(block.width, docked.min.width)
  const height = docked.fixedSize ? docked.min.height : Math.max(block.height, docked.min.height)
  const offsetX = Math.min(Math.max(0, px(rect.offset?.x ?? 0)), Math.max(0, width - block.width))
  const offsetY = Math.min(Math.max(0, px(rect.offset?.y ?? 0)), Math.max(0, height - block.height))
  return {
    frame: { x: block.x + clip.x, y: block.y + clip.y, width: clip.width, height: clip.height },
    window: { x: -clip.x - offsetX, y: -clip.y - offsetY, width, height },
    cropped: width > block.width || height > block.height,
    raised: rect.raised === true,
    pageWheel: rect.pageWheel === true
  }
}

/**
 * Masque le cadre et la fenêtre qu'il contient. La fenêtre est masquée elle aussi : une
 * application Chromium (Discord, navigateurs) sait alors qu'elle n'est plus visible, et se
 * redessine quand elle réapparaît. Sans cela, elle pouvait rester grise.
 */
function hideFrame(docked: DockedWindow): void {
  if (!docked.shown) return
  docked.shown = false
  docked.hiddenByUs = true
  docked.hiddenByUsAt = Date.now()
  w.showWindowAsync(docked.hwnd, w.SW.HIDE)
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
  if (!layout) {
    note(docked, `masquée : ${hiddenReason(docked) ?? 'raison inconnue'}`)
    return hideFrame(docked)
  }
  note(docked, `affichée dans ${activeHosts.get(docked.appId)}`)

  // La fenêtre a quitté son cadre (l'application l'a replacée sur le bureau) : remise dedans
  if (w.getParent(docked.hwnd) !== docked.frame) {
    logDocking(`${docked.appId} : fenêtre sortie de son cadre, remise dedans (${describe(docked)})`)
    w.setParent(docked.hwnd, docked.frame)
    docked.target = null
  }
  // L'application a remis son style de fenêtre normale (Brave, Chrome : au passage en plein
  // écran, ou de lui-même) : plus « enfant » du cadre, elle échappe au placement et prend la
  // taille de l'écran. Elle redevient une fenêtre enfant, puis est remise dans son bloc.
  const style = w.getStyle(docked.hwnd)
  if (style !== childStyle(style)) {
    logDocking(`${docked.appId} : style rétabli (0x${(style >>> 0).toString(16)})`)
    w.setStyle(docked.hwnd, childStyle(style))
    w.setWindowPos(
      docked.hwnd,
      0,
      0,
      0,
      0,
      w.SWP.NOMOVE | w.SWP.NOSIZE | w.SWP.NOZORDER | w.SWP.FRAMECHANGED | w.SWP.NOACTIVATE
    )
    docked.target = null
  }

  const { frame, window } = layout
  if (docked.pannable !== layout.cropped) {
    docked.pannable = layout.cropped
    setFramePannable(docked.frame, layout.cropped)
  }
  if (docked.pageWheel !== layout.pageWheel) {
    docked.pageWheel = layout.pageWheel
    setFrameWheel(docked.frame, layout.pageWheel)
  }
  // Cadre masqué sans nous (fenêtre de Tessera réduite puis rendue…) : il sera réaffiché
  if (docked.shown && !w.isVisible(docked.frame) && hostIsVisible()) docked.shown = false

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

  // Cadre d'abord, puis la fenêtre : elle apparaît déjà visible à l'écran, et se redessine
  if (!docked.shown) {
    docked.shown = true
    w.showWindow(docked.frame, w.SW.SHOWNA)
  }
  if (!(w.getStyle(docked.hwnd) & w.WS.VISIBLE)) w.showWindowAsync(docked.hwnd, w.SW.SHOWNA)
  docked.hiddenByUs = false
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
  logDocking(
    `${docked.appId} : sortie du cadre (${mode === 'close' ? 'fermée' : 'rendue au bureau'})`
  )
  docked.unwatch()
  if (windows.get(docked.appId) === docked) windows.delete(docked.appId)
  if (w.isWindow(docked.hwnd)) {
    // Application qui ne répond plus : ses appels attendraient sans fin (Tessera figé, ou
    // impossible à quitter). L'hébergeur des cadres lui rendra sa fenêtre en se fermant.
    if (w.isHung(docked.hwnd)) {
      logDocking(`${docked.appId} : ne répond plus, fenêtre laissée à l'hébergeur des cadres`)
    } else {
      returnWindow(docked.hwnd, docked.saved, mode === 'restore' && !docked.hiddenByApp)
    }
    if (mode === 'close') w.postMessage(docked.hwnd, w.WM_CLOSE)
  }
  releaseFrame(docked.hwnd, docked.frame)
}

async function dock(appId: string, hwnd: w.Hwnd, pid: number): Promise<void> {
  if (docking.has(appId) || windows.has(appId)) return
  // Application figée (en plein chargement…) : l'insérer bloquerait Tessera. Elle sera
  // insérée à la prochaine demande (bloc affiché, Réafficher).
  if (w.isHung(hwnd)) {
    logDocking(`${appId} : ne répond pas, insertion remise à plus tard`)
    setState(appId, { status: 'error', error: 'not-responding' })
    return
  }
  docking.add(appId)
  cancelled.delete(appId)
  try {
    const saved = saveWindow(hwnd)
    // Jeu : sa taille actuelle est gardée (un jeu supporte mal d'être redimensionné, surtout
    // en tout petit) ; le bloc s'agrandit pour la contenir
    const fixedSize = findApp(appId)?.release === 'desktop'
    w.showWindow(hwnd, w.SW.HIDE)
    // Réduite ou agrandie : remise à l'état normal (encore masquée), puis taille minimale
    // imposée par l'application : on lui demande 1×1 et on regarde ce qu'elle garde
    normalize(hwnd)
    w.showWindow(hwnd, w.SW.HIDE)
    if (!fixedSize) {
      w.setWindowPos(hwnd, 0, 0, 1, 1, w.SWP.NOMOVE | w.SWP.NOZORDER | w.SWP.NOACTIVATE)
    }
    // Jeu : sa zone intérieure (l'image du jeu), qui garde sa taille une fois la bordure retirée
    const measured = w.getFrameRect(hwnd)
    const client = fixedSize ? w.getClientSize(hwnd) : null
    const min = {
      width: Math.max(1, client?.width ?? measured.right - measured.left),
      height: Math.max(1, client?.height ?? measured.bottom - measured.top)
    }
    const scale = hostScale()
    saveMinSize(appId, Math.round(min.width / scale), Math.round(min.height / scale))

    const frame = await createFrame(hostHwnd, { x: 0, y: 0, width: 1, height: 1 })
    // Fermée ou sortie de Tessera pendant la création du cadre : rendue telle quelle
    if (cancelled.has(appId)) {
      cancelled.delete(appId)
      if (frame) releaseFrame(hwnd, frame)
      if (w.isWindow(hwnd)) returnWindow(hwnd, saved, true)
      return
    }
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
      hiddenByUs: false,
      hiddenByUsAt: 0,
      placed: null,
      target: null,
      size: { width: 0, height: 0 },
      corrections: { count: 0, since: 0 },
      raised: false,
      pageWheel: false,
      fixedSize,
      logged: '',
      problem: '',
      unwatch: () => {}
    }
    docked.unwatch = w.watchProcessWindows(pid, (event, target) => {
      if (target === hwnd) onWindowEvent(docked, event)
    })
    windows.set(appId, docked)
    startWatch()
    logDocking(`${appId} : insérée (${describe(docked)}${fixedSize ? ', taille gardée' : ''})`)
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
      logDocking(`${docked.appId} : fenêtre détruite par l'application`)
      forget(docked)
      setState(docked.appId, { status: 'closed' })
      return

    case w.WinEvent.OBJECT_HIDE:
      // Déjà réaffichée, ou masquée par Tessera avec son cadre (le masquage, demandé sans
      // attendre, peut être signalé après que Tessera a réaffiché la fenêtre) : rien à faire
      if (visible || docked.hiddenByUs || Date.now() - docked.hiddenByUsAt < OWN_HIDE_MS) return
      // Masquée par l'application : fermée dans sa zone de notification (Discord…). Pas
      // quand c'est Tessera qui l'a masquée avec son cadre.
      if (!docked.hiddenByApp) {
        logDocking(`${docked.appId} : fenêtre masquée par l'application`)
        docked.hiddenByApp = true
        hideFrame(docked)
        setState(docked.appId, { status: 'closed' })
      }
      return

    case w.WinEvent.OBJECT_SHOW:
      // Réaffichée par l'application (rouverte, clic sur sa notification…)
      if (visible && docked.hiddenByApp) {
        logDocking(`${docked.appId} : fenêtre réaffichée par l'application`)
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
      if (++docked.corrections.count > 20) {
        if (docked.corrections.count === 21) {
          logDocking(`${docked.appId} : trop de repositionnements, pause (${describe(docked)})`)
        }
        return
      }
      docked.target = null
      place(docked)
    }
  }
}

// ---------------------------------------------------------------------------
// Lancement
// ---------------------------------------------------------------------------

/** Fenêtre principale de l'application, si elle est ouverte (hors de Tessera). */
function findMainWindow(desktopApp: DesktopApp, allowUnframed = true): w.TopWindow | undefined {
  // Une vraie fenêtre (barre de titre ou bord) peut être petite : l'application a pu garder la
  // taille d'un bloc (fermée de force pendant son insertion). Sans cadre, c'est souvent un écran
  // de démarrage : il doit être grand.
  const usable = (list: w.TopWindow[]): w.TopWindow[] =>
    list.filter((candidate) => {
      if (candidate.title === '') return false
      if (w.isMinimized(candidate.hwnd)) return true
      const min = candidate.framed ? MIN_FRAMED_WINDOW : MIN_MAIN_WINDOW
      return candidate.width >= min.width && candidate.height >= min.height
    })
  let candidates = usable(w.findTopWindows(desktopApp.processName))
  // Rien sous ce nom : un lanceur (swriter.exe) peut ouvrir la fenêtre d'un autre programme de
  // son dossier (soffice.bin). Jamais pour un dossier de Windows (System32…), partagé.
  const folder = dirname(desktopApp.path).toLowerCase()
  const windowsFolder = (process.env.SystemRoot ?? 'C:\\Windows').toLowerCase()
  if (candidates.length === 0 && !folder.startsWith(windowsFolder)) {
    candidates = usable(w.findTopWindows(desktopApp.processName, folder))
  }
  // Un écran de démarrage (sans barre de titre ni bord : GIMP…) n'est pris que s'il n'y a rien
  // d'autre et que l'application a eu le temps de s'ouvrir (`allowUnframed`)
  return (
    candidates.find((candidate) => candidate.framed) ?? (allowUnframed ? candidates[0] : undefined)
  )
}

/** Insère la fenêtre de l'application si elle est déjà ouverte. */
function connect(desktopApp: DesktopApp, allowUnframed = true): boolean {
  const found = findMainWindow(desktopApp, allowUnframed)
  if (!found) return false
  void dock(desktopApp.id, found.hwnd, found.pid)
  return true
}

/**
 * Insère une fenêtre déjà trouvée (fenêtre d'un jeu en cours) : jamais de relance du programme,
 * même si sa fenêtre n'a pas de titre.
 */
export function insertWindow(appId: string, hwnd: w.Hwnd, pid: number): void {
  if (windows.get(appId)?.hwnd === hwnd) return
  void dock(appId, hwnd, pid)
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
    // Écran de démarrage sans barre de titre : accepté seulement après quelques secondes
    const allowUnframed = Date.now() - start > UNFRAMED_AFTER_MS
    if (!current && !docking.has(appId) && findMainWindow(desktopApp, allowUnframed)) {
      // Laisse le temps à un éventuel écran de démarrage de se fermer
      await sleep(800)
      if (connect(desktopApp, allowUnframed)) return
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
  const previous = activeHosts.get(appId)
  if (previous !== hostId) {
    logDocking(
      `${appId} : bloc ${hostId} l’affiche${previous ? ` (à la place de ${previous})` : ''}`
    )
  }
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
  logDocking(`${host.appId} : bloc ${hostId} ne l’affiche plus`)
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
  if (docking.has(appId)) cancelled.add(appId)
  const docked = windows.get(appId)
  // Fenêtre d'un jeu : jamais fermée par Tessera, rendue au bureau
  if (docked) undock(docked, docked.fixedSize ? 'restore' : 'close')
  states.delete(appId)
  listeners.changed(appId, getAppState(appId))
}

/** « Sortir la fenêtre de Tessera » : l'application retrouve sa fenêtre sur le bureau. */
export function takeOutApp(appId: string): void {
  if (docking.has(appId)) cancelled.add(appId)
  const docked = windows.get(appId)
  if (docked) undock(docked, 'restore')
  setState(appId, { status: 'outside', error: null })
}

/**
 * « Rafraîchir » (barre du bloc) ou « Réafficher » (bloc resté vide) : la fenêtre est vérifiée,
 * masquée puis remise dans son bloc, et redessinée ; sa taille change d'un pixel le temps d'un
 * instant, ce qui force une application qui ne se dessinait plus (bloc gris) à se redessiner.
 * Si elle n'est plus suivie, elle est retrouvée (ou l'application relancée).
 */
export function refreshApp(appId: string): void {
  const docked = windows.get(appId)
  logDocking(`${appId} : réaffichage demandé (${docked ? describe(docked) : 'non suivie'})`)
  if (!docked) {
    const desktopApp = findApp(appId)
    if (desktopApp && !connect(desktopApp)) void launchApp(appId)
    return
  }
  if (!w.isWindow(docked.hwnd)) return place(docked)
  // Masquée sans que Tessera le voie : réaffichée
  if (!(w.getStyle(docked.hwnd) & w.WS.VISIBLE)) {
    docked.hiddenByApp = false
    w.showWindow(docked.hwnd, w.SW.SHOWNA)
    setState(appId, { status: 'running', error: null })
  }
  docked.target = null
  hideFrame(docked)
  place(docked)
  if (!docked.shown) return
  const quiet = w.SWP.NOACTIVATE | w.SWP.NOZORDER | w.SWP.NOOWNERZORDER | w.SWP.ASYNCWINDOWPOS
  const { width, height } = docked.size
  w.setWindowPos(docked.hwnd, 0, 0, width - 1, height, quiet | w.SWP.NOMOVE)
  setTimeout(() => {
    if (windows.get(appId) !== docked || !w.isWindow(docked.hwnd)) return
    docked.target = null
    place(docked)
    w.redrawWindow(docked.frame)
  }, 150)
}

/** État d'une fenêtre insérée, pour le journal. */
function describe(docked: DockedWindow): string {
  if (!w.isWindow(docked.hwnd)) return 'fenêtre disparue'
  const rect = w.getWindowRect(docked.hwnd)
  return [
    `style 0x${(w.getStyle(docked.hwnd) >>> 0).toString(16)}`,
    `parent ${w.getParent(docked.hwnd) === docked.frame ? 'cadre' : w.getParent(docked.hwnd)}`,
    `fenêtre ${rect.right - rect.left}x${rect.bottom - rect.top} à ${rect.left},${rect.top}`,
    `visible ${w.isVisible(docked.hwnd)}`,
    `cadre ${docked.shown ? 'affiché' : 'masqué'}${w.isVisible(docked.frame) ? '' : ' (invisible)'}`,
    docked.hiddenByApp ? 'masquée par l’application' : ''
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Masque les fenêtres pendant que l'interface de Tessera passe au-dessus (dialogue, édition…).
 * `reasons` : ce qui passe par-dessus (journal).
 */
export function setSuspended(value: boolean, reasons = ''): void {
  if (suspended === value) return
  suspended = value
  suspendReasons = value ? reasons : ''
  suspendedSince = Date.now()
  logDocking(
    value ? `fenêtres masquées (interface par-dessus : ${reasons || '?'})` : 'fenêtres réaffichées'
  )
  placeAll()
}

/* ---------- Vérification régulière et journal ---------- */

const WATCH_MS = 2000
/** Interface par-dessus depuis plus longtemps : noté (dialogue oublié ouvert ?). */
const LONG_SUSPENSION_MS = 60_000
let watchTimer: NodeJS.Timeout | null = null
let suspendReasons = ''
let suspendedSince = 0
let longSuspensionLogged = false

/** Note un changement d'état de la fenêtre (une seule fois par changement). */
function note(docked: DockedWindow, state: string): void {
  if (docked.logged === state) return
  docked.logged = state
  logDocking(`${docked.appId} : ${state}`)
}

function startWatch(): void {
  watchTimer ??= setInterval(watchAll, WATCH_MS)
}

function watchAll(): void {
  if (windows.size === 0) {
    if (watchTimer) clearInterval(watchTimer)
    watchTimer = null
    return
  }
  if (suspended && Date.now() - suspendedSince > LONG_SUSPENSION_MS && !longSuspensionLogged) {
    longSuspensionLogged = true
    logDocking(`fenêtres masquées depuis plus d'une minute (${suspendReasons || '?'})`)
  }
  if (!suspended) longSuspensionLogged = false
  for (const docked of [...windows.values()]) watch(docked)
}

/** Compare l'état réel de la fenêtre à l'état attendu ; un écart est noté et réparé. */
function watch(docked: DockedWindow): void {
  if (!w.isWindow(docked.hwnd) || !w.isWindow(docked.frame)) return place(docked)
  const layout = layoutFor(docked)
  const problems: string[] = []
  let repair = false
  if (layout) {
    if (!docked.shown || !w.isVisible(docked.frame)) problems.push('cadre non affiché')
    if (!(w.getStyle(docked.hwnd) & w.WS.VISIBLE)) problems.push('fenêtre masquée dans son cadre')
    if (w.getParent(docked.hwnd) !== docked.frame) problems.push('fenêtre sortie de son cadre')
    const frame = w.getWindowRect(docked.frame)
    const expected = layout.frame
    if (
      frame.left !== expected.x ||
      frame.top !== expected.y ||
      frame.right - frame.left !== expected.width ||
      frame.bottom - frame.top !== expected.height
    ) {
      problems.push(
        `cadre mal placé (${frame.left},${frame.top} au lieu de ${expected.x},${expected.y})`
      )
    }
    if (!sameRect(docked.placed, w.getWindowRect(docked.hwnd))) problems.push('fenêtre déplacée')
    repair = problems.length > 0
    // Une application figée ne se redessine plus (fenêtre grise ou blanche) : Tessera n'y peut
    // rien, mais le journal le dit
    if (w.isHung(docked.hwnd)) problems.push('l’application ne répond plus')
  } else if (docked.shown || w.isVisible(docked.frame)) {
    problems.push(`cadre affiché alors qu'il devrait être masqué (${hiddenReason(docked)})`)
    repair = true
  }
  const key = problems.join(', ')
  if (key !== docked.problem) {
    docked.problem = key
    logDocking(
      key
        ? `${docked.appId} : anomalie : ${key} (${describe(docked)})${repair ? ', réparée' : ''}`
        : `${docked.appId} : de nouveau normale`
    )
  }
  if (!repair) return
  if (!layout) {
    docked.shown = true
    return hideFrame(docked)
  }
  docked.shown = false
  docked.target = null
  place(docked)
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
  // Un jeu n'est jamais fermé par Tessera (partie non sauvegardée) : rendu au bureau
  for (const docked of [...windows.values()]) undock(docked, docked.fixedSize ? 'restore' : mode)
}

/** Branche le gestionnaire sur la fenêtre de Tessera. */
export function initDocking(window: BrowserWindow, next: DockingListeners): void {
  hostWindow = window
  hostHwnd = Number(window.getNativeWindowHandle().readBigInt64LE(0))
  listeners = next

  // L'hébergeur des cadres s'est arrêté : les fenêtres insérées ont disparu avec ses cadres
  setFrameHostLostListener(() => {
    logDocking("l'hébergeur des cadres s'est arrêté")
    for (const docked of [...windows.values()]) {
      docked.unwatch()
      windows.delete(docked.appId)
      setState(docked.appId, { status: 'closed' })
    }
  })

  // Clavier refusé par une fenêtre insérée après un clic (barre d'adresse qui ne reçoit rien) :
  // noté, avec la raison connue (fenêtre désactivée par une boîte de dialogue)
  setFrameFocusListener(({ focus, ok, disabled, popup }) => {
    const docked = [...windows.values()].find((candidate) => candidate.frame === focus)
    if (!docked) return
    logDocking(
      `${docked.appId} : clavier ${ok ? 'donné' : 'refusé par Windows'}${
        disabled
          ? ` (fenêtre désactivée par une boîte de dialogue${popup ? ', mise au premier plan' : ' introuvable'})`
          : ''
      } (${describe(docked)})`
    )
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
    active: ({ active }) => {
      listeners.activate(active ? hostOfFrame(active) : null)
      // Clic dans l'application : sa fenêtre est revérifiée (style, place)
      const docked = [...windows.values()].find((candidate) => candidate.frame === active)
      if (docked) place(docked)
    }
  })

  // Suit la fenêtre de Tessera (les événements « move » arrivent pendant le déplacement).
  // Une fenêtre étirée reprend alors la taille de son bloc.
  window.on('move', () => {
    listeners.moved()
    placeAll()
  })
  window.on('resize', placeAll)
  window.on('focus', placeAll)
  window.on('maximize', placeAll)
  window.on('unmaximize', placeAll)
  window.on('minimize', placeAll)
  window.on('restore', placeAll)
  window.on('hide', placeAll)
  window.on('show', placeAll)
  screen.on('display-metrics-changed', placeAll)

  // Interface rechargée : les blocs vont se réenregistrer. Seulement la page elle-même :
  // `did-start-loading` arrive aussi quand un cadre interne charge (corps d'un mail, module…),
  // et toutes les fenêtres perdaient alors leur bloc (blocs gris).
  window.webContents.on('did-start-navigation', (details) => {
    if (!details.isMainFrame || details.isSameDocument) return
    logDocking('interface rechargée : les blocs vont se réenregistrer')
    hosts.clear()
    activeHosts.clear()
    for (const appId of states.keys()) setState(appId, {})
    placeAll()
  })
  window.on('closed', () => {
    screen.off('display-metrics-changed', placeAll)
    hostWindow = null
  })
}
