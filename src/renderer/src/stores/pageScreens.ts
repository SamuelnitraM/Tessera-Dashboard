import { create } from 'zustand'
import type { GridItem } from '@shared/dashboard'

/**
 * Découpage de la page en « écrans » : un écran fait `screenRows` lignes de la grille (12 par
 * défaut, Paramètres → Apparence), la hauteur de la zone visible de la page (disposition
 * large). Une limite d'écran coupée par un bloc ne compte plus : la molette ne s'y cale pas, les
 * boutons d'écran la sautent.
 */

/** Aimantation : la page arrêtée à moins de ce nombre de lignes d'une limite s'y cale. */
export const SNAP_ROWS = 2

/** Limite d'écran (en lignes), et bloc qui la coupe s'il y en a un. */
export interface ScreenLine {
  row: number
  cut: boolean
}

/** Limites d'écran d'une disposition, jusqu'à la ligne `rows` (non comprise). */
export function screenLines(
  layout: readonly GridItem[],
  rows: number,
  screenRows: number
): ScreenLine[] {
  const lines: ScreenLine[] = []
  for (let row = screenRows; row < rows; row += screenRows) {
    lines.push({ row, cut: layout.some((item) => item.y < row && item.y + item.h > row) })
  }
  return lines
}

/** Le bloc occupe un écran entier : toute la largeur, un écran de haut, au début d'un écran. */
export const fillsScreen = (item: GridItem, cols: number, screenRows: number): boolean =>
  item.x === 0 && item.w >= cols && item.h === screenRows && item.y % screenRows === 0

interface PageScreensState {
  /** Hauteur d'une ligne plus l'espace qui la suit (px) ; 0 : pas d'écrans (disposition compacte). */
  rowStep: number
  /** Limites d'écran où la page peut se caler (en lignes), sans les limites coupées. */
  rows: number[]
  /** Toutes les limites d'écran (pointillés du mode édition), coupées par un bloc comprises. */
  allRows: number[]
  /** Blocs qui occupent un écran entier : ligne où l'écran suivant commence. */
  screenBlocks: Record<string, number>
}

export const usePageScreensStore = create<PageScreensState>(() => ({
  rowStep: 0,
  rows: [],
  allRows: [],
  screenBlocks: {}
}))

/** Positions de défilement des écrans de la page (px), en commençant par le haut (0). */
export function screenStops(): number[] {
  const { rowStep, rows } = usePageScreensStore.getState()
  return rowStep ? [0, ...rows.map((row) => row * rowStep)] : []
}

/**
 * Débuts des écrans de la zone qui défile (px), pour les raccourcis : chaque limite d'écran,
 * aimantée ou non, puis le bas de la page. Disposition compacte : une hauteur de zone à la fois.
 */
function allScreenStops(area: HTMLElement): number[] {
  const { rowStep, allRows } = usePageScreensStore.getState()
  const max = Math.max(0, area.scrollHeight - area.clientHeight)
  const stops: number[] = []
  if (rowStep) stops.push(0, ...allRows.map((row) => row * rowStep))
  else for (let top = 0; top < max; top += area.clientHeight || max) stops.push(top)
  const inside = stops.filter((stop) => stop < max - 1)
  return [...(inside.length ? inside : [0]), ...(max > 1 ? [max] : [])]
}

/** Défilement en cours vers un écran (raccourci), de `from` à `to` (px). */
let heading: { area: HTMLElement; from: number; to: number; at: number } | null = null
/** Au-delà, le défilement doux est forcément fini (ou interrompu). */
const HEADING_MS = 1500

/**
 * Raccourci d'écran : suivant (`next`), précédent (`previous`) ou écran `n` (1 à 9, le dernier
 * s'il y en a moins) de la page affichée. Pendant le défilement vers un écran, le suivant part de
 * cet écran : on enchaîne les écrans sans attendre la fin de l'animation.
 */
export function goToScreen(target: 'next' | 'previous' | number): void {
  const area = document.querySelector<HTMLElement>('[data-page-scroller]')
  if (!area) return
  const stops = allScreenStops(area)
  const current = area.scrollTop
  const moving =
    heading &&
    heading.area === area &&
    Date.now() - heading.at < HEADING_MS &&
    current >= Math.min(heading.from, heading.to) - 2 &&
    current <= Math.max(heading.from, heading.to) + 2 &&
    Math.abs(current - heading.to) > 1
  const top = moving && heading ? heading.to : current
  const next =
    target === 'next'
      ? stops.find((stop) => stop > top + 1)
      : target === 'previous'
        ? [...stops].reverse().find((stop) => stop < top - 1)
        : stops[Math.min(target, stops.length) - 1]
  if (next === undefined) return
  heading = { area, from: current, to: next, at: Date.now() }
  area.scrollTo({ top: next, behavior: 'smooth' })
}

/** Écran suivant (`1`) ou précédent (`-1`) de la page, depuis la position `top` (px). */
export function nextScreen(top: number, direction: 1 | -1, maxTop: number): number | null {
  const stops = [...screenStops(), maxTop].filter((stop) => stop <= maxTop)
  if (direction > 0) return stops.find((stop) => stop > top + 1) ?? null
  return [...stops].reverse().find((stop) => stop < top - 1) ?? null
}
