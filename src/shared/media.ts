/**
 * YouTube et Twitch : comptes connectés (sans aucun secret) et ce que les widgets affichent.
 *
 * YouTube se connecte avec Google (même connexion que Gmail si l'on coche les deux), Twitch
 * avec Twitch : boutons « Se connecter avec… » de Paramètres → Comptes.
 * Les jetons sont chiffrés par Windows avec les autres secrets (`secrets.json`).
 */

export interface MediaSettings {
  /** Application Twitch de l'utilisateur (Avancé) ; vide : celle de Tessera. */
  twitchClientId: string
  /** Comptes YouTube connectés (connexion Google), le premier par défaut dans les blocs. */
  youtubeAccounts: YouTubeAccount[]
  /** Compte Twitch connecté, ou `null`. */
  twitch: { userId: string; login: string; name: string } | null
  /** Vérification des chaînes Twitch suivies passées en direct, en minutes. */
  liveCheckMinutes: number
}

/** Compte YouTube (un par compte Google connecté avec YouTube). */
export interface YouTubeAccount {
  /** `youtube` (premier compte, étape 11) ou `youtube-<uuid>`. */
  id: string
  /** Chaîne du compte, ou `mine` s'il n'en a pas. */
  channelId: string
  /** Nom de la chaîne, ou du compte Google. */
  name: string
  email: string
  /** Photo du compte (adresse https), ou vide. */
  avatar: string
}

export const LIVE_CHECK_MINUTES = [1, 2, 3, 5, 10, 15] as const

export const DEFAULT_MEDIA_SETTINGS: MediaSettings = {
  twitchClientId: '',
  youtubeAccounts: [],
  twitch: null,
  liveCheckMinutes: 3
}

/** Vidéo YouTube (fil des abonnements, playlist, vidéos aimées). */
export interface YouTubeVideo {
  id: string
  title: string
  channelId: string
  channelTitle: string
  /** Publication (ms), ou `null` si inconnue. */
  published: number | null
  thumbnail: string
  /** Vues, si YouTube les donne. */
  views: number | null
  /** Durée (secondes), si YouTube la donne (résultats de recherche). */
  duration?: number | null
}

/** Résultats d'une recherche YouTube (`next` : page suivante, ou `null`). */
export interface YouTubeSearch {
  videos: YouTubeVideo[]
  next: string | null
}

/** Vidéo de la file « À suivre » d'un lecteur. */
export interface QueueItem {
  /** Lien de la vidéo (youtube.com/watch?v=…). */
  link: string
  title: string
  channel: string
  thumbnail: string
}

export interface YouTubePlaylist {
  id: string
  title: string
  thumbnail: string
  count: number
}

/** Chaîne Twitch suivie, en direct. */
export interface TwitchStream {
  login: string
  name: string
  title: string
  game: string
  viewers: number
  /** Début du direct (ms). */
  startedAt: number
  /** Image du direct (taille finale). */
  thumbnail: string
}

/** Chaîne Twitch trouvée par la recherche. */
export interface TwitchChannel {
  login: string
  name: string
  live: boolean
  title: string
  game: string
  /** Photo de la chaîne. */
  avatar: string
}

/** État des comptes, pour les widgets et les Paramètres. */
export interface MediaStatus {
  /** `connected` : au moins un compte. `errors` : erreur de connexion par compte. */
  youtube: {
    connected: boolean
    name: string | null
    error: string | null
    errors: Record<string, string>
  }
  twitch: { connected: boolean; name: string | null; error: string | null }
}

// ---------------------------------------------------------------------------
// Adresses des lecteurs
// ---------------------------------------------------------------------------

/** Ce qu'un lien YouTube ou Twitch désigne. */
export type MediaTarget =
  | { kind: 'youtube-video'; id: string; start: number }
  | { kind: 'youtube-playlist'; list: string; video: string | null }
  | { kind: 'twitch-channel'; login: string }
  | { kind: 'twitch-video'; id: string }

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const LIST_ID = /^[A-Za-z0-9_-]{2,64}$/
const TWITCH_LOGIN = /^[A-Za-z0-9_]{2,25}$/

function seconds(value: string | null): number {
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  return match
    ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
    : 0
}

/**
 * Lien collé par l'utilisateur -> vidéo, playlist ou chaîne. Accepte aussi un simple
 * identifiant de vidéo YouTube ou un nom de chaîne Twitch (`twitch` : préférence du bloc).
 */
export function parseMediaLink(input: string, prefer: 'youtube' | 'twitch'): MediaTarget | null {
  const value = input.trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value) && !value.includes('/') && !value.includes('.')) {
    if (prefer === 'twitch' && TWITCH_LOGIN.test(value)) {
      return { kind: 'twitch-channel', login: value.toLowerCase() }
    }
    if (prefer === 'youtube' && YT_ID.test(value))
      return { kind: 'youtube-video', id: value, start: 0 }
    return null
  }
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be' && YT_ID.test(parts[0] ?? '')) {
    return { kind: 'youtube-video', id: parts[0], start: seconds(url.searchParams.get('t')) }
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const list = url.searchParams.get('list')
    const video =
      url.searchParams.get('v') ??
      (['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] : null)
    if (list && LIST_ID.test(list)) {
      return { kind: 'youtube-playlist', list, video: video && YT_ID.test(video) ? video : null }
    }
    if (video && YT_ID.test(video)) {
      return { kind: 'youtube-video', id: video, start: seconds(url.searchParams.get('t')) }
    }
    return null
  }
  if (host === 'twitch.tv' || host === 'player.twitch.tv') {
    const channel = url.searchParams.get('channel')
    if (channel && TWITCH_LOGIN.test(channel)) {
      return { kind: 'twitch-channel', login: channel.toLowerCase() }
    }
    if (parts[0] === 'videos' && /^\d+$/.test(parts[1] ?? '')) {
      return { kind: 'twitch-video', id: parts[1] }
    }
    if (
      parts.length >= 1 &&
      TWITCH_LOGIN.test(parts[0]) &&
      !['directory', 'p'].includes(parts[0])
    ) {
      return { kind: 'twitch-channel', login: parts[0].toLowerCase() }
    }
  }
  return null
}

/**
 * Adresse du lecteur. YouTube : lecteur intégré sans cookies (pas de suivi), qui exige un site
 * d'origine (`MEDIA_REFERRER`). Twitch : lecteur ouvert directement (pas dans un cadre).
 */
export function playerUrl(target: MediaTarget, autoplay: boolean): string {
  const play = autoplay ? '1' : '0'
  switch (target.kind) {
    case 'youtube-video':
      return `https://www.youtube-nocookie.com/embed/${target.id}?autoplay=${play}&rel=0&start=${target.start}`
    case 'youtube-playlist':
      return target.video
        ? `https://www.youtube-nocookie.com/embed/${target.video}?list=${target.list}&autoplay=${play}&rel=0`
        : `https://www.youtube-nocookie.com/embed/videoseries?list=${target.list}&autoplay=${play}&rel=0`
    case 'twitch-channel':
      return `https://player.twitch.tv/?channel=${target.login}&parent=player.twitch.tv&autoplay=${autoplay}`
    case 'twitch-video':
      return `https://player.twitch.tv/?video=v${target.id}&parent=player.twitch.tv&autoplay=${autoplay}`
  }
}

/** Chat d'une chaîne Twitch (fenêtre « popout » : connexion à Twitch possible pour écrire). */
export const twitchChatUrl = (login: string, dark: boolean): string =>
  `https://www.twitch.tv/popout/${login}/chat?popout=${dark ? '&darkpopout' : ''}`

/** Site d'origine déclaré au lecteur YouTube (sans lui, « Erreur 153 »). */
export const MEDIA_REFERRER = 'https://github.com/SamuelnitraM/Tessera-Dashboard'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

const YOUTUBE_ID = /^youtube(-[a-z0-9-]{1,40})?$/

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export function sanitizeMediaSettings(input: unknown): MediaSettings {
  const raw = asRecord(input)
  const twitch = asRecord(raw.twitch)
  // Étape 11 : un seul compte, `youtube` (son jeton est enregistré sous l'identifiant `youtube`)
  const listed = Array.isArray(raw.youtubeAccounts)
    ? raw.youtubeAccounts
    : raw.youtube
      ? [{ ...asRecord(raw.youtube), id: 'youtube' }]
      : []
  const youtubeAccounts: YouTubeAccount[] = []
  for (const item of listed) {
    const account = asRecord(item)
    const id = typeof account.id === 'string' && YOUTUBE_ID.test(account.id) ? account.id : null
    const channelId = text(account.channelId, 64)
    if (!id || !channelId || youtubeAccounts.some((other) => other.id === id)) continue
    const avatar = text(account.avatar, 500) ?? ''
    youtubeAccounts.push({
      id,
      channelId,
      name: text(account.name, 100) ?? '',
      email: text(account.email, 254) ?? '',
      avatar: /^https:\/\//.test(avatar) ? avatar : ''
    })
  }
  const clientId =
    typeof raw.twitchClientId === 'string' && /^[A-Za-z0-9]{0,64}$/.test(raw.twitchClientId.trim())
      ? raw.twitchClientId.trim()
      : ''
  const twitchId = text(twitch.userId, 32)
  const twitchLogin = text(twitch.login, 25)
  return {
    twitchClientId: clientId,
    youtubeAccounts,
    twitch:
      twitchId && twitchLogin && TWITCH_LOGIN.test(twitchLogin)
        ? { userId: twitchId, login: twitchLogin, name: text(twitch.name, 100) ?? twitchLogin }
        : null,
    liveCheckMinutes: LIVE_CHECK_MINUTES.includes(raw.liveCheckMinutes as 3)
      ? (raw.liveCheckMinutes as number)
      : DEFAULT_MEDIA_SETTINGS.liveCheckMinutes
  }
}
