import { create } from 'zustand'
import type { MediaStatus, TwitchStream } from '@shared/media'

/**
 * Comptes YouTube et Twitch (connexion, erreur) et directs Twitch, suivis par le processus
 * principal ; et cible d'une notification d'extension cliquée (chaîne d'un direct…).
 */
interface MediaStatusStore {
  status: MediaStatus
  live: TwitchStream[]
  target: { pluginId: string; target: string } | null
}

export const useMediaStatusStore = create<MediaStatusStore>()(() => ({
  status: {
    youtube: { connected: false, name: null, error: null, errors: {} },
    twitch: { connected: false, name: null, error: null }
  },
  live: [],
  target: null
}))

export async function initMediaStatusStore(): Promise<void> {
  useMediaStatusStore.setState({ status: await window.tessera.media.getStatus() })
  window.tessera.media.onStatus((status) => useMediaStatusStore.setState({ status }))
  window.tessera.media.onLive((live) => useMediaStatusStore.setState({ live }))
}
