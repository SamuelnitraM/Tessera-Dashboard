import { basename, dirname } from 'node:path'
import { nativeImage, screen, type BrowserWindow } from 'electron'
import type {
  DesktopApp,
  DesktopAppPan,
  DesktopAppSnapshot,
  DesktopAppState,
  DesktopAppTabDrag,
  FullScreenMode,
  HostRect,
  QuitMode,
  HostHole
} from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { getSettings } from '../settings-store'
import {
  adoptWindow,
  createFrame,
  releaseFrame,
  setFrameHostLostListener,
  setFrameFocusListener,
  setFrameMiddle,
  setFrameMiddleListener,
  setFrameOwner,
  setTaskbarButton,
  setFramePanListener,
  setFramePannable,
  setFrameWheel,
  setFrameWheelListeners
} from './frames'
import { logDocking } from '../log'
import { launchTargetExists, saveMinSize } from './programs'
import { childStyle, isChromium, returnWindow, saveWindow, type SavedWindow } from './saved-window'
import * as w from './win32'
import { getMainWindow, hwndOf } from '../window'

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
  /** Fenêtre de Tessera propriétaire du cadre (celle du bloc qui l'affiche). */
  owner: BrowserWindow
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
  /** Fenêtre de Chromium : elle peut devenir la fenêtre active (voir `childStyle`). */
  activatable: boolean
  /**
   * Fenêtre de Chromium ou de Firefox : sans bordure Windows, elle garde à gauche, à droite et en
   * bas la place de son bord redimensionnable (bande noire), cachée par le cadre.
   */
  borderBand: boolean
  /** Dernier état noté dans le journal (affichée, ou raison du masquage), et dernière anomalie. */
  logged: string
  problem: string
  /**
   * Couleur unie vue à l'écran sur toute la fenêtre (elle ne se dessinait plus) : déjà relancée
   * pour cette couleur, pas de nouvelle relance tant qu'elle reste la même (page unie voulue).
   */
  blank: number | null
  /** Trous découpés dans le cadre (éléments de l'interface par-dessus), pour ne pas les refaire. */
  holes: string
  /** Sa molette fait défiler la page (l'hébergeur le sait), même après un clic (`always`). */
  pageWheel: boolean
  wheelAlways: boolean
  /** Vidéo en plein écran : l'hébergeur retient son clic molette. */
  stage: boolean
  /**
   * L'application s'est mise en plein écran (vidéo dans un navigateur…) : sa fenêtre a pris la
   * taille de l'écran. L'interface en fait une vidéo plein écran (sans la remettre dans son bloc).
   */
  fullScreen: boolean
  /**
   * Sortie de son cadre le temps qu'un onglet tiré y soit déposé (voir `openToTab`) : la partie
   * affichée de la fenêtre (px, relatifs à elle).
   */
  tabDrop: w.Rect | null
  unwatch: () => void
}

interface Host {
  appId: string
  rect: HostRect | null
  /** Fenêtre de Tessera du bloc ou de l'onglet. */
  window: BrowserWindow
}

interface DockingListeners {
  changed: (appId: string, state: DesktopAppState) => void
  /** L'application demande à s'afficher (clic sur sa notification…) : l'interface va vers elle. */
  reveal: (appId: string) => void
  /** Clic gauche + droit sur une fenêtre rognée : son bloc déplace le contenu. */
  pan: (window: BrowserWindow, pan: DesktopAppPan) => void
  /** Une fenêtre de Tessera a bougé : les fenêtres étirées reprennent la taille de leur bloc. */
  moved: (window: BrowserWindow) => void
  /** Molette au-dessus de la fenêtre d'un bloc (px, positif vers le bas) : la page défile. */
  wheel: (window: BrowserWindow, hostId: string, deltaY: number) => void
  /** Clic dans l'application d'un bloc : il devient actif (`null` : souris sortie). */
  activate: (window: BrowserWindow | null, hostId: string | null) => void
  /** L'application passe en plein écran (vidéo…) ou en sort. */
  fullScreen: (window: BrowserWindow, appId: string, value: boolean) => void
  /** Clic molette sur une vidéo en plein écran : la molette bascule entre la page et la vidéo. */
  middleClick: () => void
  /**
   * Onglet de navigateur tiré par l'utilisateur, et la souris dans cette fenêtre de Tessera
   * (`null` : relâché).
   */
  tabDrag: (window: BrowserWindow, drag: DesktopAppTabDrag | null) => void
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
/** Fenêtre détruite, programme encore ouvert : délai d'attente de la fenêtre qui la remplace. */
const REPLACE_TIMEOUT_MS = 8000

/** Fenêtres de Tessera branchées (voir `attachDockingWindow`). */
const hostWindows = new Set<BrowserWindow>()
let listeners: DockingListeners = {
  changed: () => {},
  reveal: () => {},
  pan: () => {},
  moved: () => {},
  wheel: () => {},
  activate: () => {},
  fullScreen: () => {},
  middleClick: () => {},
  tabDrag: () => {}
}
/**
 * Éléments de l'interface ouverts par-dessus les blocs (panneau d'un widget de la barre, menu,
 * fenêtre de dialogue, centre de notifications), par fenêtre de Tessera (px CSS) : leur forme est
 * découpée dans les cadres, l'application reste affichée (et active) tout autour.
 */
const holesOf = new Map<BrowserWindow, { rects: HostHole[]; names: string }>()

/** Fenêtres de Tessera recouvertes par leur interface (dialogue, mode édition…), et pourquoi. */
const suspendedWindows = new Map<BrowserWindow, { reasons: string; since: number }>()

const hosts = new Map<string, Host>()
/** Bloc ou onglet qui affiche chaque application. */
const activeHosts = new Map<string, string>()
const windows = new Map<string, DockedWindow>()
const states = new Map<string, DesktopAppState>()
/** Applications en cours d'insertion (création du cadre). */
const docking = new Set<string>()
/**
 * Écrans de démarrage (fenêtres sans barre de titre) d'une application en cours de lancement,
 * masqués dès leur apparition : rien ne passe sur le bureau. Remis si rien n'est inséré, ou si
 * la fenêtre principale attend une réponse (voir `waitForWindow`).
 */
const veiled = new Map<string, Set<w.Hwnd>>()
/** Après l'insertion : délai avant de vérifier qu'un écran masqué n'attend pas une réponse. */
const VEIL_CHECK_MS = 3000
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

/** Fenêtre de Tessera du bloc qui affiche l'application (`null` : aucun). */
function hostWindowOf(appId: string): BrowserWindow | null {
  const hostId = activeHosts.get(appId)
  const window = hostId ? hosts.get(hostId)?.window : null
  return window && !window.isDestroyed() ? window : null
}

const isShown = (window: BrowserWindow | null): window is BrowserWindow =>
  !!window && !window.isDestroyed() && window.isVisible() && !window.isMinimized()

/** Facteur px CSS -> px physiques (échelle de l'écran de la fenêtre × zoom de l'interface). */
function scaleOf(window: BrowserWindow | null): number {
  if (!window || window.isDestroyed()) return 1
  const display = screen.getDisplayMatching(window.getBounds())
  return display.scaleFactor * window.webContents.getZoomFactor()
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
  wheelAlways: boolean
  /** Plein écran de l'application : tout l'écran, ou gardé dans le bloc. */
  fullScreen: FullScreenMode
  /** Vidéo en plein écran (clic molette : page / vidéo). */
  stage: boolean
}

/** Pourquoi la fenêtre n'est pas affichée en ce moment (journal), ou `null` si elle doit l'être. */
function hiddenReason(docked: DockedWindow): string | null {
  const hostId = activeHosts.get(docked.appId)
  if (!hostId) return 'aucun bloc ne l’affiche (autre page, navigateur mis de côté…)'
  const rect = hosts.get(hostId)?.rect
  if (!rect) return `bloc ${hostId} hors de la vue`
  const window = hostWindowOf(docked.appId)
  const suspension = window && suspendedWindows.get(window)
  if (suspension) return `interface par-dessus (${suspension.reasons || 'raison inconnue'})`
  if (docked.hiddenByApp) return 'masquée par l’application'
  if (!isShown(window)) return 'Tessera réduit ou caché'
  if (rect.clip && (rect.clip.width <= 0 || rect.clip.height <= 0)) return 'bloc hors de la vue'
  return null
}

/** Où poser le cadre et la fenêtre, ou `null` si le bloc n'est pas visible. */
function layoutFor(docked: DockedWindow): Layout | null {
  const hostId = activeHosts.get(docked.appId)
  const rect = hostId ? hosts.get(hostId)?.rect : null
  const window = hostWindowOf(docked.appId)
  if (!rect || !isShown(window) || suspendedWindows.has(window) || docked.hiddenByApp) return null
  const scale = scaleOf(window)
  const px = (value: number): number => Math.round(value * scale)
  const origin = w.clientOrigin(hwndOf(window))

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
    pageWheel: rect.pageWheel === true,
    wheelAlways: rect.wheelAlways === true,
    fullScreen: rect.fullScreen ?? 'screen',
    stage: rect.stage === true
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
  // Prête à recevoir un onglet tiré : remise dans son cadre au relâchement
  if (docked.tabDrop) return
  const layout = layoutFor(docked)
  if (!layout) {
    note(docked, `masquée : ${hiddenReason(docked) ?? 'raison inconnue'}`)
    return hideFrame(docked)
  }
  note(docked, `affichée dans ${activeHosts.get(docked.appId)}`)
  // Bloc passé dans une autre fenêtre de Tessera : le cadre suit (il reste au-dessus d'elle)
  const owner = hostWindowOf(docked.appId)
  if (owner && owner !== docked.owner) setOwner(docked, owner)

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
  if (style !== childStyle(style, docked.activatable)) {
    logDocking(`${docked.appId} : style rétabli (0x${(style >>> 0).toString(16)})`)
    // Plein écran gardé dans le bloc : l'application quitte son plein écran en remettant sa
    // barre de titre et ses bords
    if (
      docked.fullScreen &&
      layout.fullScreen === 'block' &&
      style & (w.WS.CAPTION | w.WS.THICKFRAME)
    ) {
      docked.fullScreen = false
      logDocking(`${docked.appId} : sort du plein écran (dans le bloc)`)
    }
    w.setStyle(docked.hwnd, childStyle(style, docked.activatable))
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

  const { frame } = layout
  // Fenêtre de Chromium ou de Firefox : agrandie de la place de son bord redimensionnable
  // (bande noire), que le cadre cache. Sa zone utile remplit le bloc.
  const insets = docked.borderBand ? w.clientInsets(docked.hwnd) : null
  // Plein écran gardé dans le bloc : sa bande de bord revient quand l'application en sort
  if (
    docked.fullScreen &&
    layout.fullScreen === 'block' &&
    insets &&
    insets.left + insets.top + insets.right + insets.bottom > 0
  ) {
    docked.fullScreen = false
    logDocking(`${docked.appId} : sort du plein écran (dans le bloc)`)
  }
  const window = insets
    ? {
        x: layout.window.x - insets.left,
        y: layout.window.y - insets.top,
        width: layout.window.width + insets.left + insets.right,
        height: layout.window.height + insets.top + insets.bottom
      }
    : layout.window
  if (docked.pannable !== layout.cropped) {
    docked.pannable = layout.cropped
    setFramePannable(docked.frame, layout.cropped)
  }
  if (docked.pageWheel !== layout.pageWheel || docked.wheelAlways !== layout.wheelAlways) {
    docked.pageWheel = layout.pageWheel
    docked.wheelAlways = layout.wheelAlways
    setFrameWheel(docked.frame, layout.pageWheel, layout.wheelAlways)
  }
  if (docked.stage !== layout.stage) {
    docked.stage = layout.stage
    setFrameMiddle(docked.frame, layout.stage)
  }
  // Cadre masqué sans nous (fenêtre de Tessera réduite puis rendue…) : il sera réaffiché
  if (docked.shown && !w.isVisible(docked.frame) && isShown(owner)) docked.shown = false

  const key = JSON.stringify({ layout, insets })
  const current = w.getWindowRect(docked.hwnd)
  if (docked.shown && key === docked.target && sameRect(docked.placed, current)) {
    applyHoles(docked, layout)
    return
  }

  normalize(docked.hwnd)
  // Demandes postées : une application occupée (ou l'hébergeur qui l'attend) ne bloque pas
  // Tessera. La position visée est retenue, la fenêtre y sera dans un instant.
  const quiet = w.SWP.NOACTIVATE | w.SWP.NOZORDER | w.SWP.NOOWNERZORDER | w.SWP.ASYNCWINDOWPOS
  w.setWindowPos(docked.frame, frame.x, frame.y, frame.width, frame.height, quiet)
  // Plein écran gardé dans le bloc : Chromium refuse toute autre taille que celle de l'écran
  // pendant son plein écran, la demande lui est imposée
  const forced = docked.fullScreen && layout.fullScreen === 'block' ? w.SWP.NOSENDCHANGING : 0
  w.setWindowPos(docked.hwnd, window.x, window.y, window.width, window.height, quiet | forced)
  docked.placed = {
    left: frame.x + window.x,
    top: frame.y + window.y,
    right: frame.x + window.x + window.width,
    bottom: frame.y + window.y + window.height
  }
  docked.target = key
  docked.size = { width: window.width, height: window.height }
  // Interface par-dessus le bloc (panneau, menu…) : découpée dans le cadre
  applyHoles(docked, layout)
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
    // Jamais dans la barre des tâches tant qu'elle est dans un bloc (l'application peut l'y
    // remettre d'elle-même en se réaffichant)
    setTaskbarButton(docked.hwnd, false)
    // Réaffichée : l'application se redessine-t-elle ? (sinon relancée)
    setTimeout(() => checkPainted(docked), PAINT_CHECK_MS)
  }
  if (!(w.getStyle(docked.hwnd) & w.WS.VISIBLE)) w.showWindowAsync(docked.hwnd, w.SW.SHOWNA)
  docked.hiddenByUs = false
}

function placeAll(): void {
  for (const docked of windows.values()) place(docked)
}

/** Découpe dans le cadre les éléments de l'interface qui passent par-dessus son bloc. */
function applyHoles(docked: DockedWindow, layout: Layout): void {
  const window = hostWindowOf(docked.appId)
  const overlay = window ? holesOf.get(window) : undefined
  const { frame } = layout
  let holes: w.RegionHole[] = []
  if (window && overlay && overlay.rects.length > 0) {
    const scale = scaleOf(window)
    const origin = w.clientOrigin(hwndOf(window))
    holes = overlay.rects
      .map((rect) => ({
        x: Math.round(origin.x + rect.x * scale - frame.x),
        y: Math.round(origin.y + rect.y * scale - frame.y),
        width: Math.round(rect.width * scale),
        height: Math.round(rect.height * scale),
        radius: rect.radius * scale
      }))
      .filter(
        (hole) =>
          hole.x < frame.width &&
          hole.y < frame.height &&
          hole.x + hole.width > 0 &&
          hole.y + hole.height > 0
      )
  }
  const key = holes.length ? JSON.stringify([frame.width, frame.height, holes]) : ''
  if (key === docked.holes) return
  docked.holes = key
  w.setWindowHoles(docked.frame, frame.width, frame.height, holes)
  if (holes.length) note(docked, `découpée sous l'interface (${overlay?.names || '?'})`)
}

/**
 * Éléments de l'interface ouverts par-dessus les blocs de cette fenêtre (px CSS, `names` pour le
 * journal) : découpés dans les cadres des applications.
 */
export function setHoles(window: BrowserWindow, rects: HostHole[], names: string): void {
  if (rects.length) holesOf.set(window, { rects, names })
  else holesOf.delete(window)
  for (const docked of windows.values()) {
    const layout = docked.shown ? layoutFor(docked) : null
    if (layout) applyHoles(docked, layout)
  }
}

/** Le cadre appartient désormais à cette fenêtre de Tessera (tout de suite, puis l'hébergeur). */
function setOwner(docked: DockedWindow, owner: BrowserWindow): void {
  docked.owner = owner
  if (w.isWindow(docked.frame)) w.setOwner(docked.frame, hwndOf(owner))
  setFrameOwner(docked.frame, hwndOf(owner))
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
      // Rendue au bureau : son bouton revient dans la barre des tâches
      if (mode === 'restore' && !docked.hiddenByApp) setTaskbarButton(docked.hwnd, true)
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
    const owner = hostWindowOf(appId) ?? getMainWindow()
    if (!owner) {
      returnWindow(hwnd, saved, true)
      return
    }
    const scale = scaleOf(owner)
    saveMinSize(appId, Math.round(min.width / scale), Math.round(min.height / scale))

    const frame = await createFrame(hwndOf(owner), { x: 0, y: 0, width: 1, height: 1 })
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
    const activatable = isChromium(hwnd)
    w.setStyle(hwnd, childStyle(saved.style, activatable))
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
      owner,
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
      wheelAlways: false,
      stage: false,
      fullScreen: false,
      tabDrop: null,
      fixedSize,
      activatable,
      borderBand: activatable || w.getClassName(hwnd) === 'MozillaWindowClass',
      logged: '',
      problem: '',
      blank: null,
      holes: '',
      unwatch: () => {}
    }
    docked.unwatch = w.watchProcessWindows(pid, (event, target) => {
      if (target === hwnd) onWindowEvent(docked, event)
      else if (activatable) keepPopupInBlock(docked, target, event)
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
    case w.WinEvent.OBJECT_DESTROY: {
      logDocking(`${docked.appId} : fenêtre détruite par l'application`)
      forget(docked)
      // Programme toujours ouvert : il remplace peut-être sa fenêtre par une autre (Chrome :
      // choix du compte, puis la fenêtre du navigateur), insérée dès qu'elle s'affiche
      const desktopApp = findApp(docked.appId)
      const alive = (): boolean => processAlive(docked.pid)
      if (desktopApp && activeHosts.has(docked.appId) && alive()) {
        setState(docked.appId, { status: 'starting', error: null })
        void waitForWindow(desktopApp, REPLACE_TIMEOUT_MS, alive).then((found) => {
          if (found) return logDocking(`${docked.appId} : fenêtre remplacée, insérée à sa place`)
          if (!windows.has(docked.appId)) setState(docked.appId, { status: 'closed' })
        })
        return
      }
      setState(docked.appId, { status: 'closed' })
      return
    }

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
      if (followFullScreen(docked)) return
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

/** Sortie du plein écran d'une application : délai laissé au bloc pour envoyer sa place. */
const STAGE_EXIT_MS = 600

/** Premier cran de molette relayé pendant le plein écran d'une application : déjà noté. */
let wheelLogged = false

/** Taille de l'écran de la fenêtre de Tessera du bloc (px physiques). */
function monitorSize(docked: DockedWindow): { width: number; height: number } | null {
  const window = hostWindowOf(docked.appId) ?? docked.owner
  if (window.isDestroyed()) return null
  const display = screen.getDisplayMatching(window.getBounds())
  return {
    width: Math.round(display.bounds.width * display.scaleFactor),
    height: Math.round(display.bounds.height * display.scaleFactor)
  }
}

/**
 * L'application a changé la taille de sa fenêtre : elle passe en plein écran (taille de l'écran,
 * vidéo dans un navigateur…) ou en sort (une autre taille, pendant son plein écran). L'interface
 * est prévenue et la fenêtre n'est pas remise dans son bloc : elle devient la vidéo plein écran
 * (ou retrouve son bloc quand l'interface le demande). `true` : rien d'autre à faire.
 */
function followFullScreen(docked: DockedWindow): boolean {
  if (docked.fixedSize) return false
  const monitor = monitorSize(docked)
  if (!monitor) return false
  const rect = w.getWindowRect(docked.hwnd)
  const full =
    Math.abs(rect.right - rect.left - monitor.width) <= 2 &&
    Math.abs(rect.bottom - rect.top - monitor.height) <= 2
  // Réglage du bloc « Dans le bloc » : la fenêtre est remise dans son bloc comme pour tout autre
  // changement de taille (elle le remplit, sans ses barres d'outils)
  const hostId = activeHosts.get(docked.appId)
  const inBlock = (hostId && hosts.get(hostId)?.rect?.fullScreen) === 'block'
  // Gardée dans le bloc : Tessera lui impose la taille du bloc, ce n'est pas une sortie du plein
  // écran (la sortie se voit à son style, voir `place`). Sans cela, la taille du bloc n'était
  // plus imposée et la fenêtre reprenait celle de l'écran dès que le bloc perdait le focus.
  if (inBlock && docked.fullScreen && !full) return false
  if (full === docked.fullScreen) return docked.fullScreen && !inBlock
  docked.fullScreen = full
  const wheelMode = full && !inBlock ? `, molette : ${getSettings().window.videoWheel}` : ''
  logDocking(
    `${docked.appId} : ${full ? 'passe en plein écran' : 'sort du plein écran'}${inBlock ? ' (dans le bloc)' : wheelMode}`
  )
  wheelLogged = false
  docked.target = null
  if (inBlock) return false
  const window = hostWindowOf(docked.appId)
  if (window) listeners.fullScreen(window, docked.appId, full)
  if (full) return true
  // Sortie pendant la vidéo plein écran de Tessera : le bloc envoie sa place dans un instant.
  // Replacée tout de suite à celle de la vidéo (tout l'écran), la fenêtre redevenue normale
  // semblait encore en plein écran.
  if (layoutFor(docked)?.stage) {
    setTimeout(() => {
      docked.target = null
      place(docked)
    }, STAGE_EXIT_MS)
    return true
  }
  place(docked)
  return false
}

/**
 * Petite fenêtre de Chromium appartenant à la fenêtre insérée (bulle « Restaurer les pages ? »,
 * autorisation, menu…) : Chromium la place d'après l'écran, elle peut déborder du bloc. Elle est
 * décalée pour y tenir (coin haut gauche du bloc si elle est plus grande que lui).
 */
function keepPopupInBlock(docked: DockedWindow, popup: w.Hwnd, event: number): void {
  if (event !== w.WinEvent.OBJECT_SHOW && event !== w.WinEvent.OBJECT_LOCATIONCHANGE) return
  if (!docked.shown || w.getOwner(popup) !== docked.hwnd || !w.isVisible(popup)) return
  if (!isChromium(popup)) return
  const block = w.getWindowRect(docked.frame)
  const rect = w.getWindowRect(popup)
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  const x = Math.max(block.left, Math.min(rect.left, block.right - width))
  const y = Math.max(block.top, Math.min(rect.top, block.bottom - height))
  if (x === rect.left && y === rect.top) return
  const quiet = w.SWP.NOACTIVATE | w.SWP.NOZORDER | w.SWP.NOOWNERZORDER | w.SWP.ASYNCWINDOWPOS
  w.setWindowPos(popup, x, y, 0, 0, quiet | w.SWP.NOSIZE)
}

// ---------------------------------------------------------------------------
// Onglets tirés vers un bloc
// ---------------------------------------------------------------------------

/**
 * Onglet tiré hors d'une fenêtre de navigateur (Chromium : la fenêtre qui le porte est déplacée
 * par l'utilisateur). Chromium ne cherche où le déposer que parmi ses fenêtres de premier niveau,
 * et la fenêtre d'un bloc est l'enfant de son cadre : le temps du glisser, elle redevient une
 * fenêtre de premier niveau, à la même place, juste sous la fenêtre tirée et réduite à la partie
 * visible de son bloc. Elle retrouve son cadre quand le bouton est relâché.
 */
interface TabDrag {
  pid: number
  /**
   * Application de ce navigateur, déjà insérée : un bloc Navigateur sous la souris peut passer
   * sur lui.
   */
  appId: string | null
  timer: ReturnType<typeof setInterval>
  startedAt: number
  /** Dernière position envoyée à l'interface. */
  sent: string
}
let tabDrag: TabDrag | null = null
/** Suivi de la souris pendant le glisser (px CSS envoyés à l'interface). */
const TAB_DRAG_POLL_MS = 50
/** Glisser jamais terminé (bouton relâché sans que Windows le signale…) : abandonné. */
const TAB_DRAG_MAX_MS = 120_000
/** Après le relâchement : le navigateur finit de déposer l'onglet avant que la fenêtre reparte. */
const TAB_DROP_SETTLE_MS = 150

function onMoveSize(event: number, hwnd: w.Hwnd): void {
  if (event !== w.WinEvent.SYSTEM_MOVESIZESTART || tabDrag || hostWindows.size === 0) return
  // Fenêtre principale d'un navigateur Chromium (ni insérée, ni bulle appartenant à une fenêtre)
  if (!isChromium(hwnd) || w.getOwner(hwnd) || w.getStyle(hwnd) & w.WS.CHILD) return
  const pid = w.getProcessId(hwnd)
  const exe = basename(w.getProcessPath(pid)).toLowerCase()
  const app = getSettings().apps.items.find(
    (item): item is DesktopApp => isDesktopApp(item) && item.processName.toLowerCase() === exe
  )
  const docked = [...windows.values()].some((candidate) => candidate.pid === pid)
  if (!docked) return
  tabDrag = {
    pid,
    // Seulement s'il est déjà dans Tessera (affiché ou mis de côté dans un bloc) : le lancer
    // pourrait insérer la fenêtre même que l'utilisateur est en train de tirer
    appId: app && windows.has(app.id) ? app.id : null,
    timer: setInterval(followTabDrag, TAB_DRAG_POLL_MS),
    startedAt: Date.now(),
    sent: ''
  }
  logDocking(`fenêtre de ${exe} tirée (onglet ?)`)
  followTabDrag()
}

function followTabDrag(): void {
  const drag = tabDrag
  if (!drag) return
  if (!w.isLeftButtonDown() || Date.now() - drag.startedAt > TAB_DRAG_MAX_MS) {
    clearInterval(drag.timer)
    tabDrag = null
    for (const window of hostWindows) listeners.tabDrag(window, null)
    setTimeout(() => {
      for (const docked of windows.values()) if (docked.tabDrop) closeToTab(docked)
    }, TAB_DROP_SETTLE_MS)
    return
  }
  const point = screen.getCursorScreenPoint()
  const isInside = (window: BrowserWindow | null): boolean => {
    if (!isShown(window)) return false
    const content = window.getContentBounds()
    return (
      point.x >= content.x &&
      point.y >= content.y &&
      point.x < content.x + content.width &&
      point.y < content.y + content.height
    )
  }
  // Souris au-dessus de la fenêtre de Tessera d'un bloc : les fenêtres de ce navigateur affichées
  // dans un bloc (celle d'un bloc qui vient de passer sur lui aussi) sont prêtes à recevoir
  // l'onglet. Ailleurs, elles restent dans leur cadre. Chromium remet parfois toute sa fenêtre (à
  // chaque changement de taille ou de style) : la partie qui reçoit la souris est rétablie.
  for (const docked of windows.values()) {
    if (docked.pid !== drag.pid) continue
    if (!isInside(hostWindowOf(docked.appId))) {
      if (docked.tabDrop) closeToTab(docked)
    } else if (docked.tabDrop) keepTabDropRegion(docked)
    else if (docked.shown && !docked.fullScreen) openToTab(docked)
  }
  if (!drag.appId) return
  // Souris dans chaque fenêtre de Tessera (px CSS, `null` ailleurs) : un bloc Navigateur dessous
  // passe sur ce navigateur
  const appId = drag.appId
  const next = [...hostWindows].map((window) => {
    const inside = isInside(window)
    const content = window.getContentBounds()
    const zoom = window.webContents.getZoomFactor()
    const position: DesktopAppTabDrag = {
      appId,
      x: inside ? Math.round((point.x - content.x) / zoom) : null,
      y: inside ? Math.round((point.y - content.y) / zoom) : null
    }
    return { window, position }
  })
  const key = JSON.stringify(next.map(({ position }) => position))
  if (key === drag.sent) return
  drag.sent = key
  for (const { window, position } of next) listeners.tabDrag(window, position)
}

/**
 * La fenêtre du bloc devient une fenêtre de premier niveau, là où elle est, à la place de son
 * cadre dans l'ordre d'affichage (une fenêtre posée sur Tessera reste devant elle).
 */
function openToTab(docked: DockedWindow): void {
  if (!w.isWindow(docked.hwnd) || !w.isVisible(docked.frame)) return
  const rect = w.getWindowRect(docked.hwnd)
  const frame = w.getWindowRect(docked.frame)
  // Seule la partie visible du bloc reçoit la souris (ni la bande du bord, ni ce qui dépasse d'un
  // bloc rogné). Windows ne rogne pas l'image d'une fenêtre Chromium (DirectComposition) : la
  // bande du bord se voit le temps du glisser.
  docked.tabDrop = {
    left: frame.left - rect.left,
    top: frame.top - rect.top,
    right: frame.right - rect.left,
    bottom: frame.bottom - rect.top
  }
  w.setParent(docked.hwnd, 0)
  w.setStyle(docked.hwnd, (w.getStyle(docked.hwnd) & ~w.WS.CHILD) | w.WS.POPUP)
  // Au-dessus de la fenêtre de Tessera du bloc, sans bouton dans la barre des tâches
  w.setOwner(docked.hwnd, hwndOf(docked.owner))
  w.setWindowPos(
    docked.hwnd,
    rect.left,
    rect.top,
    rect.right - rect.left,
    rect.bottom - rect.top,
    w.SWP.NOACTIVATE | w.SWP.FRAMECHANGED,
    w.windowAbove(docked.frame) || w.HWND_TOP
  )
  w.setWindowRegion(docked.hwnd, docked.tabDrop)
  logDocking(`${docked.appId} : prête à recevoir un onglet`)
}

function keepTabDropRegion(docked: DockedWindow): void {
  const expected = docked.tabDrop
  const region = w.getWindowRegion(docked.hwnd)
  if (expected && (!region || !sameRect(region, expected))) {
    w.setWindowRegion(docked.hwnd, expected)
  }
}

/** Glisser terminé : la fenêtre retrouve son cadre et son bloc. */
function closeToTab(docked: DockedWindow): void {
  docked.tabDrop = null
  if (w.isWindow(docked.hwnd)) {
    w.setWindowRegion(docked.hwnd, null)
    w.setStyle(docked.hwnd, childStyle(w.getStyle(docked.hwnd), docked.activatable))
    w.setParent(docked.hwnd, docked.frame)
    w.setWindowPos(
      docked.hwnd,
      0,
      0,
      0,
      0,
      w.SWP.NOMOVE | w.SWP.NOSIZE | w.SWP.NOZORDER | w.SWP.FRAMECHANGED | w.SWP.NOACTIVATE
    )
    logDocking(`${docked.appId} : remise dans son cadre après le glisser`)
  }
  docked.target = null
  place(docked)
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
  const hidden = veiled.get(desktopApp.id)
  let candidates = usable(w.findTopWindows(desktopApp.processName, undefined, hidden))
  // Rien sous ce nom : un lanceur (swriter.exe) peut ouvrir la fenêtre d'un autre programme de
  // son dossier (soffice.bin). Jamais pour un dossier de Windows (System32…), partagé.
  const folder = dirname(desktopApp.path).toLowerCase()
  const windowsFolder = (process.env.SystemRoot ?? 'C:\\Windows').toLowerCase()
  if (candidates.length === 0 && !folder.startsWith(windowsFolder)) {
    candidates = usable(w.findTopWindows(desktopApp.processName, folder, hidden))
  }
  // Un écran de démarrage (sans barre de titre ni bord : GIMP…) n'est pris que s'il n'y a rien
  // d'autre et que l'application a eu le temps de s'ouvrir (`allowUnframed`)
  return (
    candidates.find((candidate) => candidate.framed) ?? (allowUnframed ? candidates[0] : undefined)
  )
}

/** Le processus existe encore. */
function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Attend la fenêtre principale de l'application et l'insère. Chaque fenêtre affichée par le
 * programme déclenche la recherche (en plus d'une vérification régulière) : la fenêtre est
 * masquée et insérée aussitôt, sans rester visible sur le bureau. Seul un écran de démarrage
 * possible (fenêtre sans barre de titre) laisse un instant pour se fermer.
 * Renvoie `true` si la fenêtre est insérée (ou en cours d'insertion).
 */
async function waitForWindow(
  desktopApp: DesktopApp,
  timeoutMs: number,
  keepWaiting: () => boolean = () => true
): Promise<boolean> {
  const appId = desktopApp.id
  const name = `\\${desktopApp.processName.toLowerCase()}`
  const folder = `${dirname(desktopApp.path).toLowerCase()}\\`
  // Jamais les fenêtres d'un dossier de Windows (Explorateur…), partagé avec d'autres programmes
  const windowsFolder = `${(process.env.SystemRoot ?? 'C:\\Windows').toLowerCase()}\\`
  const ownFolder = !folder.startsWith(windowsFolder)
  const hidden = new Set<w.Hwnd>()
  veiled.set(appId, hidden)
  let wake: (() => void) | null = null
  const unwatch = w.watchShownWindows((hwnd) => {
    const path = w.getProcessPath(w.getProcessId(hwnd)).toLowerCase()
    if (!path.endsWith(name) && !(ownFolder && path.startsWith(folder))) return
    // Fenêtre de l'application (écran de démarrage, fenêtre principale) : masquée tout de suite,
    // elle ne passe pas sur le bureau avant d'être insérée
    if (!windows.has(appId) && w.isTopLevelWindow(hwnd) && !hidden.has(hwnd)) {
      // Demande postée : une application occupée ne bloque pas Tessera
      w.showWindowAsync(hwnd, w.SW.HIDE)
      hidden.add(hwnd)
      logDocking(
        `${appId} : ${w.isUnframedTopLevel(hwnd) ? 'écran de démarrage' : 'fenêtre'} masqué(e) pendant le lancement`
      )
    }
    wake?.()
  })
  const start = Date.now()
  try {
    while (Date.now() - start < timeoutMs && keepWaiting()) {
      const current = windows.get(appId)
      // Déjà insérée (une application masquée, comme Discord, se réaffiche : OBJECT_SHOW)
      if ((current && !current.hiddenByApp) || docking.has(appId)) return true
      const allowUnframed = Date.now() - start > UNFRAMED_AFTER_MS
      const found = current ? undefined : findMainWindow(desktopApp, allowUnframed)
      if (found) {
        if (!found.framed) await sleep(800)
        if (connect(desktopApp, allowUnframed)) return true
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 400)
        wake = () => {
          clearTimeout(timer)
          resolve()
        }
      })
      wake = null
    }
    return windows.has(appId) || docking.has(appId)
  } finally {
    unwatch()
    releaseVeiled(appId, hidden)
  }
}

/**
 * Fin du lancement : rien d'inséré, les écrans masqués reviennent sur le bureau ; inséré, ils
 * restent masqués (un écran de démarrage se ferme de lui-même), sauf si la fenêtre insérée est
 * désactivée un instant plus tard (elle attend la réponse à l'un d'eux).
 */
function releaseVeiled(appId: string, hidden: Set<w.Hwnd>): void {
  const show = (reason: string): void => {
    const alive = [...hidden].filter(
      (hwnd) => w.isWindow(hwnd) && windows.get(appId)?.hwnd !== hwnd
    )
    for (const hwnd of alive) w.showWindow(hwnd, w.SW.SHOWNA)
    if (alive.length > 0)
      logDocking(`${appId} : ${alive.length} fenêtre(s) masquée(s) remise(s) (${reason})`)
  }
  if (veiled.get(appId) === hidden) veiled.delete(appId)
  if (hidden.size === 0) return
  if (!windows.has(appId) && !docking.has(appId)) return show('rien n’a été inséré')
  setTimeout(() => {
    const docked = windows.get(appId)
    if (docked && w.isWindow(docked.hwnd) && !w.isEnabled(docked.hwnd)) {
      show('la fenêtre insérée attend une réponse')
    }
  }, VEIL_CHECK_MS)
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

  // Désinstallée, ou réinstallée ailleurs : rien n'est lancé (l'Explorateur s'ouvrirait sur
  // Documents pour une application du Store disparue)
  if (!launchTargetExists(desktopApp)) {
    logDocking(`${appId} : programme introuvable (${desktopApp.path} ${desktopApp.args})`)
    setState(appId, { status: 'error', error: 'not-installed' })
    return
  }
  setState(appId, { status: 'starting', error: null })
  // Lancé comme un double-clic : l'application n'hérite d'aucune ressource de Tessera
  if (!w.shellExecute(desktopApp.path, desktopApp.args, dirname(desktopApp.path))) {
    setState(appId, { status: 'error', error: 'launch' })
    return
  }

  if (!(await waitForWindow(desktopApp, LAUNCH_TIMEOUT_MS))) {
    setState(appId, { status: 'error', error: 'timeout' })
  }
}

// ---------------------------------------------------------------------------
// Blocs et onglets (appels de l'interface)
// ---------------------------------------------------------------------------

/** Un bloc ou un onglet affiche l'application (elle s'ouvre si besoin). */
export function attachHost(
  window: BrowserWindow,
  hostId: string,
  appId: string,
  rect: HostRect | null
): void {
  const desktopApp = findApp(appId)
  if (!desktopApp || !hostWindows.has(window)) return
  const previous = activeHosts.get(appId)
  if (previous !== hostId) {
    logDocking(
      `${appId} : bloc ${hostId} l’affiche${previous ? ` (à la place de ${previous})` : ''}`
    )
  }
  hosts.set(hostId, { appId, rect, window })
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
  forgetHost(hostId)
  const docked = windows.get(host.appId)
  if (docked) place(docked)
}

/** Oublie un bloc ; un autre bloc qui affiche la même application prend le relais. */
function forgetHost(hostId: string): void {
  const host = hosts.get(hostId)
  if (!host) return
  hosts.delete(hostId)
  if (activeHosts.get(host.appId) !== hostId) return
  const other = [...hosts.entries()].find(([, candidate]) => candidate.appId === host.appId)
  if (other) activeHosts.set(host.appId, other[0])
  else activeHosts.delete(host.appId)
  setState(host.appId, {})
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

/**
 * Échap dans Tessera pendant le plein écran d'une application (navigateur…) : elle passe au
 * premier plan, avec le clavier. Le prochain Échap lui arrive et elle quitte son plein écran
 * elle-même (une touche simulée n'est pas fiable, et Tessera n'en envoie pas).
 */
export function focusApp(appId: string): void {
  const docked = windows.get(appId)
  if (!docked || !w.isWindow(docked.hwnd)) return
  w.bringToFront(docked.hwnd)
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
  nudge(docked)
}

/* ---------- Fenêtre qui ne se dessine plus (grise) ---------- */

/** Délai entre un réaffichage et la vérification de ce qui est à l'écran. */
const PAINT_CHECK_MS = 700
/** Points relevés sur la fenêtre. */
const PAINT_COLUMNS = 12
const PAINT_ROWS = 8
/** Écart de couleur toléré entre deux points « de la même couleur ». */
const PAINT_TOLERANCE = 6

const sameColor = (a: number, b: number): boolean =>
  Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)) <= PAINT_TOLERANCE &&
  Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) <= PAINT_TOLERANCE &&
  Math.abs((a & 255) - (b & 255)) <= PAINT_TOLERANCE

/**
 * Une application Chromium (navigateur, Discord) peut cesser de se dessiner après un
 * masquage, un changement de focus ou un nouvel onglet : sa fenêtre est en place mais grise.
 * Quelques points de l'écran sont relevés sur elle (seulement si c'est bien elle qui est
 * dessous) ; tous de la même couleur, elle est relancée comme par « Rafraîchir », une seule fois
 * pour cette couleur (une page unie voulue n'est pas relancée en boucle).
 */
function checkPainted(docked: DockedWindow): void {
  if (windows.get(docked.appId) !== docked || !docked.shown || docked.tabDrop) return
  if (docked.fullScreen || !w.isWindow(docked.hwnd) || !w.isVisible(docked.frame)) return
  const frame = w.getWindowRect(docked.frame)
  const inset = 6
  const rect = {
    left: frame.left + inset,
    top: frame.top + inset,
    right: frame.right - inset,
    bottom: frame.bottom - inset
  }
  if (rect.right - rect.left < 40 || rect.bottom - rect.top < 40) return
  // Rien par-dessus (menu de l'application, autre fenêtre) : le centre et les quatre coins
  const points = [
    [(rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2],
    [rect.left, rect.top],
    [rect.right - 1, rect.top],
    [rect.left, rect.bottom - 1],
    [rect.right - 1, rect.bottom - 1]
  ]
  if (!points.every(([x, y]) => w.rootWindowAt(x, y) === docked.frame)) return
  const colors = w.sampleScreen(rect, PAINT_COLUMNS, PAINT_ROWS)
  if (!colors) return
  if (!colors.every((color) => sameColor(color, colors[0]))) {
    docked.blank = null
    return
  }
  if (docked.blank !== null && sameColor(docked.blank, colors[0])) return
  docked.blank = colors[0]
  logDocking(
    `${docked.appId} : fenêtre unie à l'écran (#${colors[0].toString(16).padStart(6, '0')}), redessinée`
  )
  nudge(docked)
}

/**
 * Force l'application à se redessiner sans la masquer : sa taille change d'un pixel le temps
 * d'un instant, puis la fenêtre et son cadre sont redessinés.
 */
function nudge(docked: DockedWindow): void {
  if (!docked.shown || !w.isWindow(docked.hwnd)) return
  const quiet = w.SWP.NOACTIVATE | w.SWP.NOZORDER | w.SWP.NOOWNERZORDER | w.SWP.ASYNCWINDOWPOS
  const { width, height } = docked.size
  w.setWindowPos(docked.hwnd, 0, 0, width - 1, height, quiet | w.SWP.NOMOVE)
  setTimeout(() => {
    if (windows.get(docked.appId) !== docked || !w.isWindow(docked.hwnd)) return
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
export function setSuspended(window: BrowserWindow, value: boolean, reasons = ''): void {
  if (suspendedWindows.has(window) === value) return
  if (value) suspendedWindows.set(window, { reasons, since: Date.now() })
  else suspendedWindows.delete(window)
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
  const long = [...suspendedWindows.values()].find(
    (suspension) => Date.now() - suspension.since > LONG_SUSPENSION_MS
  )
  if (long && !longSuspensionLogged) {
    longSuspensionLogged = true
    logDocking(`fenêtres masquées depuis plus d'une minute (${long.reasons || '?'})`)
  }
  if (suspendedWindows.size === 0) longSuspensionLogged = false
  for (const docked of [...windows.values()]) watch(docked)
}

/** Compare l'état réel de la fenêtre à l'état attendu ; un écart est noté et réparé. */
function watch(docked: DockedWindow): void {
  if (!w.isWindow(docked.hwnd) || !w.isWindow(docked.frame)) return place(docked)
  if (docked.tabDrop) return
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
  if (!repair) {
    if (layout) checkPainted(docked)
    return
  }
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
  for (const docked of windows.values()) {
    if (!docked.shown) continue
    const scale = scaleOf(docked.owner)
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

/** Branche le gestionnaire (une fois) ; chaque fenêtre s'y ajoute par `attachDockingWindow`. */
export function initDocking(next: DockingListeners): void {
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

  // Bloc (et sa fenêtre de Tessera) qui affiche la fenêtre insérée dans ce cadre
  const hostOfFrame = (frame: number): { hostId: string; window: BrowserWindow } | null => {
    const docked = [...windows.values()].find((candidate) => candidate.frame === frame)
    const hostId = docked && activeHosts.get(docked.appId)
    const window = hostId ? hosts.get(hostId)?.window : null
    return hostId && window && !window.isDestroyed() ? { hostId, window } : null
  }

  // Clic gauche + droit sur une fenêtre rognée : transmis à son bloc (px CSS)
  setFramePanListener(({ pan, frame, dx, dy }) => {
    const host = hostOfFrame(frame)
    if (!host) return
    const scale = scaleOf(host.window)
    listeners.pan(host.window, { hostId: host.hostId, phase: pan, dx: dx / scale, dy: dy / scale })
  })

  // Molette au-dessus de la fenêtre d'un bloc, clic dans son application : transmis au bloc
  setFrameWheelListeners({
    // Un cran de molette (120) : 100 px, comme dans une page web
    wheel: ({ wheel, delta }) => {
      const host = hostOfFrame(wheel)
      if (!host) return
      // Vidéo plein écran : le premier cran relayé est noté (diagnostic de la molette)
      const docked = [...windows.values()].find((candidate) => candidate.frame === wheel)
      if (docked?.fullScreen && !wheelLogged) {
        wheelLogged = true
        logDocking(`${docked.appId} : molette relayée à Tessera (vidéo plein écran)`)
      }
      listeners.wheel(host.window, host.hostId, (-delta / 120) * 100)
    },
    active: ({ active }) => {
      const host = active ? hostOfFrame(active) : null
      listeners.activate(host?.window ?? null, host?.hostId ?? null)
      // Clic dans l'application : sa fenêtre est revérifiée (style, place)
      const docked = [...windows.values()].find((candidate) => candidate.frame === active)
      if (docked) place(docked)
    }
  })

  setFrameMiddleListener(() => listeners.middleClick())

  // Onglet tiré hors d'une fenêtre de navigateur : il peut être déposé dans un bloc
  w.watchMoveSize(onMoveSize)
  screen.on('display-metrics-changed', placeAll)
}

/** Branche une fenêtre de Tessera : ses blocs peuvent afficher des applications. */
export function attachDockingWindow(window: BrowserWindow): void {
  hostWindows.add(window)

  // Suit la fenêtre (les événements « move » arrivent pendant le déplacement). Une fenêtre
  // étirée reprend alors la taille de son bloc.
  window.on('move', () => {
    listeners.moved(window)
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

  // Interface rechargée : ses blocs vont se réenregistrer. Seulement la page elle-même :
  // `did-start-loading` arrive aussi quand un cadre interne charge (corps d'un mail, module…),
  // et toutes les fenêtres perdaient alors leur bloc (blocs gris).
  window.webContents.on('did-start-navigation', (details) => {
    if (!details.isMainFrame || details.isSameDocument) return
    logDocking('interface rechargée : les blocs vont se réenregistrer')
    forgetHostsOf(window)
    placeAll()
  })

  // Fermeture : Windows détruit les fenêtres dont elle est propriétaire. Les cadres de ses blocs
  // passent tout de suite à une autre fenêtre de Tessera (ses pages y vont aussi), sans quoi les
  // applications qu'ils contiennent disparaîtraient avec eux.
  window.on('close', () => {
    const other = [...hostWindows].find(
      (candidate) => candidate !== window && !candidate.isDestroyed()
    )
    if (!other) return
    for (const docked of windows.values()) if (docked.owner === window) setOwner(docked, other)
  })
  window.on('closed', () => {
    hostWindows.delete(window)
    suspendedWindows.delete(window)
    holesOf.delete(window)
    forgetHostsOf(window)
    placeAll()
  })
}

/** Oublie les blocs d'une fenêtre (rechargée ou fermée). */
function forgetHostsOf(window: BrowserWindow): void {
  for (const [hostId, host] of [...hosts]) if (host.window === window) forgetHost(hostId)
}
