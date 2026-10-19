import { create } from 'zustand'
import { MAIN_PAGE_ID } from '@shared/dashboard'

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
 * - `page` : une page de widgets
 * - `settings` : les paramètres, ouverts sur une section
 * Les onglets d'applications (Discord…) s'ajouteront ici à l'étape 7.
 */
export type View = { type: 'page'; pageId: string } | { type: 'settings'; section: SettingsSection }

interface NavigationState {
  view: View
  /** Mode édition de la page affichée (déplacer, redimensionner, ajouter des widgets). */
  editing: boolean
  /** Change de vue. Quitte toujours le mode édition. */
  navigate: (view: View) => void
  setEditing: (editing: boolean) => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  view: { type: 'page', pageId: MAIN_PAGE_ID },
  editing: false,
  navigate: (view) => set({ view, editing: false }),
  setEditing: (editing) => set({ editing })
}))
