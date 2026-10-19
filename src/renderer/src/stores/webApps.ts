import { create } from 'zustand'

/**
 * État des applications web pendant que l'app tourne (non sauvegardé) :
 * messages non lus, lus dans le titre de chaque onglet.
 */
interface WebAppsState {
  badges: Record<string, number | '•' | null>
  setBadge: (appId: string, badge: number | '•' | null) => void
}

export const useWebAppsStore = create<WebAppsState>()((set) => ({
  badges: {},
  setBadge: (appId, badge) =>
    set((state) =>
      state.badges[appId] === badge ? state : { badges: { ...state.badges, [appId]: badge } }
    )
}))
