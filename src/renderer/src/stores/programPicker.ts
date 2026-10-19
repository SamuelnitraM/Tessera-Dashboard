import { create } from 'zustand'
import type { DesktopApp } from '@shared/desktop-apps'

interface ProgramPickerState {
  /** Fenêtre ouverte : fonction qui rend l'application choisie (ou `null`). */
  resolve: ((app: DesktopApp | null) => void) | null
}

export const useProgramPickerStore = create<ProgramPickerState>()(() => ({ resolve: null }))

/**
 * Ouvre la fenêtre d'ajout d'une application installée (programmes du menu Démarrer, ou un
 * .exe au choix). Renvoie l'application ajoutée, ou `null` si l'utilisateur annule.
 */
export function pickInstalledApp(): Promise<DesktopApp | null> {
  useProgramPickerStore.getState().resolve?.(null)
  return new Promise((resolve) => useProgramPickerStore.setState({ resolve }))
}
