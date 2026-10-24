import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type {
  BridgeEventName,
  ModuleInstalledApp,
  ModuleMailAccount,
  ModuleMailSnapshot,
  ModuleMediaSnapshot
} from '../../../src/shared/module-bridge'
import type { ExternalPlayer, LocalMediaFile } from '../../../src/shared/local-media'
import {
  DEFAULT_QUERY,
  type MailAccountState,
  type MailAction,
  type MailDraft,
  type MailFolder,
  type MailMessage,
  type MailPage,
  type MailQuery,
  type MailUpload
} from '../../../src/shared/mail'
import type {
  MediaStatus,
  TwitchChannel,
  TwitchStream,
  YouTubeAccount,
  YouTubePlaylist,
  YouTubeSearch,
  YouTubeVideo
} from '../../../src/shared/media'
import { getBridge } from './bridge'

/**
 * API de Tessera qui donnent accès aux comptes et aux fichiers de l'utilisateur : mails,
 * YouTube et Twitch, vidéos du PC, applications installées. Chacune demande sa permission ;
 * sans elle, les appels échouent avec le code `permission` et les listes restent vides.
 */

const call = <T>(method: string, ...args: unknown[]): Promise<T> =>
  getBridge().call<T>(method, ...args)

/**
 * Donnée suivie en direct : lue une fois, puis mise à jour à chaque événement de Tessera.
 * Partagée par tous les composants du bloc qui l'utilisent.
 */
function liveValue<T>(
  method: string,
  event: BridgeEventName,
  initial: T
): { subscribe: (listener: () => void) => () => void; get: () => T } {
  let value = initial
  let loaded = false
  const listeners = new Set<() => void>()
  const set = (next: T): void => {
    value = next
    for (const listener of listeners) listener()
  }
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    if (!loaded) {
      loaded = true
      getBridge().on(event, (next) => set(next as T))
      // Sans la permission : la valeur initiale (liste vide) reste affichée
      call<T>(method).then(set, () => {})
    }
    return () => listeners.delete(listener)
  }
  return { subscribe, get: () => value }
}

// ---------------------------------------------------------------------------
// Mails (permission `mail`)
// ---------------------------------------------------------------------------

/**
 * Mails des comptes de l'utilisateur (Paramètres → Comptes). Nécessite
 * `"permissions": ["mail"]`. Les erreurs portent un code lisible avec `getMailErrorCode(error)`.
 */
export interface PluginMail {
  /** Dossiers et libellés du compte (boîte de réception, envoyés, libellés Gmail…). */
  folders: (accountId: string) => Promise<MailFolder[]>
  /** Mails d'un dossier, filtrés et recherchés ; `page` : `next` de la page d'avant. */
  list: (accountId: string, query?: MailQuery, page?: string | null) => Promise<MailPage>
  /** Mail complet. Son HTML n'est pas nettoyé : à nettoyer avant de l'afficher. */
  get: (accountId: string, id: string) => Promise<MailMessage>
  act: (accountId: string, id: string, action: MailAction) => Promise<void>
  send: (accountId: string, draft: MailDraft) => Promise<void>
  /** Fichiers à joindre, choisis dans la fenêtre de Windows ([] si annulé). */
  pickUploads: () => Promise<MailUpload[]>
  /** Enregistre une pièce jointe où l'utilisateur le choisit (`false` si annulé). */
  saveAttachment: (accountId: string, id: string, index: number) => Promise<boolean>
  /** Vérifie les nouveaux mails tout de suite. */
  checkNow: (accountId: string) => Promise<void>
  /** Reconnecte un compte Gmail (page de connexion dans le navigateur). */
  reconnect: (accountId: string) => Promise<void>
  /** Ouvre un lien d'un mail dans le navigateur par défaut (http, https, mailto). */
  openLink: (url: string) => Promise<void>
}

const mail: PluginMail = {
  folders: (accountId) => call('mail.folders', accountId),
  list: (accountId, query = DEFAULT_QUERY, page = null) =>
    call('mail.list', accountId, query, page),
  get: (accountId, id) => call('mail.get', accountId, id),
  act: (accountId, id, action) => call('mail.act', accountId, id, action),
  send: (accountId, draft) => call('mail.send', accountId, draft),
  pickUploads: () => call('mail.pickUploads'),
  saveAttachment: (accountId, id, index) => call('mail.saveAttachment', accountId, id, index),
  checkNow: (accountId) => call('mail.checkNow', accountId),
  reconnect: (accountId) => call('mail.reconnect', accountId),
  openLink: (url) => call('mail.openLink', url)
}

export function useMail(): PluginMail {
  return mail
}

/** Arrivées de mails par compte, comptées depuis le chargement du bloc. */
const arrivals: Record<string, number> = {}
let mailListening = false

const mailSnapshot = liveValue<ModuleMailSnapshot>('mail.accounts', 'mail:changed', {
  accounts: [],
  states: {}
})

/**
 * Comptes mail de l'utilisateur (identifiant, fournisseur, nom, adresse) et leur état (non lus,
 * erreur de connexion), à jour.
 */
export function useMailAccounts(): {
  accounts: ModuleMailAccount[]
  states: Record<string, MailAccountState>
} {
  return useSyncExternalStore(mailSnapshot.subscribe, mailSnapshot.get)
}

const arrivalListeners = new Set<() => void>()

/** Augmente à chaque arrivée de nouveaux mails sur le compte (pour recharger la liste). */
export function useMailArrivals(accountId: string): number {
  return useSyncExternalStore(
    (listener) => {
      if (!mailListening) {
        mailListening = true
        getBridge().on('mail:changed', (_snapshot, fresh) => {
          if (typeof fresh !== 'string') return
          arrivals[fresh] = (arrivals[fresh] ?? 0) + 1
          for (const notify of arrivalListeners) notify()
        })
      }
      arrivalListeners.add(listener)
      return () => arrivalListeners.delete(listener)
    },
    () => arrivals[accountId] ?? 0
  )
}

// ---------------------------------------------------------------------------
// YouTube et Twitch (permission `media`)
// ---------------------------------------------------------------------------

/**
 * Comptes YouTube et Twitch de l'utilisateur, en lecture seule. `account` : identifiant d'un
 * compte YouTube (`useYouTubeAccounts`) ; vide : le premier compte.
 */
export interface PluginMedia {
  /** Dernières vidéos des chaînes abonnées (`refresh` : sans cache). */
  youtubeFeed: (account: string, refresh?: boolean) => Promise<YouTubeVideo[]>
  youtubePlaylists: (account: string) => Promise<YouTubePlaylist[]>
  /** Vidéos d'une playlist (`'liked'` : vidéos aimées). */
  youtubePlaylist: (account: string, id: string) => Promise<YouTubeVideo[]>
  /** Recherche de vidéos (quota limité par jour : erreur `quota`). */
  youtubeSearch: (account: string, query: string, page?: string | null) => Promise<YouTubeSearch>
  /** Recherche de chaînes Twitch (celles en direct d'abord). */
  twitchSearch: (query: string) => Promise<TwitchChannel[]>
  /** Chaînes Twitch suivies en direct (dernière vérification). */
  twitchLive: () => Promise<TwitchStream[]>
  /** Vérifie tout de suite les directs. */
  twitchRefresh: () => Promise<TwitchStream[]>
}

const media: PluginMedia = {
  youtubeFeed: (account, refresh = false) => call('media.youtubeFeed', account, refresh),
  youtubePlaylists: (account) => call('media.youtubePlaylists', account),
  youtubePlaylist: (account, id) => call('media.youtubePlaylist', account, id),
  youtubeSearch: (account, query, page = null) => call('media.youtubeSearch', account, query, page),
  twitchSearch: (query) => call('media.twitchSearch', query),
  twitchLive: () => call('media.twitchLive'),
  twitchRefresh: () => call('media.twitchRefresh')
}

export function useMedia(): PluginMedia {
  return media
}

const mediaSnapshot = liveValue<ModuleMediaSnapshot>('media.status', 'media:changed', {
  status: {
    youtube: { connected: false, name: null, error: null, errors: {} },
    twitch: { connected: false, name: null, error: null }
  },
  youtubeAccounts: [],
  live: []
})

/** Comptes YouTube connectés (photo, nom, adresse) et leur erreur de connexion, à jour. */
export function useYouTubeAccounts(): (YouTubeAccount & { error: string | null })[] {
  return useSyncExternalStore(mediaSnapshot.subscribe, mediaSnapshot.get).youtubeAccounts
}

/** Comptes YouTube et Twitch connectés (et erreur de connexion), à jour. */
export function useMediaStatus(): MediaStatus {
  return useSyncExternalStore(mediaSnapshot.subscribe, mediaSnapshot.get).status
}

/** Directs Twitch, mis à jour à chaque vérification de Tessera. */
export function useTwitchLive(): TwitchStream[] {
  return useSyncExternalStore(mediaSnapshot.subscribe, mediaSnapshot.get).live
}

// ---------------------------------------------------------------------------
// Vidéos et musiques du PC (permission `videos`)
// ---------------------------------------------------------------------------

/**
 * Vidéos et musiques du PC choisies par l'utilisateur (permission `videos`). Chaque fichier a un
 * identifiant ; `localMediaUrl(id)` donne l'adresse à mettre dans un `<video>` ou un `<audio>`.
 * Pas de dépôt de fichier : un bloc isolé ne connaît pas le chemin d'un fichier déposé.
 */
export interface PluginLocalMedia {
  /** Fenêtre de Windows « Ouvrir » ; `null` si l'utilisateur annule. */
  open: () => Promise<LocalMediaFile | null>
  /** Fichiers ouverts récemment, le plus récent d'abord (position de lecture comprise). */
  recent: () => Promise<LocalMediaFile[]>
  get: (id: string) => Promise<LocalMediaFile | null>
  /** Retire un fichier des récents (il n'est plus lisible sans être choisi de nouveau). */
  forget: (id: string) => Promise<void>
  /** VLC est-il installé ? */
  hasVlc: () => Promise<boolean>
  /** Ouvre le fichier dans VLC à `position` (s), ou à défaut dans le lecteur de Windows. */
  openExternally: (id: string, position: number) => Promise<ExternalPlayer>
}

const localMedia: PluginLocalMedia = {
  open: () => call('videos.open'),
  recent: () => call('videos.recent'),
  get: (id) => call('videos.get', id),
  forget: (id) => call('videos.forget', id),
  hasVlc: () => call('videos.hasVlc'),
  openExternally: (id, position) => call('videos.openExternally', id, position)
}

export function useLocalMedia(): PluginLocalMedia {
  return localMedia
}

// ---------------------------------------------------------------------------
// Applications installées (permission `apps`)
// ---------------------------------------------------------------------------

const appsList = liveValue<ModuleInstalledApp[]>('apps.list', 'apps:changed', [])

/** Applications installées de l'utilisateur (Paramètres → Applications), à jour. */
export function useInstalledApps(): readonly ModuleInstalledApp[] {
  return useSyncExternalStore(appsList.subscribe, appsList.get)
}

// ---------------------------------------------------------------------------
// Notifications cliquées (permission `notifications`)
// ---------------------------------------------------------------------------

/**
 * Clic sur une notification du module qui désigne quelque chose (`target` de `notify`) :
 * `onOpen` le reçoit, même si le clic précède l'affichage du bloc. Un seul bloc le reçoit.
 */
export function useNotificationTarget(onOpen: (target: string) => void): void {
  const onOpenRef = useRef(onOpen)
  useLayoutEffect(() => {
    onOpenRef.current = onOpen
  })
  useEffect(() => {
    const take = (): void => {
      call<string | null>('notifications.takeTarget').then(
        (target) => target && onOpenRef.current(target),
        () => {}
      )
    }
    take()
    return getBridge().on('notification:target', take)
  }, [])
}
