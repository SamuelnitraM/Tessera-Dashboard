import { create } from 'zustand'
import { usePageScreensStore } from './pageScreens'
import { useSettingsStore } from './settings'

/**
 * Vidéo en plein écran (lecteur YouTube, Twitch ou vidéo locale, navigateur inséré dans un bloc).
 *
 * Tessera passe en plein écran avec elle. La molette (réglage « Page », `window.videoWheel`) fait
 * glisser la vidéo vers le haut : la page de Tessera remonte dessous, comme si la vidéo était
 * posée au-dessus de la page ; la molette continue ensuite dans la page. En remontant tout en
 * haut, la vidéo est de nouveau en plein écran. Réglage « Vidéo » : la molette au-dessus de la
 * vidéo va à la vidéo (YouTube s'en sert en plein écran).
 *
 * Un lecteur (page web) en vrai plein écran passe devant toute l'interface et ne peut pas
 * glisser : il quitte son plein écran le temps que la vidéo n'est pas tout en haut, puis le
 * reprend.
 */

export type StageSource = { kind: 'player'; sessionId: string } | { kind: 'app'; appId: string }

/** Ce que la vidéo plein écran d'un lecteur sait faire (sa page web). */
export interface StagePlayer {
  /** La page quitte son vrai plein écran (la vidéo va glisser). */
  exitReal: () => void
  /** La page reprend son vrai plein écran (la vidéo est revenue tout en haut). */
  enterReal: () => void
  /** Tessera arrête le plein écran (Échap dans Tessera) : la vidéo le quitte aussi. */
  exit: () => void
  /**
   * Échap dans Tessera, si la vidéo ne peut pas quitter son plein écran sur demande (navigateur
   * inséré) : elle remonte tout en haut et reçoit le clavier, le prochain Échap est le sien.
   */
  focus?: () => void
}

interface VideoStageState {
  source: StageSource | null
  /** Hauteur (px CSS) dont la vidéo a glissé vers le haut : 0, plein écran ; l'écran, la page. */
  offset: number
}

export const useVideoStageStore = create<VideoStageState>(() => ({ source: null, offset: 0 }))

let player: StagePlayer | null = null
/** Décalage visé : le décalage affiché le rejoint en quelques images (glissement fluide). */
let target = 0
let frame = 0
/** La page du lecteur a quitté son vrai plein écran (à reprendre en haut). */
let leftReal = false
/** Bloc de la vidéo, et position de la page avant le plein écran (rendue à la fin). */
let stagedBlock: string | null = null
let pageTopBefore: number | null = null
let stopFollowingGrid: (() => void) | null = null

/**
 * Haut de la page sous la vidéo : un bloc qui occupe un écran entier n'y est pas montré, la page
 * commence à l'écran suivant. Sinon le haut de la page.
 */
function pageFloor(): number {
  const { rowStep, screenBlocks } = usePageScreensStore.getState()
  const end = stagedBlock ? screenBlocks[stagedBlock] : undefined
  return end && rowStep ? end * rowStep : 0
}

const sameSource = (a: StageSource | null, b: StageSource | null): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export const isStaged = (source: StageSource): boolean =>
  sameSource(useVideoStageStore.getState().source, source)

/** La molette au-dessus de la vidéo va à Tessera (réglage « Page »). */
export const useStageWheelToPage = (): boolean =>
  useSettingsStore((state) => state.settings.window.videoWheel === 'page')

/**
 * Décalage de la page sous la vidéo (variable CSS `--stage-shift`, voir App.module.css), et
 * signal de défilement : les fenêtres des applications et les lecteurs se replacent.
 */
function apply(offset: number): void {
  const root = document.documentElement
  if (useVideoStageStore.getState().source) {
    root.dataset.videoStage = ''
    root.style.setProperty('--stage-shift', `${Math.round(window.innerHeight - offset)}px`)
  } else {
    delete root.dataset.videoStage
    root.style.removeProperty('--stage-shift')
  }
  window.dispatchEvent(new Event('scroll'))
}

function animate(): void {
  const { offset } = useVideoStageStore.getState()
  const next = Math.abs(target - offset) < 1 ? target : offset + (target - offset) * 0.35
  useVideoStageStore.setState({ offset: next })
  apply(next)
  if (next !== target) {
    frame = requestAnimationFrame(animate)
    return
  }
  frame = 0
  // Revenue tout en haut : la page du lecteur reprend son vrai plein écran
  if (next === 0 && leftReal) {
    leftReal = false
    player?.enterReal()
  }
}

function slideTo(value: number): void {
  const next = Math.min(Math.max(0, value), window.innerHeight)
  // La vidéo commence à glisser : la page du lecteur quitte son vrai plein écran
  if (next > 0 && target === 0 && player && !leftReal) {
    leftReal = true
    player.exitReal()
  }
  target = next
  if (!frame) frame = requestAnimationFrame(animate)
}

/** Taille de la fenêtre changée (passage en plein écran) : la page reste sous la vidéo. */
const onResize = (): void => apply(useVideoStageStore.getState().offset)
/** Échap dans Tessera : fin du plein écran. */
const onKeyDown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return
  if (player?.focus) {
    slideTo(0)
    player.focus()
    return
  }
  leaveStage()
}

/** Clic molette dans Tessera pendant la vidéo plein écran : la molette bascule page / vidéo. */
const onMouseDown = (event: MouseEvent): void => {
  if (event.button !== 1) return
  event.preventDefault()
  void window.tessera.videoStage.toggleWheel()
}
/** Pas de défilement automatique ni de lien ouvert par ce clic. */
const onAuxClick = (event: MouseEvent): void => {
  if (event.button === 1) event.preventDefault()
}

/** Zone qui défile de la page affichée (`data-page-scroller`, PageView). */
const pageScroller = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-page-scroller]')

/**
 * Molette n'importe où dans Tessera (page, menu, barre d'onglets) : tant que la vidéo n'a pas
 * fini de glisser, ou en remontant tout en haut de la page, c'est elle qui glisse.
 */
const onWheel = (event: WheelEvent): void => {
  const page = pageScroller()
  const atTop = (page?.scrollTop ?? 0) <= pageFloor() + 1
  if (target >= window.innerHeight && !(event.deltaY < 0 && atTop)) return
  event.preventDefault()
  event.stopPropagation()
  const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerHeight : 1
  stageWheel(event.deltaY * unit, page)
}

/**
 * Une vidéo passe en plein écran : Tessera aussi, et l'interrupteur de la molette apparaît.
 * `blockId` : son bloc (un bloc écran entier n'est pas montré sous la vidéo).
 */
export function enterStage(
  source: StageSource,
  controls: StagePlayer | null = null,
  blockId: string | null = null
): void {
  if (isStaged(source)) return
  // Une autre vidéo était en plein écran : elle le quitte
  if (useVideoStageStore.getState().source) leaveStage()
  stagedBlock = blockId
  const page = pageScroller()
  pageTopBefore = page && pageFloor() > 0 ? page.scrollTop : null
  // La page commence sous un bloc écran entier. Tessera passe en plein écran : la zone de la page
  // grandit, ses lignes aussi, et ce début est recalculé
  const keepBelow = (): void => {
    const area = pageScroller()
    const floor = pageFloor()
    if (area && floor > 0 && area.scrollTop < floor) area.scrollTop = floor
  }
  keepBelow()
  stopFollowingGrid = usePageScreensStore.subscribe(keepBelow)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  window.addEventListener('mousedown', onMouseDown, true)
  window.addEventListener('auxclick', onAuxClick, true)
  player = controls
  leftReal = false
  target = 0
  cancelAnimationFrame(frame)
  frame = 0
  useVideoStageStore.setState({ source, offset: 0 })
  apply(0)
  void window.tessera.window.holdFullScreen(true)
  void window.tessera.videoStage.set(true)
}

/**
 * La vidéo sort du plein écran : Tessera revient à son état d'avant (plein écran F11 ou non).
 * `byVideo` : c'est la vidéo qui l'a quitté (sinon elle est priée de le quitter).
 */
export function leaveStage(source?: StageSource, byVideo = false): void {
  const current = useVideoStageStore.getState().source
  if (!current || (source && !sameSource(current, source))) return
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('wheel', onWheel, { capture: true })
  window.removeEventListener('mousedown', onMouseDown, true)
  window.removeEventListener('auxclick', onAuxClick, true)
  if (!byVideo) player?.exit()
  player = null
  stopFollowingGrid?.()
  stopFollowingGrid = null
  // La page retrouve sa position (le bloc de la vidéo, s'il était caché sous elle)
  const page = pageScroller()
  if (page && pageTopBefore !== null) page.scrollTop = pageTopBefore
  pageTopBefore = null
  stagedBlock = null
  leftReal = false
  target = 0
  cancelAnimationFrame(frame)
  frame = 0
  useVideoStageStore.setState({ source: null, offset: 0 })
  apply(0)
  void window.tessera.window.holdFullScreen(false)
  void window.tessera.videoStage.set(false)
}

/**
 * Molette pendant une vidéo plein écran (px, positif vers le bas) : la vidéo glisse d'abord,
 * puis la page défile ; en remontant, la page revient en haut, puis la vidéo redescend.
 * `true` si la molette a été prise en charge (une vidéo est en plein écran).
 */
export function stageWheel(deltaY: number, page: HTMLElement | null): boolean {
  if (!useVideoStageStore.getState().source) return false
  const height = window.innerHeight
  if (deltaY > 0) {
    const used = Math.min(height - target, deltaY)
    if (used > 0) slideTo(target + used)
    if (deltaY > used && page) page.scrollTop += deltaY - used
  } else if (deltaY < 0) {
    const up = -deltaY
    const pageUp = page ? Math.min(Math.max(0, page.scrollTop - pageFloor()), up) : 0
    if (page && pageUp > 0) page.scrollTop -= pageUp
    if (up > pageUp) slideTo(target - (up - pageUp))
  }
  return true
}
