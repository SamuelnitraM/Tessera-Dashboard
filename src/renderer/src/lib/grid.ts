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

/**
 * Place d'un nouveau bloc : la ligne la plus haute où il tient, à sa taille par défaut si possible,
 * sinon à la plus grande taille qui y tient sans descendre sous son minimum (à gauche d'abord). Sans
 * place nulle part, sous les autres blocs, à sa taille par défaut.
 */
export function placeNewBlock(
  layout: readonly GridItem[],
  size: GridSize,
  min: GridSize,
  cols: number
): GridItem {
  const w = Math.min(size.w, cols)
  const minW = Math.min(min.w, w)
  const minH = Math.min(min.h, size.h)
  // Tailles possibles, de la plus grande à la plus petite (la taille par défaut d'abord)
  const sizes: GridSize[] = []
  for (let width = w; width >= minW; width--) {
    for (let height = size.h; height >= minH; height--) sizes.push({ w: width, h: height })
  }
  sizes.sort((a, b) => b.w * b.h - a.w * a.h || b.w - a.w)
  const bottom = layoutBottom(layout)
  for (let y = 0; y < bottom; y++) {
    let best: GridItem | null = null
    for (let x = 0; x <= cols - minW; x++) {
      const fit = sizes.find(
        (candidate) =>
          x + candidate.w <= cols &&
          !layout.some((item) => collides(item, { i: '', x, y, ...candidate }))
      )
      if (fit && (!best || fit.w * fit.h > best.w * best.h)) best = { i: '', x, y, ...fit }
      if (best && best.w === w && best.h === size.h) break
    }
    if (best) return best
  }
  return { i: '', x: 0, y: bottom, w, h: size.h }
}

/** Taille « écran entier » : toute la largeur, `screenRows` lignes, au début d'un écran. */
export function fillsWholeScreen(item: GridItem, cols: number, screenRows: number): boolean {
  return item.x === 0 && item.w === cols && item.h === screenRows && item.y % screenRows === 0
}

/**
 * « Taille précédente » : le bloc agrandi et ceux qu'il avait écartés reprennent leur place
 * (`saved`) ; un bloc posé depuis sur l'une de ces places va à la place libre la plus proche.
 */
export function restoreSaved(
  layout: readonly GridItem[],
  saved: readonly GridItem[],
  cols: number,
  rowWeight = 1
): GridItem[] {
  const ids = new Set(layout.map((item) => item.i))
  const restored = saved
    .filter((item) => ids.has(item.i))
    .map((item) => ({
      ...item,
      w: Math.min(item.w, cols),
      x: Math.min(item.x, cols - Math.min(item.w, cols))
    }))
  const back = new Set(restored.map((item) => item.i))
  const fixed: GridItem[] = [...restored]
  const others = layout.filter((item) => !back.has(item.i))
  for (const item of others) if (!fixed.some((other) => collides(other, item))) fixed.push(item)
  for (const item of others) {
    if (fixed.some((other) => other.i === item.i)) continue
    fixed.push(nearestFreeSpot(item, fixed, cols, rowWeight))
  }
  return fixed
}

/**
 * Place libre la plus proche de la place d'un bloc (distance à vol d'oiseau, `rowWeight` : hauteur
 * d'une ligne comptée en colonnes). Il y en a toujours une, au besoin sous les autres blocs.
 */
function nearestFreeSpot(
  item: GridItem,
  fixed: readonly GridItem[],
  cols: number,
  rowWeight: number
): GridItem {
  const w = Math.min(item.w, cols)
  const lastRow = Math.max(layoutBottom(fixed), item.y)
  let best: GridItem | null = null
  let bestScore = Infinity
  for (let y = 0; y <= lastRow; y++) {
    const dy = (y - item.y) * rowWeight
    // Plus loin en hauteur que la meilleure place trouvée : inutile de chercher sur cette ligne
    if (dy * dy >= bestScore && y > item.y) break
    for (let x = 0; x <= cols - w; x++) {
      const dx = x - item.x
      // À égalité, la place la plus haute, puis la moins décalée sur le côté
      const score = dx * dx + dy * dy
      if (score >= bestScore) continue
      const candidate = { ...item, x, y, w }
      if (fixed.some((other) => collides(other, candidate))) continue
      best = candidate
      bestScore = score
    }
  }
  return best ?? { ...item, x: Math.min(item.x, cols - w), y: lastRow, w }
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

/** Résultat d'un déplacement : disposition au relâchement, et blocs qui bougeront. */
export interface MovePlan {
  layout: GridItem[]
  moved: string[]
}

/**
 * Où vont les blocs gênés quand `id` est posé sur `target` (déplacement ou redimensionnement) :
 * chacun, du plus grand au plus petit, va à la place libre la plus proche de sa place d'origine
 * (la place libérée par le bloc déplacé en fait partie). `rowWeight` : hauteur d'une ligne
 * comptée en colonnes, pour mesurer les distances comme à l'écran. Rien ne bouge avant le
 * relâchement : la grille affiche ce plan en aperçu.
 */
export function planMove(
  layout: readonly GridItem[],
  id: string,
  target: GridItem,
  cols: number,
  auto: boolean,
  rowWeight = 1
): MovePlan {
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
    for (const item of blocked) fixed.push(nearestFreeSpot(item, fixed, cols, rowWeight))
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
