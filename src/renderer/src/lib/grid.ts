import {
  GRID,
  type DashboardPage,
  type GridItem,
  type LayoutMode,
  type WidgetInstance
} from '@shared/dashboard'

export interface GridSize {
  w: number
  h: number
}

/** Disposition à utiliser selon la largeur disponible pour la grille (px). */
export function getLayoutMode(width: number): LayoutMode {
  return width < GRID.compactBreakpoint ? 'compact' : 'wide'
}

export function colsFor(mode: LayoutMode): number {
  return mode === 'wide' ? GRID.wideCols : GRID.compactCols
}

/**
 * Taille d'un widget en disposition compacte (12 colonnes au lieu de 24) :
 * les petits widgets prennent la moitié de la largeur, les autres toute la largeur.
 */
export function toCompactSize({ w, h }: GridSize): GridSize {
  return { w: w <= 8 ? GRID.compactCols / 2 : GRID.compactCols, h }
}

/** Taille minimale en disposition compacte. */
export function toCompactMinSize({ w, h }: GridSize): GridSize {
  return { w: Math.ceil(w / 2), h }
}

/** Première ligne libre sous tous les widgets. */
export function layoutBottom(layout: readonly GridItem[]): number {
  return layout.reduce((bottom, item) => Math.max(bottom, item.y + item.h), 0)
}

function collides(a: GridItem, b: GridItem): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * Cherche la première place libre (de haut en bas, de gauche à droite) pour un widget.
 * Renvoie `null` si rien ne tient avant `maxRows` lignes.
 */
export function findFreeSpot(
  layout: readonly GridItem[],
  size: GridSize,
  cols: number,
  maxRows = Infinity
): { x: number; y: number } | null {
  const w = Math.min(size.w, cols)
  const lastRow = Number.isFinite(maxRows) ? maxRows - size.h : layoutBottom(layout)

  for (let y = 0; y <= lastRow; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const candidate = { i: '', x, y, w, h: size.h }
      if (!layout.some((item) => collides(item, candidate))) return { x, y }
    }
  }
  return null
}

/** Ne garde que x, y, w, h (la grille ajoute ses propres champs : minW, moved…). */
export function normalizeLayout(layout: readonly GridItem[]): GridItem[] {
  return layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))
}

export function sameLayout(a: readonly GridItem[], b: readonly GridItem[]): boolean {
  if (a.length !== b.length) return false
  const byId = new Map(b.map((item) => [item.i, item]))
  return a.every((item) => {
    const other = byId.get(item.i)
    return (
      other !== undefined &&
      other.x === item.x &&
      other.y === item.y &&
      other.w === item.w &&
      other.h === item.h
    )
  })
}

/**
 * Ajoute une position aux widgets qui n'en ont pas encore dans cette disposition
 * (placés à la suite, sous les autres).
 */
function withMissingItems(
  layout: readonly GridItem[],
  widgets: readonly WidgetInstance[],
  cols: number,
  sizeOf: (widget: WidgetInstance) => GridSize
): GridItem[] {
  const result = [...layout]
  const placed = new Set(layout.map((item) => item.i))
  for (const widget of widgets) {
    if (placed.has(widget.id)) continue
    const size = sizeOf(widget)
    const spot = findFreeSpot(result, size, cols) ?? { x: 0, y: layoutBottom(result) }
    result.push({ i: widget.id, ...spot, w: Math.min(size.w, cols), h: size.h })
  }
  return result
}

/**
 * Génère la disposition compacte : les widgets gardent l'ordre de lecture de la disposition
 * large (haut -> bas, gauche -> droite) et s'empilent sur 12 colonnes.
 */
function generateCompactLayout(wide: readonly GridItem[]): GridItem[] {
  const ordered = [...wide].sort((a, b) => a.y - b.y || a.x - b.x)
  const compact: GridItem[] = []
  for (const item of ordered) {
    const size = toCompactSize(item)
    const spot = findFreeSpot(compact, size, GRID.compactCols)!
    compact.push({ i: item.i, ...spot, ...size })
  }
  return compact
}

/** Disposition à afficher pour une page, selon la largeur disponible. */
export function resolveLayout(
  page: DashboardPage,
  mode: LayoutMode,
  defaultSizeOf: (widget: WidgetInstance) => GridSize
): GridItem[] {
  const wide = withMissingItems(page.layouts.wide, page.widgets, GRID.wideCols, defaultSizeOf)
  if (mode === 'wide') return wide

  const compact = page.layouts.compact ?? generateCompactLayout(wide)
  return withMissingItems(compact, page.widgets, GRID.compactCols, (widget) =>
    toCompactSize(defaultSizeOf(widget))
  )
}
