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
  /** Blocs qui occupent un écran entier : ligne où l'écran suivant commence. */
  screenBlocks: Record<string, number>
}

export const usePageScreensStore = create<PageScreensState>(() => ({
  rowStep: 0,
  rows: [],
  screenBlocks: {}
}))

/** Positions de défilement des écrans de la page (px), en commençant par le haut (0). */
export function screenStops(): number[] {
  const { rowStep, rows } = usePageScreensStore.getState()
  return rowStep ? [0, ...rows.map((row) => row * rowStep)] : []
}

/** Écran suivant (`1`) ou précédent (`-1`) de la page, depuis la position `top` (px). */
export function nextScreen(top: number, direction: 1 | -1, maxTop: number): number | null {
  const stops = [...screenStops(), maxTop].filter((stop) => stop <= maxTop)
  if (direction > 0) return stops.find((stop) => stop > top + 1) ?? null
  return [...stops].reverse().find((stop) => stop < top - 1) ?? null
}
