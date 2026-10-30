import { create } from 'zustand'
import { SINGLE_WINDOW, showsPage, type WindowPages } from '@shared/windows'

/**
 * Pages de cette fenêtre de Tessera (envoyées par le processus principal) : la fenêtre
 * principale affiche toutes les pages, sauf celles des autres fenêtres.
 */
interface WindowPagesState extends WindowPages {
  /** Un onglet de page d'une autre fenêtre est tiré au-dessus de celle-ci : il peut y être lâché. */
  dropTarget: boolean
}

export const useWindowPagesStore = create<WindowPagesState>()(() => ({
  ...SINGLE_WINDOW,
  dropTarget: false
}))

/** Cette fenêtre affiche la page. */
export const ownsPage = (pageId: string): boolean =>
  showsPage(useWindowPagesStore.getState(), pageId)
