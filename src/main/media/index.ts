import { randomUUID } from 'node:crypto'
import { getMailErrorCode, mailError, type MailErrorCode } from '@shared/mail'
import type {
  MediaStatus,
  TwitchChannel,
  TwitchStream,
  YouTubePlaylist,
  YouTubeSearch,
  YouTubeVideo
} from '@shared/media'
import { pluginSource } from '@shared/notifications'
import { setAccountSecret, TWITCH_ACCOUNT, YOUTUBE_ACCOUNT } from '../auth/secrets'
import { getTranslation } from '../i18n'
import { notify } from '../notifications'
import { hasPermission } from '../plugins/manifests'
import { getSettings, onSettingsChange, updateSettings } from '../settings-store'
import { fetchTwitchUser, followedLive, resetTwitch, searchChannels } from './twitch'
import {
  fetchOwnChannel,
  listPlaylists,
  playlistVideos,
  resetYouTube,
  searchVideos,
  subscriptionFeed
} from './youtube'

/**
 * YouTube et Twitch : connexion des comptes (Paramètres), données des widgets (permission
 * `media`) et notification quand une chaîne Twitch suivie commence un direct.
 */

/** Extension dont les notifications annoncent les directs (réglables comme les siennes). */
const TWITCH_PLUGIN = 'tessera.twitch'

interface MediaListeners {
  /** État des comptes (connexion, erreur). */
  status: (status: MediaStatus) => void
  /** Directs des chaînes suivies, à chaque vérification. */
  live: (streams: TwitchStream[]) => void
}

let listeners: MediaListeners = { status: () => {}, live: () => {} }
/** Erreur de connexion de chaque compte (`twitch`, ou l'identifiant d'un compte YouTube). */
const errors = new Map<string, MailErrorCode>()
let live: TwitchStream[] = []
/** Chaînes déjà annoncées (`null` : première vérification, rien n'est annoncé). */
let announced: Set<string> | null = null

export function getMediaStatus(): MediaStatus {
  const { youtubeAccounts, twitch } = getSettings().media
  const first = youtubeAccounts[0]
  return {
    youtube: {
      connected: youtubeAccounts.length > 0,
      name: first?.name || first?.email || null,
      error: first ? (errors.get(first.id) ?? null) : null,
      errors: Object.fromEntries(
        youtubeAccounts.flatMap((account) => {
          const error = errors.get(account.id)
          return error ? [[account.id, error]] : []
        })
      )
    },
    twitch: { connected: !!twitch, name: twitch?.name ?? null, error: errors.get(TWITCH) ?? null }
  }
}

const TWITCH = 'twitch'

function setError(key: string, error: MailErrorCode | null): void {
  if ((errors.get(key) ?? null) === error) return
  if (error) errors.set(key, error)
  else errors.delete(key)
  listeners.status(getMediaStatus())
}

/** Appel d'un service : son erreur de connexion est notée (bandeau « Reconnecter »). */
async function track<T>(key: string, run: () => Promise<T>): Promise<T> {
  try {
    const result = await run()
    setError(key, null)
    return result
  } catch (error) {
    const code = getMailErrorCode(error)
    if (code === 'auth' || code === 'network' || code === 'not-configured') setError(key, code)
    throw error
  }
}

/** Compte YouTube demandé par le bloc (le premier par défaut). */
function youtubeAccount(accountId: unknown): string {
  const accounts = getSettings().media.youtubeAccounts
  const found = accounts.find((account) => account.id === accountId) ?? accounts[0]
  if (!found) throw mailError('not-configured', 'youtube')
  return found.id
}

function ensurePermission(pluginId: string): void {
  if (!hasPermission(pluginId, 'media')) throw mailError('permission')
}

// ---------------------------------------------------------------------------
// Comptes (Paramètres → YouTube et Twitch)
// ---------------------------------------------------------------------------

/** Compte YouTube qui vient de se connecter (connexion Google, Paramètres → Comptes). */
export async function saveYouTube(
  email: string,
  refreshToken: string,
  accessToken: string,
  /** Photo du compte Google (si la chaîne n'en a pas). */
  avatar = ''
): Promise<void> {
  const channel = await fetchOwnChannel(accessToken)
  const accounts = getSettings().media.youtubeAccounts
  // Même adresse qu'un compte existant : c'est une reconnexion
  const existing = accounts.find((account) => account.email.toLowerCase() === email.toLowerCase())
  const id = existing?.id ?? (accounts.length === 0 ? YOUTUBE_ACCOUNT : `youtube-${randomUUID()}`)
  setAccountSecret(id, { refreshToken })
  resetYouTube(id)
  errors.delete(id)
  const account = { id, ...channel, avatar: channel.avatar || avatar, email }
  updateSettings({
    media: {
      youtubeAccounts: existing
        ? accounts.map((item) => (item.id === id ? account : item))
        : [...accounts, account]
    }
  })
}

/** Compte Twitch qui vient de se connecter. */
export async function saveTwitch(refreshToken: string, accessToken: string): Promise<void> {
  const user = await fetchTwitchUser(accessToken)
  setAccountSecret(TWITCH_ACCOUNT, { refreshToken })
  resetTwitch()
  errors.delete(TWITCH)
  announced = null
  updateSettings({ media: { twitch: user } })
  void checkLive()
}

/** Déconnecte Twitch, ou un compte YouTube (`accountId`, tous si absent). */
export function disconnectMedia(service: 'youtube' | 'twitch', accountId?: string): void {
  if (service === 'youtube') {
    const accounts = getSettings().media.youtubeAccounts
    const removed = accounts.filter((account) => !accountId || account.id === accountId)
    for (const account of removed) {
      setAccountSecret(account.id, null)
      resetYouTube(account.id)
      errors.delete(account.id)
    }
    updateSettings({
      media: { youtubeAccounts: accounts.filter((account) => !removed.includes(account)) }
    })
  } else {
    setAccountSecret(TWITCH_ACCOUNT, null)
    errors.delete(TWITCH)
    resetTwitch()
    live = []
    announced = null
    listeners.live(live)
    updateSettings({ media: { twitch: null } })
  }
}

/** Réglages venant de l'interface : les comptes ne s'ajoutent que par la connexion. */
export function protectMediaAccounts<T extends { media?: Record<string, unknown> }>(patch: T): T {
  if (!patch?.media) return patch
  const media = { ...patch.media }
  delete media.youtubeAccounts
  delete media.twitch
  return { ...patch, media }
}

// ---------------------------------------------------------------------------
// Données des widgets (permission `media`)
// ---------------------------------------------------------------------------

export function youtubeFeed(
  pluginId: string,
  accountId: string,
  refresh: boolean
): Promise<YouTubeVideo[]> {
  ensurePermission(pluginId)
  const id = youtubeAccount(accountId)
  return track(id, () => subscriptionFeed(id, refresh === true))
}

export function youtubePlaylists(pluginId: string, accountId: string): Promise<YouTubePlaylist[]> {
  ensurePermission(pluginId)
  const id = youtubeAccount(accountId)
  return track(id, () => listPlaylists(id))
}

export function youtubePlaylist(
  pluginId: string,
  accountId: string,
  playlistId: string
): Promise<YouTubeVideo[]> {
  ensurePermission(pluginId)
  const id = youtubeAccount(accountId)
  return track(id, () => playlistVideos(id, String(playlistId)))
}

export function youtubeSearch(
  pluginId: string,
  accountId: string,
  query: string,
  page: string | null
): Promise<YouTubeSearch> {
  ensurePermission(pluginId)
  const id = youtubeAccount(accountId)
  const text = String(query ?? '')
    .trim()
    .slice(0, 200)
  if (!text) return Promise.resolve({ videos: [], next: null })
  return track(id, () => searchVideos(id, text, typeof page === 'string' ? page : null))
}

export function twitchSearch(pluginId: string, query: string): Promise<TwitchChannel[]> {
  ensurePermission(pluginId)
  if (!getSettings().media.twitch) throw mailError('not-configured', 'twitch')
  const text = String(query ?? '')
    .trim()
    .slice(0, 100)
  if (!text) return Promise.resolve([])
  return track(TWITCH, () => searchChannels(text))
}

export function twitchLive(pluginId: string): TwitchStream[] {
  ensurePermission(pluginId)
  return live
}

export async function twitchRefresh(pluginId: string): Promise<TwitchStream[]> {
  ensurePermission(pluginId)
  await checkLive()
  return live
}

// ---------------------------------------------------------------------------
// Directs des chaînes suivies
// ---------------------------------------------------------------------------

let checking = false

async function checkLive(): Promise<void> {
  if (checking || !getSettings().media.twitch) return
  checking = true
  try {
    const streams = await track(TWITCH, followedLive)
    const previous = announced
    announced = new Set(streams.map((stream) => stream.login))
    live = streams
    listeners.live(live)
    // Première vérification : les directs déjà en cours ne sont pas annoncés
    if (!previous) return
    const text = getTranslation().media
    for (const stream of streams.filter((item) => !previous.has(item.login))) {
      await notify(pluginSource(TWITCH_PLUGIN), {
        title: text.liveTitle.replace('{{name}}', stream.name),
        body: [stream.title, stream.game].filter(Boolean).join('\n'),
        tag: `live-${stream.login}`,
        target: stream.login
      })
    }
  } catch {
    // Erreur notée dans l'état du compte
  } finally {
    checking = false
  }
}

let timer: NodeJS.Timeout | undefined

function schedule(): void {
  clearInterval(timer)
  timer = setInterval(() => void checkLive(), getSettings().media.liveCheckMinutes * 60_000)
}

export function initMedia(next: MediaListeners): void {
  listeners = next
  schedule()
  setTimeout(() => void checkLive(), 6_000)
  onSettingsChange((settings, previous) => {
    if (settings.media.liveCheckMinutes !== previous.media.liveCheckMinutes) schedule()
    if (settings.media.twitchClientId !== previous.media.twitchClientId) resetTwitch()
    // Identifiant Google changé : la connexion YouTube repart de zéro
    if (settings.mail.googleClientId !== previous.mail.googleClientId) resetYouTube()
    if (
      settings.media.youtubeAccounts !== previous.media.youtubeAccounts ||
      settings.media.twitch !== previous.media.twitch
    ) {
      listeners.status(getMediaStatus())
    }
  })
}

export const stopMedia = (): void => clearInterval(timer)
