import { GRID } from '@shared/dashboard'
import {
  colsFor,
  getLayoutMode,
  normalizeLayout,
  planMove,
  resolveLayout,
  sameLayout
} from '../lib/grid'
import { getDefaultSize } from '../plugins/registry'
import { useDashboardStore } from '../stores/dashboard'

/**
 * Agrandit le bloc qui contient `element` pour que cet élément mesure au moins `size` (px CSS),
 * dans la limite de la largeur de la page. Les blocs voisins s'écartent comme lors d'un
 * redimensionnement à la souris. Ne réduit jamais le bloc.
 */
export function growBlockToFit(
  element: HTMLElement | null,
  size: { width: number; height: number }
): void {
  const block = element?.closest<HTMLElement>('[data-block-id]')
  const grid = block?.closest<HTMLElement>('.react-grid-layout')
  const id = block?.dataset.blockId
  if (!element || !block || !grid || !id) return
  const { dashboard, setLayout } = useDashboardStore.getState()
  const page = dashboard.pages.find((candidate) => candidate.widgets.some((w) => w.id === id))
  if (!page) return

  const mode = getLayoutMode(grid.clientWidth)
  const cols = colsFor(mode)
  const layout = resolveLayout(page, mode, (widget) => getDefaultSize(widget.type))
  const item = layout.find((candidate) => candidate.i === id)
  if (!item) return

  // Taille d'une case, d'après la taille actuelle du bloc
  const box = block.getBoundingClientRect()
  const inner = element.getBoundingClientRect()
  const gap = GRID.gap
  const cell = {
    width: (box.width - (item.w - 1) * gap) / item.w,
    height: (box.height - (item.h - 1) * gap) / item.h
  }
  const wanted = {
    width: box.width + Math.max(0, size.width - inner.width),
    height: box.height + Math.max(0, size.height - inner.height)
  }
  const w = Math.min(cols, Math.max(item.w, Math.ceil((wanted.width + gap) / (cell.width + gap))))
  const h = Math.max(item.h, Math.ceil((wanted.height + gap) / (cell.height + gap)))
  if (w === item.w && h === item.h) return

  const target = { ...item, x: Math.min(item.x, cols - w), w, h }
  const next = normalizeLayout(planMove(layout, id, target, cols, page.autoArrange).layout)
  if (!sameLayout(next, layout)) setLayout(page.id, mode, next)
}
