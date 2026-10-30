import { create } from 'zustand'
import {
  DEFAULT_DASHBOARD,
  GRID,
  type Dashboard,
  type DashboardPage,
  type GridItem,
  type LayoutMode
} from '@shared/dashboard'
import {
  colsFor,
  findFreeSpot,
  normalizeLayout,
  packLayout,
  placeNewBlock,
  planMove,
  resolveLayout,
  toCompactSize
} from '../lib/grid'
import { getDefaultSize, getMinSize } from '../plugins/registry'

interface DashboardState {
  dashboard: Dashboard
  /** Crée une page et renvoie son identifiant. */
  addPage: (name: string) => string
  renamePage: (pageId: string, name: string) => void
  /** Range la page juste avant (ou après) une autre (onglet glissé). */
  movePage: (pageId: string, targetId: string, after: boolean) => void
  /** « Automatique » : la page reste rangée vers le haut (rangée tout de suite à l'activation). */
  setAutoArrange: (pageId: string, value: boolean) => void
  setSnap: (pageId: string, value: boolean) => void
  /** « Ajuster » : remonte les blocs et comble les trous, sans changer leur taille. */
  arrangePage: (pageId: string, mode: LayoutMode) => void
  /** La page principale ne peut pas être supprimée. */
  deletePage: (pageId: string) => void
  /** Ajoute un bloc ; `config` = configuration de départ (ex. application web choisie). */
  /**
   * Ajoute un bloc à la première place libre, ou à la case `at` de la disposition large (les
   * blocs gênés s'écartent) ; renvoie son identifiant.
   */
  addWidget: (
    pageId: string,
    type: string,
    config?: Record<string, unknown>,
    at?: { x: number; y: number },
    /** Taille du bloc (sinon celle par défaut du widget). */
    blockSize?: { w: number; h: number }
  ) => string | null
  removeWidget: (pageId: string, widgetId: string) => void
  updateWidgetConfig: (pageId: string, widgetId: string, config: Record<string, unknown>) => void
  /**
   * `fillRestore` (disposition large) : places à rendre plus tard à ce bloc et à ceux qu'il écarte
   * (« Taille : écran entier »), ou `null` pour les oublier (« Taille précédente »).
   */
  setLayout: (
    pageId: string,
    mode: LayoutMode,
    layout: GridItem[],
    fillRestore?: { id: string; items: GridItem[] | null }
  ) => void
  /** Oublie la disposition compacte modifiée : elle sera de nouveau générée automatiquement. */
  resetCompactLayout: (pageId: string) => void
}

const defaultSizeOf = (widget: { type: string }) => getDefaultSize(widget.type)

/**
 * Appelé juste avant l'enregistrement d'une nouvelle page (voir lib/windows.ts : une page créée
 * dans une autre fenêtre que la principale y reste).
 */
let pageCreated: (pageId: string) => void = () => {}

export function setPageCreatedListener(listener: (pageId: string) => void): void {
  pageCreated = listener
}

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
        snap: true,
        fillRestore: {},
        widgets: [],
        layouts: { wide: [], compact: null }
      }
      const { dashboard } = get()
      pageCreated(id)
      commit({ ...dashboard, pages: [...dashboard.pages, page] })
      return id
    },

    renamePage: (pageId, name) => updatePage(pageId, (page) => ({ ...page, name })),

    movePage: (pageId, targetId, after) => {
      const { dashboard } = get()
      const page = dashboard.pages.find((candidate) => candidate.id === pageId)
      if (!page || pageId === targetId) return
      const rest = dashboard.pages.filter((candidate) => candidate.id !== pageId)
      const index = rest.findIndex((candidate) => candidate.id === targetId)
      if (index < 0) return
      rest.splice(after ? index + 1 : index, 0, page)
      commit({ ...dashboard, pages: rest })
    },

    setAutoArrange: (pageId, value) =>
      updatePage(pageId, (page) => arranged({ ...page, autoArrange: value })),

    setSnap: (pageId, value) => updatePage(pageId, (page) => ({ ...page, snap: value })),

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

    addWidget: (pageId, type, config = {}, at, blockSize) => {
      const page = get().dashboard.pages.find((candidate) => candidate.id === pageId)
      if (!page) return null

      // Position dans la disposition large : la ligne la plus haute où il tient, à une taille
      // qui s'adapte à la place libre sans descendre sous son minimum (la page défile : il y a
      // toujours une place, au besoin sous les autres blocs). Taille imposée : telle quelle.
      const wide = resolveLayout(page, 'wide', defaultSizeOf)
      const wideItem = blockSize
        ? { i: '', ...findFreeSpot(wide, blockSize, GRID.wideCols)!, ...blockSize }
        : placeNewBlock(wide, getDefaultSize(type), getMinSize(type), GRID.wideCols)
      const size = { w: wideItem.w, h: wideItem.h }

      const id = crypto.randomUUID()
      const placed: GridItem = { ...wideItem, i: id }
      // Case choisie (déposé depuis la barre des pages) : comme un bloc qu'on déplace
      const wideLayout = at
        ? normalizeLayout(
            planMove(
              [...wide, placed],
              id,
              {
                ...placed,
                x: Math.max(0, Math.min(GRID.wideCols - size.w, at.x)),
                y: Math.max(0, at.y)
              },
              GRID.wideCols,
              page.autoArrange
            ).layout
          )
        : [...wide, placed]
      updatePage(pageId, (current) => {
        const layouts = { ...current.layouts, wide: wideLayout }

        // Disposition compacte personnalisée : le widget s'ajoute sous les autres
        if (current.layouts.compact) {
          const size = toCompactSize(blockSize ?? getDefaultSize(type))
          const spot = findFreeSpot(current.layouts.compact, size, GRID.compactCols)!
          layouts.compact = [...current.layouts.compact, { i: id, ...spot, ...size }]
        }

        return arranged({
          ...current,
          widgets: [...current.widgets, { id, type, config }],
          layouts
        })
      })
      return id
    },

    removeWidget: (pageId, widgetId) =>
      updatePage(pageId, (page) =>
        arranged({
          ...page,
          widgets: page.widgets.filter((widget) => widget.id !== widgetId),
          fillRestore: Object.fromEntries(
            Object.entries(page.fillRestore)
              .filter(([id]) => id !== widgetId)
              .map(([id, items]) => [id, items.filter((item) => item.i !== widgetId)])
          ),
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

    setLayout: (pageId, mode, layout, fillRestore) =>
      updatePage(pageId, (page) => {
        const restore = { ...page.fillRestore }
        if (fillRestore?.items) restore[fillRestore.id] = fillRestore.items
        else if (fillRestore) delete restore[fillRestore.id]
        return { ...page, fillRestore: restore, layouts: { ...page.layouts, [mode]: layout } }
      }),

    resetCompactLayout: (pageId) =>
      updatePage(pageId, (page) => ({ ...page, layouts: { ...page.layouts, compact: null } }))
  }
})

/** Charge le tableau de bord sauvegardé. */
export async function initDashboardStore(): Promise<void> {
  useDashboardStore.setState({ dashboard: await window.tessera.dashboard.get() })
}
