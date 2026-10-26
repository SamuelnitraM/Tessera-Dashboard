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

/**
 * Gestionnaire de clic droit : `onContextMenu={openContextMenu(items)}`.
 * Les champs de saisie gardent le menu de Windows (copier, coller…).
 */
export function openContextMenu(items: MenuItem[] | (() => MenuItem[])) {
  return (event: React.MouseEvent): void => {
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, [contenteditable="true"]')) return
    event.preventDefault()
    event.stopPropagation()
    useContextMenuStore
      .getState()
      .open(event.clientX, event.clientY, typeof items === 'function' ? items() : items)
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
