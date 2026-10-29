import { create } from 'zustand'

/**
 * Molette de la page (hors mode édition) : elle fait défiler la page, pas l'intérieur des blocs.
 * Un clic dans un bloc (sa barre comprise) lui donne le focus : la molette au-dessus de lui fait
 * alors défiler son contenu, et la page ne bouge pas, même arrivé au bout. Le focus reste jusqu'à
 * un clic ailleurs dans Tessera (pas quand la souris sort du bloc, ni après un clic dans une autre
 * fenêtre). Vaut pour les widgets, les pages web et les applications installées.
 */
interface ActiveBlockState {
  /** Bloc qui a le focus (sa barre se colore, la molette fait défiler son contenu), ou `null`. */
  activeId: string | null
  /** La page affichée défile (des blocs dépassent) : sinon, la molette reste aux blocs. */
  pageScrolls: boolean
}

export const useActiveBlockStore = create<ActiveBlockState>()(() => ({
  activeId: null,
  pageScrolls: false
}))

/** Clic dans un bloc (focus), ou ailleurs (`null` : plus aucun). */
export const setActiveBlock = (blockId: string | null): void =>
  useActiveBlockStore.setState({ activeId: blockId })

/**
 * Donne le focus à un bloc (clic sur une notification) : sa barre se colore et la page défile
 * jusqu'à lui, dès qu'il est affiché (la page peut être en train de s'ouvrir).
 */
export function focusBlock(blockId: string): void {
  useActiveBlockStore.setState({ activeId: blockId })
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
