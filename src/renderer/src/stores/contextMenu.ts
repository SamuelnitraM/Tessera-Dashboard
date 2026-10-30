import { create } from 'zustand'
import type { LucideIcon } from 'lucide-react'

/** Entrée d'un menu du clic droit. */
export interface MenuAction {
  label: string
  icon?: LucideIcon
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type MenuItem = MenuAction | 'separator'

interface ContextMenuState {
  menu: { x: number; y: number; items: MenuItem[] } | null
  open: (x: number, y: number, items: MenuItem[]) => void
  close: () => void
}

/** Menu du clic droit de l'interface (un seul ouvert à la fois). */
export const useContextMenuStore = create<ContextMenuState>()((set) => ({
  menu: null,
  open: (x, y, items) => set({ menu: { x, y, items } }),
  close: () => set({ menu: null })
}))

/** Entrées ajoutées à tout menu ouvert dans un bloc (« Retirer le bloc »), par bloc. */
const blockItems = new Map<string, () => MenuItem[]>()

/** Entrées du bloc ajoutées aux menus ouverts dans son contenu ; renvoie de quoi les retirer. */
export function registerBlockMenu(blockId: string, items: () => MenuItem[]): () => void {
  blockItems.set(blockId, items)
  return () => {
    if (blockItems.get(blockId) === items) blockItems.delete(blockId)
  }
}

/**
 * Menu ouvert dans un bloc (`element` en fait partie) : les entrées du bloc s'ajoutent à la fin,
 * sauf si elles y sont déjà (menu du bloc lui-même).
 */
export function withBlockItems(items: MenuItem[], element: Element | null): MenuItem[] {
  const id = element?.closest<HTMLElement>('[data-block-id]')?.dataset.blockId
  const extra = id ? blockItems.get(id)?.() : undefined
  if (!extra?.length) return items
  const labels = new Set(items.map((item) => (item === 'separator' ? '' : item.label)))
  const missing = extra.filter((item) => item !== 'separator' && !labels.has(item.label))
  return missing.length ? [...items, 'separator', ...missing] : items
}

/**
 * Gestionnaire de clic droit : `onContextMenu={openContextMenu(items)}`.
 * Les champs de saisie gardent le menu de Windows (copier, coller…). Dans un bloc, le menu
 * propose aussi de retirer le bloc.
 */
export function openContextMenu(items: MenuItem[] | (() => MenuItem[])) {
  return (event: React.MouseEvent): void => {
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, [contenteditable="true"]')) return
    event.preventDefault()
    event.stopPropagation()
    const list = typeof items === 'function' ? items() : items
    useContextMenuStore
      .getState()
      .open(event.clientX, event.clientY, withBlockItems(list, event.currentTarget as Element))
  }
}

/** Menu sous un bouton (liste déroulante) : `onClick={openMenuBelow(items)}`. */
export function openMenuBelow(items: MenuItem[] | (() => MenuItem[])) {
  return (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    useContextMenuStore
      .getState()
      .open(rect.left, rect.bottom + 4, typeof items === 'function' ? items() : items)
  }
}
