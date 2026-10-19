import { useSettingsStore } from '../stores/settings'

/** Application web de l'utilisateur (Paramètres → Applications). */
export interface UserWebApp {
  id: string
  name: string
  url: string
  icon: string | null
}

/** Applications web de l'utilisateur, pour proposer d'en afficher une dans un widget. */
export function useWebApps(): readonly UserWebApp[] {
  return useSettingsStore((state) => state.settings.apps.items)
}
