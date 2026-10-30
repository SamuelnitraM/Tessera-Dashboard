import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { app, ipcMain, shell } from 'electron'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import { mailError } from '@shared/mail'
import {
  SPOTIFY_REDIRECT_PORT,
  type SpotifyCommand,
  type SpotifyItem,
  type SpotifyKind,
  type SpotifyPlayback,
  type SpotifyState
} from '@shared/spotify'
import { isDesktopApp } from '@shared/user-apps'
import {
  getMediaSession,
  getMediaTimeline,
  getProgramVolume,
  seekMedia,
  sendMediaCommand,
  setProgramVolume
} from '../headerbar/system'
import { addApp, iconOf, launchTargetExists, updateAppLaunch } from '../desktop/programs'
import { shellItemExists } from '../desktop/win32'
import { getSettings } from '../settings-store'
import { builtInSpotifyClientId } from '../auth/clients'
import { apiFetch, createTokenSource, type TokenSource } from '../auth/http'
import { authorize, type OAuthClient } from '../auth/oauth'
import { setAccountSecret } from '../auth/secrets'
import { errorText } from '../i18n'
import { JsonStore } from '../json-store'

/**
 * Module Spotify : connexion au compte (Spotify ne demande aucun secret : PKCE), playlists,
 * titres likés, écoutes récentes, recherche. La lecture se lance dans l'application Spotify
 * (`spotify:…`) : un compte gratuit ne peut pas être piloté par l'API.
 */

const ACCOUNT = 'spotify'
const API = 'https://api.spotify.com/v1'
const REDIRECT_HOST = '127.0.0.1'
const SCOPES = [
  'user-read-private',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-recently-played',
  'user-read-currently-playing',
  'user-read-playback-state'
]

interface SpotifyData {
  clientId: string
  user: { name: string; image: string | null } | null
}

const store = new JsonStore<SpotifyData>('spotify.json', (input) => {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const user =
    typeof raw.user === 'object' && raw.user ? (raw.user as Record<string, unknown>) : null
  return {
    clientId:
      typeof raw.clientId === 'string' && /^[a-f0-9]{32}$/i.test(raw.clientId) ? raw.clientId : '',
    user:
      user && typeof user.name === 'string'
        ? { name: user.name, image: typeof user.image === 'string' ? user.image : null }
        : null
  }
})
export const loadSpotify = (): void => void store.load()
export const flushSpotify = (): void => store.flush()

const clientId = (): string => store.get().clientId || builtInSpotifyClientId()

function client(): OAuthClient {
  const id = clientId()
  if (!id) throw mailError('not-configured', 'spotify')
  return {
    authorizeUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    clientId: id,
    scopes: SCOPES,
    redirectPort: SPOTIFY_REDIRECT_PORT,
    redirectHost: REDIRECT_HOST
  }
}

let token: TokenSource | null = null
const tokenSource = (): TokenSource => (token ??= createTokenSource(ACCOUNT, client))

export function spotifyState(): SpotifyState {
  const data = store.get()
  return {
    configured: !!clientId(),
    ownClientId: data.clientId,
    user: data.user,
    redirectUri: `http://${REDIRECT_HOST}:${SPOTIFY_REDIRECT_PORT}`
  }
}

export function setClientId(id: unknown): SpotifyState {
  const value = typeof id === 'string' ? id.trim() : ''
  if (value && !/^[a-f0-9]{32}$/i.test(value))
    throw new Error(errorText('spotify', 'invalidClientId'))
  store.set({ ...store.get(), clientId: value })
  token = null
  return spotifyState()
}

/** Refus de Spotify : le propriétaire de l'identifiant d'application n'a pas Premium. */
const OWNER_PREMIUM = /premium subscription required/i

async function get<T>(path: string): Promise<T | null> {
  let response: Response
  try {
    response = await apiFetch(tokenSource(), `${API}${path}`)
  } catch (error) {
    if (OWNER_PREMIUM.test(String(error))) throw mailError('premium')
    throw error
  }
  if (response.status === 204) return null
  return (await response.json()) as T
}

export async function connectSpotify(): Promise<SpotifyState> {
  const tokens = await authorize(client())
  if (!tokens.refreshToken) throw mailError('auth', 'no-refresh-token')
  setAccountSecret(ACCOUNT, { refreshToken: tokens.refreshToken })
  token = null
  const me = await get<{ display_name?: string; id: string; images?: { url: string }[] }>('/me')
  store.set({
    ...store.get(),
    user: { name: me?.display_name || me?.id || 'Spotify', image: me?.images?.[0]?.url ?? null }
  })
  return spotifyState()
}

export function disconnectSpotify(): SpotifyState {
  setAccountSecret(ACCOUNT, null)
  token = null
  store.set({ ...store.get(), user: null })
  return spotifyState()
}

type Image = { url: string }[] | undefined
const image = (images: Image): string | null => images?.[0]?.url ?? null

interface Track {
  id: string
  name: string
  uri: string
  duration_ms: number
  artists?: { name: string }[]
  album?: { name: string; images?: { url: string }[] }
}

const track = (item: Track | null | undefined): SpotifyItem | null =>
  item?.id
    ? {
        kind: 'track',
        id: item.id,
        name: item.name,
        subtitle: [item.artists?.map((artist) => artist.name).join(', '), item.album?.name]
          .filter(Boolean)
          .join(' · '),
        image: image(item.album?.images),
        uri: item.uri,
        durationMs: item.duration_ms
      }
    : null

const tracks = (list: (Track | null | undefined)[]): SpotifyItem[] =>
  list.map(track).filter((item): item is SpotifyItem => item !== null)

export async function spotifyData(kind: SpotifyKind, value: unknown): Promise<SpotifyItem[]> {
  if (kind === 'playlists') {
    const data = await get<{
      items: {
        id: string
        name: string
        uri: string
        images?: Image
        owner?: { display_name?: string }
        tracks?: { total: number }
      }[]
    }>('/me/playlists?limit=50')
    return (data?.items ?? []).map((item) => ({
      kind: 'playlist',
      id: item.id,
      name: item.name,
      subtitle: [item.owner?.display_name, item.tracks ? `${item.tracks.total} titres` : null]
        .filter(Boolean)
        .join(' · '),
      image: image(item.images ?? undefined),
      uri: item.uri,
      durationMs: null
    }))
  }
  if (kind === 'playlist') {
    if (typeof value !== 'string' || !/^[A-Za-z0-9]+$/.test(value))
      throw new Error(errorText('spotify', 'invalidPlaylist'))
    const data = await get<{ items: { track: Track | null }[] }>(
      `/playlists/${value}/tracks?limit=100`
    )
    return tracks((data?.items ?? []).map((item) => item.track))
  }
  if (kind === 'liked') {
    const data = await get<{ items: { track: Track }[] }>('/me/tracks?limit=50')
    return tracks((data?.items ?? []).map((item) => item.track))
  }
  if (kind === 'recent') {
    const data = await get<{ items: { track: Track }[] }>('/me/player/recently-played?limit=30')
    // Un titre écouté plusieurs fois n'apparaît qu'une fois
    const seen = new Set<string>()
    return tracks((data?.items ?? []).map((item) => item.track)).filter((item) =>
      seen.has(item.id) ? false : (seen.add(item.id), true)
    )
  }
  if (kind === 'now') {
    const data = await get<{ item?: Track }>('/me/player/currently-playing')
    return tracks([data?.item])
  }
  if (kind === 'search') {
    const query = typeof value === 'string' ? value.trim().slice(0, 200) : ''
    if (!query) return []
    const data = await get<{
      tracks?: { items: Track[] }
      albums?: {
        items: {
          id: string
          name: string
          uri: string
          images?: Image
          artists?: { name: string }[]
        }[]
      }
      artists?: {
        items: { id: string; name: string; uri: string; images?: Image; genres?: string[] }[]
      }
      playlists?: {
        items: ({
          id: string
          name: string
          uri: string
          images?: Image
          owner?: { display_name?: string }
        } | null)[]
      }
    }>(`/search?type=track,album,artist,playlist&limit=8&q=${encodeURIComponent(query)}`)
    return [
      ...tracks(data?.tracks?.items ?? []),
      ...(data?.artists?.items ?? []).map((item) => ({
        kind: 'artist' as const,
        id: item.id,
        name: item.name,
        subtitle: (item.genres ?? []).slice(0, 2).join(', '),
        image: image(item.images),
        uri: item.uri,
        durationMs: null
      })),
      ...(data?.albums?.items ?? []).map((item) => ({
        kind: 'album' as const,
        id: item.id,
        name: item.name,
        subtitle: (item.artists ?? []).map((artist) => artist.name).join(', '),
        image: image(item.images),
        uri: item.uri,
        durationMs: null
      })),
      ...(data?.playlists?.items ?? [])
        .filter((item): item is NonNullable<typeof item> => !!item)
        .map((item) => ({
          kind: 'playlist' as const,
          id: item.id,
          name: item.name,
          subtitle: item.owner?.display_name ?? '',
          image: image(item.images),
          uri: item.uri,
          durationMs: null
        }))
    ]
  }
  return []
}

interface Episode {
  name: string
  uri: string
  images?: { url: string }[]
  show?: { name: string }
}

/**
 * Lecture en cours : celle de l'application Spotify de ce PC d'après Windows (sans compte, gratuit
 * compris), sinon celle du compte connecté sur un autre appareil (API, `null` si Spotify la refuse).
 */
export async function spotifyPlayback(): Promise<SpotifyPlayback | null> {
  const local = await getMediaSession('Spotify').catch(() => null)
  if (local) {
    return {
      playing: local.playing,
      title: local.title,
      artist: local.artist,
      image: local.thumbnail,
      uri: null
    }
  }
  if (!store.get().user) return null
  const data = await get<{ is_playing?: boolean; item?: Track | Episode | null }>(
    '/me/player?additional_types=episode'
  ).catch(() => null)
  return data ? playbackOf(data) : null
}

function playbackOf(data: {
  is_playing?: boolean
  item?: Track | Episode | null
}): SpotifyPlayback | null {
  const item = data.item
  if (!item) return null
  const episode = 'show' in item
  return {
    playing: data.is_playing === true,
    title: item.name,
    artist: episode
      ? (item.show?.name ?? '')
      : ((item as Track).artists?.map((artist) => artist.name).join(', ') ?? ''),
    image: episode ? image(item.images) : image((item as Track).album?.images),
    uri: item.uri ?? null
  }
}

const COMMANDS: SpotifyCommand[] = ['play-pause', 'next', 'previous']

/**
 * Lecture, pause, titre suivant ou précédent. L'application Spotify de ce PC est pilotée par les
 * commandes multimédias de Windows (compte gratuit compris) ; un autre appareil, par l'API de
 * Spotify (réservée aux comptes Premium).
 */
export async function spotifyControl(action: unknown): Promise<void> {
  if (!COMMANDS.includes(action as SpotifyCommand)) return
  const command = action as SpotifyCommand
  const session = await getMediaSession('Spotify').catch(() => null)
  if (session) return sendMediaCommand(command, 'Spotify')
  try {
    if (command === 'play-pause') {
      const state = await get<{ is_playing?: boolean }>('/me/player')
      await apiFetch(tokenSource(), `${API}/me/player/${state?.is_playing ? 'pause' : 'play'}`, {
        method: 'PUT'
      })
    } else {
      await apiFetch(tokenSource(), `${API}/me/player/${command}`, { method: 'POST' })
    }
  } catch (error) {
    // Compte gratuit, ou aucun appareil en lecture
    if (
      /PREMIUM_REQUIRED|NO_ACTIVE_DEVICE|premium subscription|mail-error:(auth|not-found|premium)/i.test(
        String(error)
      )
    ) {
      throw new Error(errorText('spotify', 'controlUnavailable'), { cause: error })
    }
    throw error
  }
}

/**
 * Ouvre un titre, un album, un artiste ou une playlist dans l'application Spotify, ou sa
 * recherche (`spotify:search:…`, sans compte).
 */
export async function openInSpotify(uri: unknown): Promise<void> {
  if (
    typeof uri !== 'string' ||
    !/^spotify:((track|album|artist|playlist|show|episode):[A-Za-z0-9]+|search:[^\s"<>]{1,600})$/.test(
      uri
    )
  ) {
    throw new Error(errorText('spotify', 'invalidUri'))
  }
  await shell.openExternal(uri)
}

/** Programme qui affiche la fenêtre de Spotify (les deux versions). */
const SPOTIFY_PROCESS = 'Spotify.exe'

/**
 * Programme qui ouvre l'application Spotify : version du site (`%APPDATA%\Spotify`), ou du
 * Microsoft Store, lancée par son identifiant comme depuis le menu Démarrer (son .exe, dans un
 * dossier protégé de Windows, ne se lance pas directement). `null` : Spotify n'est pas installé.
 */
function findSpotify(): { path: string; args: string; iconPath: string } | null {
  const classic = join(app.getPath('appData'), 'Spotify', SPOTIFY_PROCESS)
  if (existsSync(classic)) return { path: classic, args: '', iconPath: classic }
  const local = process.env.LOCALAPPDATA
  if (!local) return null
  let family: string | undefined
  try {
    family = readdirSync(join(local, 'Packages')).find((name) =>
      /^SpotifyAB\.SpotifyMusic_[a-z0-9]+$/i.test(name)
    )
  } catch {
    return null
  }
  // Le dossier de données reste après une désinstallation : le paquet doit être installé
  const args = family ? `shell:AppsFolder\\${family}!Spotify` : ''
  if (!family || !shellItemExists(args)) return null
  return {
    path: join(process.env.SystemRoot ?? 'C:\\Windows', 'explorer.exe'),
    args,
    // Alias d'exécution créé par le Store : il donne l'icône de Spotify
    iconPath: join(local, 'Microsoft', 'WindowsApps', SPOTIFY_PROCESS)
  }
}

/**
 * Application installée de Tessera qui affiche Spotify dans son bloc, créée au besoin (celle que
 * l'utilisateur a déjà ajoutée est reprise). Renvoie son identifiant, ou `null` si Spotify n'est
 * pas installé sur ce PC.
 */
export async function spotifyApp(): Promise<string | null> {
  const existing = getSettings().apps.items.find(
    (item) => isDesktopApp(item) && item.processName.toLowerCase() === SPOTIFY_PROCESS.toLowerCase()
  )
  const found = findSpotify()
  if (existing) {
    // Spotify réinstallé autrement (Microsoft Store ↔ site) : l'entrée suit, même identifiant
    if (
      isDesktopApp(existing) &&
      found &&
      !launchTargetExists(existing) &&
      (found.path !== existing.path || found.args !== existing.args)
    ) {
      updateAppLaunch(existing.id, { ...found, icon: await iconOf(found.iconPath) })
    }
    return existing.id
  }
  if (!found) return null
  return addApp({
    name: 'Spotify',
    path: found.path,
    args: found.args,
    processName: SPOTIFY_PROCESS,
    icon: await iconOf(found.iconPath)
  }).id
}

export function registerSpotifyHandlers(): void {
  ipcMain.handle(C.spotifyApp, () => spotifyApp())
  // Barre de lecture : application Spotify de ce PC (session de Windows)
  ipcMain.handle(C.spotifyTimeline, () => getMediaTimeline('Spotify').catch(() => null))
  ipcMain.handle(C.spotifySeek, (_event, position: unknown) =>
    seekMedia('Spotify', typeof position === 'number' ? position : -1)
  )
  ipcMain.handle(C.spotifyState, () => spotifyState())
  ipcMain.handle(C.spotifySetClientId, (_event, id: unknown) => setClientId(id))
  ipcMain.handle(C.spotifyConnect, () => connectSpotify())
  ipcMain.handle(C.spotifyDisconnect, () => disconnectSpotify())
  ipcMain.handle(C.spotifyData, (_event, kind: SpotifyKind, value: unknown) =>
    spotifyData(kind, value)
  )
  ipcMain.handle(C.spotifyOpen, (_event, uri: unknown) => openInSpotify(uri))
  ipcMain.handle(C.spotifyPlayback, () => spotifyPlayback())
  ipcMain.handle(C.spotifyControl, (_event, action: unknown) => spotifyControl(action))
  // Volume de l'application Spotify de ce PC (sa session audio, comme dans le widget Son)
  ipcMain.handle(C.spotifyVolume, () => getProgramVolume('spotify.exe'))
  ipcMain.handle(C.spotifySetVolume, (_event, change: { volume?: unknown; muted?: unknown }) =>
    setProgramVolume('spotify.exe', {
      volume: typeof change?.volume === 'number' ? change.volume : undefined,
      muted: typeof change?.muted === 'boolean' ? change.muted : undefined
    })
  )
}
