import { create } from 'zustand'

export const SETTINGS_SECTIONS = [
  'general',
  'appearance',
  'notifications',
  'applications',
  'about'
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

/**
 * Vue affichée dans la zone principale.
 * - `page` : une page de widgets (seule la page principale existe pour l'instant)
 * - `settings` : les paramètres, ouverts sur une section
 * Les onglets d'applications (Discord…) s'ajouteront ici à l'étape 7.
 */
export type View = { type: 'page'; pageId: string } | { type: 'settings'; section: SettingsSection }

export const HOME_PAGE_ID = 'home'

interface NavigationState {
  view: View
  navigate: (view: View) => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  view: { type: 'page', pageId: HOME_PAGE_ID },
  navigate: (view) => set({ view })
}))
