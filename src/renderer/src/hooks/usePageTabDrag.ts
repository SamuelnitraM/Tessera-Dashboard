import { create } from 'zustand'
import { useDashboardStore } from '../stores/dashboard'

/**
 * Onglet de page glissé (barre du haut ou menu latéral), comme les onglets d'un navigateur :
 * dans la barre, il change de place ; lâché hors de la fenêtre, il ouvre une nouvelle fenêtre ou
 * rejoint la fenêtre de Tessera sous la souris (voir src/main/windows.ts).
 */

/** Distance (px) avant qu'un appui devienne un glisser (un clic reste un clic). */
const DRAG_DISTANCE = 6

interface PageDragState {
  /** Page en cours de glisser. */
  pageId: string | null
  /** Onglet sous la souris : la page ira juste avant ou après lui. */
  over: { pageId: string; after: boolean } | null
  /** La souris est hors de la fenêtre. */
  outside: boolean
}

export const usePageDragStore = create<PageDragState>()(() => ({
  pageId: null,
  over: null,
  outside: false
}))

/** Attributs d'un onglet : à poser sur l'élément qui porte `onPointerDown`. */
export function pageTabAttributes(
  state: PageDragState,
  pageId: string
): Record<'data-page-tab' | 'data-dragging' | 'data-drop', string | undefined> {
  return {
    'data-page-tab': pageId,
    'data-dragging': state.pageId === pageId ? 'true' : undefined,
    'data-drop':
      state.over?.pageId === pageId && !state.outside
        ? state.over.after
          ? 'after'
          : 'before'
        : undefined
  }
}

/**
 * Appui sur un onglet de page : suit le glisser. `axis` : sens de la barre (`x` en haut, `y` dans
 * le menu latéral). Les boutons marqués `data-no-tab-drag` (fermer) ne lancent rien.
 */
export function startPageTabDrag(
  event: React.PointerEvent<HTMLElement>,
  pageId: string,
  axis: 'x' | 'y'
): void {
  if (event.button !== 0 || !event.isPrimary) return
  if ((event.target as Element).closest('[data-no-tab-drag]')) return
  const element = event.currentTarget
  const start = { x: event.clientX, y: event.clientY }
  const pointerId = event.pointerId
  let dragging = false

  const outsideWindow = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight

  const onMove = (move: PointerEvent): void => {
    if (move.pointerId !== pointerId) return
    if (!dragging) {
      if (Math.hypot(move.clientX - start.x, move.clientY - start.y) < DRAG_DISTANCE) return
      dragging = true
      // La souris reste suivie hors de l'onglet, et hors de la fenêtre
      element.setPointerCapture(pointerId)
      document.documentElement.dataset.pageDrag = 'true'
      usePageDragStore.setState({ pageId, over: null, outside: false })
    }
    const outside = outsideWindow(move.clientX, move.clientY)
    if (outside !== usePageDragStore.getState().outside) {
      // Hors de la fenêtre : la fenêtre de Tessera dessous se signale
      void window.tessera.windows.dragPage(outside)
    }
    const tab = outside
      ? null
      : (document.elementFromPoint(move.clientX, move.clientY)?.closest('[data-page-tab]') as
          HTMLElement | null | undefined)
    const target = tab?.dataset.pageTab
    let over: PageDragState['over'] = null
    if (tab && target && target !== pageId) {
      const box = tab.getBoundingClientRect()
      const after =
        axis === 'x'
          ? move.clientX > box.left + box.width / 2
          : move.clientY > box.top + box.height / 2
      over = { pageId: target, after }
    }
    const current = usePageDragStore.getState().over
    if (
      outside !== usePageDragStore.getState().outside ||
      current?.pageId !== over?.pageId ||
      current?.after !== over?.after
    ) {
      usePageDragStore.setState({ over, outside })
    }
  }

  const finish = (up: PointerEvent | null): void => {
    window.removeEventListener('pointermove', onMove, true)
    window.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('pointercancel', onCancel, true)
    window.removeEventListener('keydown', onKey, true)
    if (!dragging) return
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
    delete document.documentElement.dataset.pageDrag
    const { over, outside } = usePageDragStore.getState()
    usePageDragStore.setState({ pageId: null, over: null, outside: false })
    // Le clic qui suit le relâchement n'ouvre pas la page
    window.addEventListener('click', swallow, true)
    setTimeout(() => window.removeEventListener('click', swallow, true), 0)
    if (!up) {
      if (outside) void window.tessera.windows.dragPage(false)
      return
    }
    if (outsideWindow(up.clientX, up.clientY)) {
      void window.tessera.windows.dropPage(pageId)
    } else {
      if (outside) void window.tessera.windows.dragPage(false)
      if (over) useDashboardStore.getState().movePage(pageId, over.pageId, over.after)
    }
  }
  const swallow = (click: MouseEvent): void => click.stopPropagation()
  const onUp = (up: PointerEvent): void => {
    if (up.pointerId === pointerId) finish(up)
  }
  const onCancel = (cancel: PointerEvent): void => {
    if (cancel.pointerId === pointerId) finish(null)
  }
  // Échap : le glisser est annulé
  const onKey = (key: KeyboardEvent): void => {
    if (key.key !== 'Escape' || !dragging) return
    key.preventDefault()
    key.stopPropagation()
    finish(null)
  }

  // Sur la fenêtre : la souris quitte l'onglet avant que le glisser ne commence
  window.addEventListener('pointermove', onMove, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onCancel, true)
  window.addEventListener('keydown', onKey, true)
}
