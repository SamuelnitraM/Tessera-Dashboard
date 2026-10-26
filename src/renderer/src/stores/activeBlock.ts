import { create } from 'zustand'

/**
 * Molette de la page (hors mode édition) : elle fait défiler la page, pas l'intérieur des blocs.
 * Un clic dans un bloc le rend actif : la molette fait alors défiler son contenu, jusqu'à un clic
 * ailleurs ou la sortie de la souris. Vaut pour les widgets, les pages web et les applications
 * installées.
 */
interface ActiveBlockState {
  /** Bloc où l'utilisateur a cliqué et que la souris n'a pas quitté (molette), ou `null`. */
  activeId: string | null
  /** Bloc qui a le focus (dernier cliqué, jusqu'à un clic ailleurs) : sa barre se colore. */
  focusedId: string | null
  /** La page affichée défile (des blocs dépassent) : sinon, la molette reste aux blocs. */
  pageScrolls: boolean
}

export const useActiveBlockStore = create<ActiveBlockState>()(() => ({
  activeId: null,
  focusedId: null,
  pageScrolls: false
}))

/** Clic dans un bloc (actif et focus), ou ailleurs (`null` : plus aucun). */
export const setActiveBlock = (blockId: string | null): void =>
  useActiveBlockStore.setState({ activeId: blockId, focusedId: blockId })

/** Le bloc quitte l'état actif (souris sortie), s'il l'était : il garde le focus. */
export function leaveBlock(blockId: string): void {
  if (useActiveBlockStore.getState().activeId === blockId) {
    useActiveBlockStore.setState({ activeId: null })
  }
}

/**
 * Donne le focus à un bloc sans l'activer (clic sur une notification) : sa barre se colore et
 * la page défile jusqu'à lui, dès qu'il est affiché (la page peut être en train de s'ouvrir).
 */
export function focusBlock(blockId: string): void {
  useActiveBlockStore.setState({ activeId: null, focusedId: blockId })
  const started = performance.now()
  const reveal = (): void => {
    const block = document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`)
    if (block) block.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    else if (performance.now() - started < 2000) requestAnimationFrame(reveal)
  }
  requestAnimationFrame(reveal)
}

/** Événement de la page : défilement demandé par un bloc qui a reçu la molette (px). */
export const PAGE_WHEEL_EVENT = 'tessera:page-wheel'

export function scrollPage(deltaY: number): void {
  window.dispatchEvent(new CustomEvent<number>(PAGE_WHEEL_EVENT, { detail: deltaY }))
}

/** Bloc qui contient un élément (`data-block-id` de la grille), ou `null`. */
export function blockIdOf(element: Element | null): string | null {
  return element?.closest<HTMLElement>('[data-block-id]')?.dataset.blockId ?? null
}
