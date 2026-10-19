import { create } from 'zustand'
import {
  DEFAULT_DASHBOARD,
  GRID,
  type Dashboard,
  type DashboardPage,
  type GridItem,
  type LayoutMode,
  type PageFitMode
} from '@shared/dashboard'
import { findFreeSpot, layoutBottom, resolveLayout, toCompactSize } from '../lib/grid'
import { getDefaultSize, getMinSize } from '../widgets/registry'

export type AddWidgetResult = 'added' | 'page-full'

interface DashboardState {
  dashboard: Dashboard
  /** Crée une page et renvoie son identifiant. */
  addPage: (name: string) => string
  renamePage: (pageId: string, name: string) => void
  setFitMode: (pageId: string, fitMode: PageFitMode) => void
  /** La page principale ne peut pas être supprimée. */
  deletePage: (pageId: string) => void
  addWidget: (pageId: string, type: string, mode: LayoutMode) => AddWidgetResult
  removeWidget: (pageId: string, widgetId: string) => void
  updateWidgetConfig: (pageId: string, widgetId: string, config: Record<string, unknown>) => void
  setLayout: (pageId: string, mode: LayoutMode, layout: GridItem[]) => void
  /** Oublie la disposition compacte modifiée : elle sera de nouveau générée automatiquement. */
  resetCompactLayout: (pageId: string) => void
}

const defaultSizeOf = (widget: { type: string }) => getDefaultSize(widget.type)

export const useDashboardStore = create<DashboardState>()((set, get) => {
  /** Applique une modification, l'affiche immédiatement et l'envoie à la sauvegarde. */
  function commit(dashboard: Dashboard): void {
    set({ dashboard })
    void window.tessera.dashboard.save(dashboard)
  }

  function updatePage(pageId: string, update: (page: DashboardPage) => DashboardPage): void {
    const { dashboard } = get()
    commit({
      ...dashboard,
      pages: dashboard.pages.map((page) => (page.id === pageId ? update(page) : page))
    })
  }

  return {
    dashboard: DEFAULT_DASHBOARD,

    addPage: (name) => {
      const id = crypto.randomUUID()
      const page: DashboardPage = {
        id,
        name,
        isMain: false,
        fitMode: 'fit',
        widgets: [],
        layouts: { wide: [], compact: null }
      }
      const { dashboard } = get()
      commit({ ...dashboard, pages: [...dashboard.pages, page] })
      return id
    },

    renamePage: (pageId, name) => updatePage(pageId, (page) => ({ ...page, name })),

    setFitMode: (pageId, fitMode) => updatePage(pageId, (page) => ({ ...page, fitMode })),

    deletePage: (pageId) => {
      const { dashboard } = get()
      commit({
        ...dashboard,
        pages: dashboard.pages.filter((page) => page.isMain || page.id !== pageId)
      })
    },

    addWidget: (pageId, type, mode) => {
      const page = get().dashboard.pages.find((candidate) => candidate.id === pageId)
      if (!page) return 'page-full'

      // Position dans la disposition large : taille par défaut, sinon taille minimale
      const wide = resolveLayout(page, 'wide', defaultSizeOf)
      const maxRows = page.fitMode === 'fit' ? GRID.fitRows : Infinity
      const sizes = [getDefaultSize(type), getMinSize(type)]
      let wideItem: GridItem | null = null
      for (const size of sizes) {
        const spot = findFreeSpot(wide, size, GRID.wideCols, maxRows)
        if (spot) {
          wideItem = { i: '', ...spot, ...size }
          break
        }
      }

      if (!wideItem) {
        // Page pleine : on refuse en disposition large, où l'utilisateur voit la page entière.
        // En disposition compacte, le widget est placé sous les autres dans la disposition large.
        if (mode === 'wide') return 'page-full'
        wideItem = { i: '', x: 0, y: layoutBottom(wide), ...getDefaultSize(type) }
      }

      const id = crypto.randomUUID()
      const placed: GridItem = { ...wideItem, i: id }
      updatePage(pageId, (current) => {
        const layouts = { ...current.layouts, wide: [...wide, placed] }

        // Disposition compacte personnalisée : le widget s'ajoute sous les autres
        if (current.layouts.compact) {
          const size = toCompactSize(getDefaultSize(type))
          const spot = findFreeSpot(current.layouts.compact, size, GRID.compactCols)!
          layouts.compact = [...current.layouts.compact, { i: id, ...spot, ...size }]
        }

        return {
          ...current,
          widgets: [...current.widgets, { id, type, config: {} }],
          layouts
        }
      })
      return 'added'
    },

    removeWidget: (pageId, widgetId) =>
      updatePage(pageId, (page) => ({
        ...page,
        widgets: page.widgets.filter((widget) => widget.id !== widgetId),
        layouts: {
          wide: page.layouts.wide.filter((item) => item.i !== widgetId),
          compact: page.layouts.compact?.filter((item) => item.i !== widgetId) ?? null
        }
      })),

    updateWidgetConfig: (pageId, widgetId, config) =>
      updatePage(pageId, (page) => ({
        ...page,
        widgets: page.widgets.map((widget) =>
          widget.id === widgetId ? { ...widget, config: { ...widget.config, ...config } } : widget
        )
      })),

    setLayout: (pageId, mode, layout) =>
      updatePage(pageId, (page) => ({
        ...page,
        layouts: { ...page.layouts, [mode]: layout }
      })),

    resetCompactLayout: (pageId) =>
      updatePage(pageId, (page) => ({ ...page, layouts: { ...page.layouts, compact: null } }))
  }
})

/** Charge le tableau de bord sauvegardé. */
export async function initDashboardStore(): Promise<void> {
  useDashboardStore.setState({ dashboard: await window.tessera.dashboard.get() })
}
