import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type {
  MediaStatus,
  QueueItem,
  TwitchChannel,
  TwitchStream,
  YouTubeAccount,
  YouTubePlaylist,
  YouTubeSearch,
  YouTubeVideo
} from '@shared/media'
import { useMediaStore } from '../stores/media'
import { useMediaStatusStore } from '../stores/mediaStatus'
import { useSettingsStore } from '../stores/settings'
import { useNavigationStore } from '../stores/navigation'
import { PluginContext } from './context'

/** Le lecteur joue-t-il (son ou vidéo en cours) ? */
export function useMediaPlaying(id: string): boolean {
  return useMediaStore((state) => state.sessions[id]?.playing ?? false)
}

/** Ferme le lecteur (le bloc revient à son état sans lecture). */
export const closeMediaView = (id: string): void => useMediaStore.getState().close(id)

// ---------------------------------------------------------------------------
// Comptes YouTube et Twitch (permission `media`)
// ---------------------------------------------------------------------------

/**
 * Comptes YouTube et Twitch. `account` : identifiant d'un compte YouTube (`useYouTubeAccounts`) ;
 * vide ou inconnu : le premier compte.
 */
export interface PluginMedia {
  /** Dernières vidéos des chaînes abonnées (`refresh` : sans cache). */
  youtubeFeed: (account: string, refresh?: boolean) => Promise<YouTubeVideo[]>
  youtubePlaylists: (account: string) => Promise<YouTubePlaylist[]>
  /** Vidéos d'une playlist (`'liked'` : vidéos aimées). */
  youtubePlaylist: (account: string, id: string) => Promise<YouTubeVideo[]>
  /**
   * Recherche de vidéos (`page` : `next` de la page d'avant). L'API YouTube limite le nombre
   * de recherches par jour (erreur `quota`).
   */
  youtubeSearch: (account: string, query: string, page?: string | null) => Promise<YouTubeSearch>
  /** Recherche de chaînes Twitch (celles en direct d'abord). */
  twitchSearch: (query: string) => Promise<TwitchChannel[]>
  /** Chaînes Twitch suivies en direct (dernière vérification). */
  twitchLive: () => Promise<TwitchStream[]>
  /** Vérifie tout de suite les directs. */
  twitchRefresh: () => Promise<TwitchStream[]>
}

function keepLive(live: TwitchStream[]): TwitchStream[] {
  useMediaStatusStore.setState({ live })
  return live
}

export function useMedia(): PluginMedia {
  const pluginId = useContext(PluginContext)?.id
  return useMemo(() => {
    if (!pluginId) throw new Error('useMedia doit être utilisé dans un widget.')
    const api = window.tessera.media
    return {
      youtubeFeed: (account, refresh = false) => api.youtubeFeed(pluginId, account, refresh),
      youtubePlaylists: (account) => api.youtubePlaylists(pluginId, account),
      youtubePlaylist: (account, id) => api.youtubePlaylist(pluginId, account, id),
      youtubeSearch: (account, query, page = null) =>
        api.youtubeSearch(pluginId, account, query, page),
      twitchSearch: (query) => api.twitchSearch(pluginId, query),
      // Les directs reçus mettent aussi à jour `useTwitchLive()`
      twitchLive: () => api.twitchLive(pluginId).then(keepLive),
      twitchRefresh: () => api.twitchRefresh(pluginId).then(keepLive)
    }
  }, [pluginId])
}

/** Comptes YouTube connectés (photo, nom, adresse) et leur erreur de connexion, à jour. */
export function useYouTubeAccounts(): (YouTubeAccount & { error: string | null })[] {
  const accounts = useSettingsStore((state) => state.settings.media.youtubeAccounts)
  const errors = useMediaStatusStore((state) => state.status.youtube.errors)
  return useMemo(
    () => accounts.map((account) => ({ ...account, error: errors[account.id] ?? null })),
    [accounts, errors]
  )
}

/** Comptes YouTube et Twitch connectés (et erreur de connexion), à jour. */
export function useMediaStatus(): MediaStatus {
  return useMediaStatusStore((state) => state.status)
}

/** Directs Twitch, mis à jour à chaque vérification (sans rien demander). */
export function useTwitchLive(): TwitchStream[] {
  return useMediaStatusStore((state) => state.live)
}

/** Ouvre Paramètres → Comptes (« Se connecter avec Google / Twitch »). */
export function openMediaSettings(): void {
  useNavigationStore.getState().navigate({ type: 'settings', section: 'accounts' })
}

/**
 * Clic sur une notification de l'extension qui désigne quelque chose (`target`, ex. la chaîne
 * Twitch d'un direct) : `onOpen` le reçoit, même si la demande précède l'affichage du bloc.
 */
export function useNotificationTarget(onOpen: (target: string) => void): void {
  const pluginId = useContext(PluginContext)?.id
  const onOpenRef = useRef(onOpen)
  useLayoutEffect(() => {
    onOpenRef.current = onOpen
  })
  useEffect(() => {
    if (!pluginId) return
    const handle = (): void => {
      const request = useMediaStatusStore.getState().target
      if (!request || request.pluginId !== pluginId) return
      useMediaStatusStore.setState({ target: null })
      onOpenRef.current(request.target)
    }
    handle()
    return useMediaStatusStore.subscribe(handle)
  }, [pluginId])
}

/**
 * File « À suivre » d'un lecteur : la vidéo suivante démarre à la fin de la vidéo en cours
 * (même en mini-lecteur). `current` : vidéo en cours (son lien change quand la file avance).
 */
export function useMediaQueue(id: string): {
  queue: QueueItem[]
  current: { link: string | null; title: string } | null
  enqueue: (item: QueueItem) => void
  unqueue: (index: number) => void
  clear: () => void
  next: () => boolean
} {
  const session = useMediaStore((state) => state.sessions[id])
  return useMemo(() => {
    const store = useMediaStore.getState()
    return {
      queue: session?.queue ?? [],
      current: session ? { link: session.link, title: session.title } : null,
      enqueue: (item) => store.enqueue(id, item),
      unqueue: (index) => store.unqueue(id, index),
      clear: () => store.clearQueue(id),
      next: () => store.playNext(id)
    }
  }, [id, session])
}

/**
 * « Revenir au bloc » dans le mini-lecteur : le bloc doit réafficher sa vidéo (`onReveal`),
 * même si la demande précède son affichage.
 */
export function useMediaReveal(id: string, onReveal: () => void): void {
  const onRevealRef = useRef(onReveal)
  useLayoutEffect(() => {
    onRevealRef.current = onReveal
  })
  useEffect(() => {
    const handle = (): void => {
      const request = useMediaStore.getState().reveal
      if (!request || request.id !== id) return
      useMediaStore.setState({ reveal: null })
      onRevealRef.current()
    }
    handle()
    return useMediaStore.subscribe(handle)
  }, [id])
}
