import { create } from 'zustand'

/** Fenêtres de gestion des pages, ouvertes depuis le menu latéral ou les onglets. */
interface PageDialogsState {
  dialog: { kind: 'rename' | 'delete'; pageId: string } | null
  openRename: (pageId: string) => void
  openDelete: (pageId: string) => void
  close: () => void
}

export const usePageDialogsStore = create<PageDialogsState>()((set) => ({
  dialog: null,
  openRename: (pageId) => set({ dialog: { kind: 'rename', pageId } }),
  openDelete: (pageId) => set({ dialog: { kind: 'delete', pageId } }),
  close: () => set({ dialog: null })
}))
