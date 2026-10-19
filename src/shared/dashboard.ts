/**
 * Modèle du tableau de bord : les pages, leurs widgets et leur disposition sur la grille.
 * Comme pour les réglages, tout ce qui est lu sur le disque passe par `sanitizeDashboard`.
 */

/** Dimensions de la grille, partagées par la sauvegarde et l'affichage. */
export const GRID = {
  /** Colonnes en disposition large (fenêtre normale ou agrandie). */
  wideCols: 24,
  /** Colonnes en disposition compacte (fenêtre étroite). */
  compactCols: 12,
  /** Lignes visibles en mode « Ajuster à l'écran » : la hauteur des lignes en découle. */
  fitRows: 12,
  /** Largeur de la zone de contenu (px) sous laquelle on passe en disposition compacte. */
  compactBreakpoint: 1040,
  /** Espace entre deux widgets (px). */
  gap: 12
} as const

export type LayoutMode = 'wide' | 'compact'

/**
 * - `fit` : la page tient toujours dans la fenêtre, les lignes s'étirent avec sa hauteur.
 * - `scroll` : cases carrées, la page s'allonge et défile verticalement.
 */
export type PageFitMode = 'fit' | 'scroll'

/** Position et taille d'un widget, en cases de grille. `i` = identifiant du widget. */
export interface GridItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

/** Un widget posé sur une page. `config` contient ses réglages propres (ex. texte d'un titre). */
export interface WidgetInstance {
  id: string
  type: string
  config: Record<string, unknown>
}

export interface DashboardPage {
  id: string
  /** Vide = nom par défaut (« Accueil » pour la page principale). */
  name: string
  isMain: boolean
  fitMode: PageFitMode
  widgets: WidgetInstance[]
  layouts: {
    wide: GridItem[]
    /** `null` = générée automatiquement à partir de la disposition large. */
    compact: GridItem[] | null
  }
}

export interface Dashboard {
  /** v2 : types de widgets préfixés par leur extension (`tessera.clock/clock`). */
  schemaVersion: 2
  pages: DashboardPage[]
}

export const MAIN_PAGE_ID = 'home'

/** Types de widgets de la v1 (avant le système d'extensions) et leur nouveau nom. */
const LEGACY_WIDGET_TYPES: Record<string, string> = {
  clock: 'tessera.clock/clock',
  heading: 'tessera.heading/heading'
}

export const DEFAULT_DASHBOARD: Dashboard = {
  schemaVersion: 2,
  pages: [
    {
      id: MAIN_PAGE_ID,
      name: '',
      isMain: true,
      fitMode: 'fit',
      widgets: [{ id: 'welcome-clock', type: 'tessera.clock/clock', config: {} }],
      layouts: {
        wide: [{ i: 'welcome-clock', x: 0, y: 0, w: 6, h: 3 }],
        compact: null
      }
    }
  ]
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Garde uniquement les positions valides des widgets existants, dans les limites de la grille. */
function sanitizeLayout(input: unknown, cols: number, widgetIds: Set<string>): GridItem[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const items: GridItem[] = []

  for (const raw of input) {
    const item = asRecord(raw)
    const i = asString(item.i)
    if (!widgetIds.has(i) || seen.has(i)) continue
    seen.add(i)
    const w = asInt(item.w, 1, cols, 1)
    items.push({
      i,
      w,
      x: asInt(item.x, 0, cols - w, 0),
      y: asInt(item.y, 0, 10_000, 0),
      h: asInt(item.h, 1, 1_000, 1)
    })
  }
  return items
}

function sanitizePage(input: unknown, usedIds: Set<string>): DashboardPage | null {
  const page = asRecord(input)
  const id = asString(page.id)
  if (!id || usedIds.has(id)) return null
  usedIds.add(id)

  const widgetIds = new Set<string>()
  const widgets: WidgetInstance[] = []
  for (const raw of Array.isArray(page.widgets) ? page.widgets : []) {
    const widget = asRecord(raw)
    const widgetId = asString(widget.id)
    const rawType = asString(widget.type)
    const type = LEGACY_WIDGET_TYPES[rawType] ?? rawType
    if (!widgetId || !type || widgetIds.has(widgetId)) continue
    widgetIds.add(widgetId)
    widgets.push({ id: widgetId, type, config: asRecord(widget.config) })
  }

  const layouts = asRecord(page.layouts)
  return {
    id,
    name: asString(page.name).slice(0, 60),
    isMain: page.isMain === true,
    fitMode: page.fitMode === 'scroll' ? 'scroll' : 'fit',
    widgets,
    layouts: {
      wide: sanitizeLayout(layouts.wide, GRID.wideCols, widgetIds),
      compact: Array.isArray(layouts.compact)
        ? sanitizeLayout(layouts.compact, GRID.compactCols, widgetIds)
        : null
    }
  }
}

/** Construit un tableau de bord valide, avec toujours exactement une page principale. */
export function sanitizeDashboard(input: unknown): Dashboard {
  const root = asRecord(input)
  if (!Array.isArray(root.pages)) return structuredClone(DEFAULT_DASHBOARD)

  const usedIds = new Set<string>()
  const pages = root.pages
    .map((page) => sanitizePage(page, usedIds))
    .filter((page): page is DashboardPage => page !== null)

  if (pages.length === 0) return structuredClone(DEFAULT_DASHBOARD)

  // Une seule page principale, toujours en première position
  const mainIndex = Math.max(
    0,
    pages.findIndex((page) => page.isMain)
  )
  pages.forEach((page, index) => (page.isMain = index === mainIndex))
  const [main] = pages.splice(mainIndex, 1)

  return { schemaVersion: 2, pages: [main, ...pages] }
}
