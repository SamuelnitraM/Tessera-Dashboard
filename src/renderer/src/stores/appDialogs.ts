import { create } from 'zustand'

/** Confirmation de suppression d'une application, ouverte depuis le menu latéral ou les onglets. */
interface AppDialogsState {
  deleteAppId: string | null
  openDelete: (appId: string) => void
  close: () => void
}

export const useAppDialogsStore = create<AppDialogsState>()((set) => ({
  deleteAppId: null,
  openDelete: (appId) => set({ deleteAppId: appId }),
  close: () => set({ deleteAppId: null })
}))
