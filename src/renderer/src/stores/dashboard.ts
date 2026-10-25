import { create } from 'zustand'
import {
  DEFAULT_DASHBOARD,
  GRID,
  type Dashboard,
  type DashboardPage,
  type GridItem,
  type LayoutMode
} from '@shared/dashboard'
import { colsFor, findFreeSpot, packLayout, resolveLayout, toCompactSize } from '../lib/grid'
import { getDefaultSize } from '../plugins/registry'

interface DashboardState {
  dashboard: Dashboard
  /** Crée une page et renvoie son identifiant. */
  addPage: (name: string) => string
  renamePage: (pageId: string, name: string) => void
  /** « Automatique » : la page reste rangée vers le haut (rangée tout de suite à l'activation). */
  setAutoArrange: (pageId: string, value: boolean) => void
  /** « Ajuster » : remonte les blocs et comble les trous, sans changer leur taille. */
  arrangePage: (pageId: string, mode: LayoutMode) => void
  /** La page principale ne peut pas être supprimée. */
  deletePage: (pageId: string) => void
  /** Ajoute un bloc ; `config` = configuration de départ (ex. application web choisie). */
  addWidget: (pageId: string, type: string, config?: Record<string, unknown>) => void
  removeWidget: (pageId: string, widgetId: string) => void
  updateWidgetConfig: (pageId: string, widgetId: string, config: Record<string, unknown>) => void
  setLayout: (pageId: string, mode: LayoutMode, layout: GridItem[]) => void
  /** Oublie la disposition compacte modifiée : elle sera de nouveau générée automatiquement. */
  resetCompactLayout: (pageId: string) => void
}

const defaultSizeOf = (widget: { type: string }) => getDefaultSize(widget.type)

/** Page en mode « Automatique » : ses dispositions sont rangées après chaque changement. */
function arranged(page: DashboardPage): DashboardPage {
  if (!page.autoArrange) return page
  return {
    ...page,
    layouts: {
      wide: packLayout(resolveLayout(page, 'wide', defaultSizeOf), GRID.wideCols),
      compact: page.layouts.compact && packLayout(page.layouts.compact, GRID.compactCols)
    }
  }
}

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
        autoArrange: false,
        widgets: [],
        layouts: { wide: [], compact: null }
      }
      const { dashboard } = get()
      commit({ ...dashboard, pages: [...dashboard.pages, page] })
      return id
    },

    renamePage: (pageId, name) => updatePage(pageId, (page) => ({ ...page, name })),

    setAutoArrange: (pageId, value) =>
      updatePage(pageId, (page) => arranged({ ...page, autoArrange: value })),

    arrangePage: (pageId, mode) =>
      updatePage(pageId, (page) => ({
        ...page,
        layouts: {
          ...page.layouts,
          [mode]: packLayout(resolveLayout(page, mode, defaultSizeOf), colsFor(mode))
        }
      })),

    deletePage: (pageId) => {
      const { dashboard } = get()
      commit({
        ...dashboard,
        pages: dashboard.pages.filter((page) => page.isMain || page.id !== pageId)
      })
    },

    addWidget: (pageId, type, config = {}) => {
      const page = get().dashboard.pages.find((candidate) => candidate.id === pageId)
      if (!page) return

      // Position dans la disposition large : première place libre (la page défile : il y en
      // a toujours une, au besoin sous les autres blocs)
      const wide = resolveLayout(page, 'wide', defaultSizeOf)
      const size = getDefaultSize(type)
      const wideItem: GridItem = {
        i: '',
        ...findFreeSpot(wide, size, GRID.wideCols)!,
        ...size
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

        return arranged({
          ...current,
          widgets: [...current.widgets, { id, type, config }],
          layouts
        })
      })
    },

    removeWidget: (pageId, widgetId) =>
      updatePage(pageId, (page) =>
        arranged({
          ...page,
          widgets: page.widgets.filter((widget) => widget.id !== widgetId),
          layouts: {
            wide: page.layouts.wide.filter((item) => item.i !== widgetId),
            compact: page.layouts.compact?.filter((item) => item.i !== widgetId) ?? null
          }
        })
      ),

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
