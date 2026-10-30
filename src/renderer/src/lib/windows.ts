import { useMemo } from 'react'
import { MAIN_PAGE_ID, type DashboardPage } from '@shared/dashboard'
import { showsPage } from '@shared/windows'
import { focusBlock } from '../stores/activeBlock'
import { setPageCreatedListener, useDashboardStore } from '../stores/dashboard'
import { useNavigationStore } from '../stores/navigation'
import { ownsPage, useWindowPagesStore } from '../stores/windowPages'

/**
 * Plusieurs fenêtres de Tessera : chaque fenêtre affiche ses pages (voir src/main/windows.ts).
 * Une page d'une autre fenêtre s'ouvre dans celle-ci, qui passe devant.
 */

/** Pages affichées par cette fenêtre, dans l'ordre du tableau de bord. */
export function useOwnPages(): DashboardPage[] {
  const pages = useDashboardStore((state) => state.dashboard.pages)
  const windowPages = useWindowPagesStore()
  return useMemo(
    () => pages.filter((page) => showsPage(windowPages, page.id)),
    [pages, windowPages]
  )
}

/** Pages affichées par cette fenêtre, lues une fois (hors d'un composant). */
export function ownPages(): DashboardPage[] {
  return useDashboardStore.getState().dashboard.pages.filter((page) => ownsPage(page.id))
}

/** Page d'accueil de cette fenêtre :la page principale si elle l'affiche, sinon sa première. */
export function homePageId(): string {
  if (ownsPage(MAIN_PAGE_ID)) return MAIN_PAGE_ID
  return (
    useDashboardStore.getState().dashboard.pages.find((page) => ownsPage(page.id))?.id ??
    MAIN_PAGE_ID
  )
}

/** Ouvre la page et donne le focus au bloc, dans la fenêtre qui affiche la page. */
export function showBlock(pageId: string, blockId: string): void {
  if (!ownsPage(pageId)) {
    void window.tessera.windows.showPage(pageId, blockId)
    return
  }
  useNavigationStore.getState().navigate({ type: 'page', pageId })
  focusBlock(blockId)
}

/** Page affichée partie dans une autre fenêtre (ou supprimée) : la fenêtre revient à son accueil. */
function keepOwnPage(): void {
  const { view, navigate } = useNavigationStore.getState()
  if (view.type === 'page' && !ownsPage(view.pageId)) {
    navigate({ type: 'page', pageId: homePageId() })
  }
}

/**
 * Pages de la fenêtre, tableau de bord changé ailleurs, demandes des autres fenêtres. Appelé
 * avant le premier affichage.
 */
export async function initWindows(): Promise<void> {
  const pages = await window.tessera.windows.pages()
  if (pages) useWindowPagesStore.setState(pages)
  window.tessera.windows.onPagesChange((next) => {
    useWindowPagesStore.setState(next)
    keepOwnPage()
  })
  window.tessera.windows.onDropTarget((dropTarget) => useWindowPagesStore.setState({ dropTarget }))
  // Page créée dans une autre fenêtre que la principale : elle y reste (réservée avant d'être
  // enregistrée, pour ne jamais apparaître dans la principale)
  setPageCreatedListener((pageId) => {
    const { primary, pageIds } = useWindowPagesStore.getState()
    if (primary) return
    useWindowPagesStore.setState({ pageIds: [...pageIds, pageId] })
    void window.tessera.windows.claimPage(pageId)
  })
  window.tessera.windows.onNavigate(({ pageId, blockId }) => {
    if (!ownsPage(pageId)) return
    useNavigationStore.getState().navigate({ type: 'page', pageId })
    if (blockId) focusBlock(blockId)
  })
  // Tableau de bord changé dans une autre fenêtre : repris tel quel (sans le réenregistrer)
  window.tessera.dashboard.onChange((dashboard) => {
    useDashboardStore.setState({ dashboard })
    keepOwnPage()
  })
  // Onglets d'applications ouverts ici : les autres fenêtres ne ferment pas ces applications
  let opened = ''
  const report = (appIds: string[]): void => {
    const key = appIds.join('|')
    if (key === opened) return
    opened = key
    void window.tessera.windows.setOpenedApps(appIds)
  }
  useNavigationStore.subscribe((state) => {
    report(state.openedApps)
    // Retour à une page d'une autre fenêtre (onglet d'application fermé…) : accueil de celle-ci
    if (state.view.type === 'page' && !ownsPage(state.view.pageId)) keepOwnPage()
  })
  keepOwnPage()
}
