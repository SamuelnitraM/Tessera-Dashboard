import { create } from 'zustand'

/**
 * Molette de la page (hors mode édition) : elle fait défiler la page, pas l'intérieur des blocs.
 * Un clic dans un bloc le rend actif : la molette fait alors défiler son contenu, jusqu'à un clic
 * ailleurs ou la sortie de la souris. Vaut pour les widgets, les pages web et les applications
 * installées.
 */
interface ActiveBlockState {
  /** Bloc où l'utilisateur a cliqué, ou `null`. */
  activeId: string | null
  /** La page affichée défile (des blocs dépassent) : sinon, la molette reste aux blocs. */
  pageScrolls: boolean
}

export const useActiveBlockStore = create<ActiveBlockState>()(() => ({
  activeId: null,
  pageScrolls: false
}))

export const setActiveBlock = (activeId: string | null): void =>
  useActiveBlockStore.setState({ activeId })

/** Le bloc quitte l'état actif (souris sortie), s'il l'était. */
export function leaveBlock(blockId: string): void {
  if (useActiveBlockStore.getState().activeId === blockId) setActiveBlock(null)
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
