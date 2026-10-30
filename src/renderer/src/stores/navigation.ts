import { create } from 'zustand'
import { MAIN_PAGE_ID } from '@shared/dashboard'
import { ownsPage } from './windowPages'

export const SETTINGS_SECTIONS = [
  'general',
  'appearance',
  'notifications',
  'accounts',
  'applications',
  'extensions',
  'shortcuts',
  'about'
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

/**
 * Vue affichée dans la zone principale.
 * - `page` : une page de widgets
 * - `app` : l'onglet d'une application web (Discord…)
 * - `settings` : les paramètres, ouverts sur une section
 */
export type View =
  | { type: 'page'; pageId: string }
  | { type: 'app'; appId: string }
  | { type: 'settings'; section: SettingsSection }

interface NavigationState {
  view: View
  /** Mode édition de la page affichée (déplacer, redimensionner, ajouter des widgets). */
  editing: boolean
  /**
   * Applications déjà ouvertes : leur onglet reste chargé en arrière-plan
   * (Discord ne se recharge pas à chaque visite et continue de recevoir les messages).
   */
  openedApps: string[]
  /**
   * Change de vue. Quitte toujours le mode édition. Une page d'une autre fenêtre s'ouvre dans
   * celle-ci, qui passe devant.
   */
  navigate: (view: View) => void
  setEditing: (editing: boolean) => void
  /** Ferme l'onglet d'une application (sa page est déchargée). */
  closeApp: (appId: string) => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  view: { type: 'page', pageId: MAIN_PAGE_ID },
  editing: false,
  openedApps: [],
  navigate: (view) => {
    if (view.type === 'page' && !ownsPage(view.pageId)) {
      void window.tessera.windows.showPage(view.pageId)
      return
    }
    set((state) => ({
      view,
      editing: false,
      openedApps:
        view.type === 'app' && !state.openedApps.includes(view.appId)
          ? [...state.openedApps, view.appId]
          : state.openedApps
    }))
  },
  setEditing: (editing) => set({ editing }),
  closeApp: (appId) =>
    set((state) => ({
      openedApps: state.openedApps.filter((id) => id !== appId),
      view:
        state.view.type === 'app' && state.view.appId === appId
          ? { type: 'page', pageId: MAIN_PAGE_ID }
          : state.view
    }))
}))
