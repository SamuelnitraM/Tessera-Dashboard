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

/**
 * Range une disposition (« Ajuster », mode « Automatique ») : dans l'ordre de lecture, chaque
 * bloc remonte à la ligne la plus haute où il tient, au plus près de sa colonne (il ne se décale
 * sur le côté que pour combler un trou). Les tailles ne changent pas ; un trou ne reste que si
 * aucun bloc n'y tient. `first` : bloc placé en premier à égalité (celui qu'on vient de poser).
 */
export function packLayout(layout: readonly GridItem[], cols: number, first?: string): GridItem[] {
  const ordered = [...layout].sort(
    (a, b) => a.y - b.y || a.x - b.x || Number(b.i === first) - Number(a.i === first)
  )
  const packed: GridItem[] = []
  for (const item of ordered) {
    const w = Math.min(item.w, cols)
    // Colonnes possibles, de la plus proche de la sienne à la plus lointaine
    const columns = Array.from({ length: cols - w + 1 }, (_, x) => x).sort(
      (a, b) => Math.abs(a - item.x) - Math.abs(b - item.x) || a - b
    )
    let spot: { x: number; y: number } | null = null
    for (let y = 0; !spot; y++) {
      for (const x of columns) {
        const candidate = { i: item.i, x, y, w, h: item.h }
        if (!packed.some((other) => collides(other, candidate))) {
          spot = { x, y }
          break
        }
      }
    }
    packed.push({ ...item, ...spot, w })
  }
  return packed
}

/** Un bloc ne s'écarte que de quelques cases (au-delà, il prend la place libérée). */
const MAX_SHIFT = 3

/** Résultat d'un déplacement : disposition au relâchement, et blocs qui bougeront. */
export interface MovePlan {
  layout: GridItem[]
  moved: string[]
}

/**
 * Où vont les blocs gênés quand `id` est posé sur `target` (déplacement ou redimensionnement).
 * Chacun monte d'abord, sinon s'écarte sur un côté (de quelques cases au plus) ; sinon il prend,
 * dans la place libérée par le bloc déplacé, l'endroit le plus proche de sa place d'origine ; en
 * dernier recours, il descend à la place libre la plus proche. Rien ne bouge avant le
 * relâchement : la grille affiche ce plan en aperçu.
 */
export function planMove(
  layout: readonly GridItem[],
  id: string,
  target: GridItem,
  cols: number,
  auto: boolean
): MovePlan {
  const previous = layout.find((item) => item.i === id)
  const others = layout.filter((item) => item.i !== id)
  const placedTarget = { ...target, i: id, w: Math.min(target.w, cols) }

  let next: GridItem[]
  if (auto) {
    next = packLayout([...others, placedTarget], cols, id)
  } else {
    const fixed: GridItem[] = [placedTarget, ...others.filter((o) => !collides(o, placedTarget))]
    const blocked = others
      .filter((o) => collides(o, placedTarget))
      .sort((a, b) => b.w * b.h - a.w * a.h)
    const free = (candidate: GridItem): boolean =>
      candidate.x >= 0 &&
      candidate.y >= 0 &&
      candidate.x + candidate.w <= cols &&
      !fixed.some((item) => collides(item, candidate))

    const distance = (a: GridItem, b: GridItem): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    const near = (candidate: GridItem, item: GridItem): boolean =>
      distance(candidate, item) <= MAX_SHIFT

    for (const item of blocked) {
      // 1. Monter au-dessus du bloc posé (de quelques cases au plus)
      const up = { ...item, y: placedTarget.y - item.h }
      let spot: GridItem | undefined = near(up, item) && free(up) ? up : undefined

      // 2. Sinon s'écarter sur un côté, le plus proche d'abord
      if (!spot) {
        spot = [
          { ...item, x: placedTarget.x - item.w },
          { ...item, x: placedTarget.x + placedTarget.w }
        ]
          .filter((candidate) => near(candidate, item))
          .sort((a, b) => distance(a, item) - distance(b, item))
          .find(free)
      }

      // 3. Sinon prendre la place libérée par le bloc déplacé, à l'endroit le plus proche de sa
      // place d'origine (l'échange de places en fait partie)
      if (!spot && previous) {
        const candidates: GridItem[] = [
          {
            ...item,
            x: item.x + previous.x - placedTarget.x,
            y: item.y + previous.y - placedTarget.y
          }
        ]
        for (let y = previous.y; y <= previous.y + Math.max(0, previous.h - item.h); y++) {
          for (let x = previous.x; x <= previous.x + Math.max(0, previous.w - item.w); x++) {
            candidates.push({ ...item, x: Math.min(x, cols - item.w), y })
          }
        }
        spot = candidates.filter(free).sort((a, b) => distance(a, item) - distance(b, item))[0]
      }

      // 4. En dernier recours, descendre à la place libre la plus proche (ligne par ligne, la
      // colonne la plus proche de la sienne d'abord)
      if (!spot) {
        const columns = Array.from({ length: Math.max(1, cols - item.w + 1) }, (_, x) => x).sort(
          (a, b) => Math.abs(a - item.x) - Math.abs(b - item.x) || a - b
        )
        for (let y = item.y + 1; !spot; y++) {
          spot = columns.map((x) => ({ ...item, x, y })).find(free)
        }
      }
      fixed.push(spot)
    }
    next = fixed
  }

  const before = new Map(layout.map((item) => [item.i, item]))
  const moved = next
    .filter((item) => {
      const old = before.get(item.i)
      return item.i !== id && old !== undefined && (old.x !== item.x || old.y !== item.y)
    })
    .map((item) => item.i)
  return { layout: next, moved }
}
