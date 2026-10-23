import { mailError } from '@shared/mail'
import type { YouTubePlaylist, YouTubeSearch, YouTubeVideo } from '@shared/media'
import { apiJson, createTokenSource, type TokenSource } from '../auth/http'
import { googleClient } from '../auth/providers'

/**
 * YouTube : abonnements, playlists et vidéos aimées du compte connecté (API YouTube Data, en
 * lecture seule), « Se connecter avec Google » (même connexion que Gmail si les deux sont cochés).
 *
 * Le fil des abonnements vient des flux RSS publics des chaînes : il ne consomme pas le quota
 * quotidien de l'API (10 000 unités), seule la liste des abonnements en a besoin.
 */

const API = 'https://www.googleapis.com/youtube/v3'
/** Abonnements relus au plus une fois par heure, flux des chaînes toutes les 15 minutes. */
const SUBSCRIPTIONS_TTL = 60 * 60_000
const FEED_TTL = 15 * 60_000
const MAX_FEED = 120

/** Jeton et abonnements de chaque compte YouTube. */
const accounts = new Map<
  string,
  {
    token: TokenSource
    subscriptions: { at: number; channels: { id: string; title: string }[] } | null
  }
>()
/** Flux publics des chaînes (communs à tous les comptes). */
const feeds = new Map<string, { at: number; videos: YouTubeVideo[] }>()

function account(accountId: string): {
  token: TokenSource
  subscriptions: { at: number; channels: { id: string; title: string }[] } | null
} {
  let entry = accounts.get(accountId)
  if (!entry) {
    entry = { token: createTokenSource(accountId, () => googleClient()), subscriptions: null }
    accounts.set(accountId, entry)
  }
  return entry
}

/** Compte reconnecté ou déconnecté (ou tous) : plus rien en cache. */
export function resetYouTube(accountId?: string): void {
  if (accountId) accounts.delete(accountId)
  else accounts.clear()
}

interface Thumbnails {
  default?: { url: string }
  medium?: { url: string }
  high?: { url: string }
}

const thumbnail = (thumbnails: Thumbnails | undefined): string =>
  thumbnails?.medium?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url ?? ''

/** Chaîne du compte qui vient de se connecter (et sa photo), ou `mine` s'il n'en a pas. */
export async function fetchOwnChannel(
  accessToken: string
): Promise<{ channelId: string; name: string; avatar: string }> {
  const result = await apiJson<{
    items?: { id: string; snippet: { title: string; thumbnails?: Thumbnails } }[]
  }>(async () => accessToken, `${API}/channels?part=snippet&mine=true`)
  const channel = result.items?.[0]
  return channel
    ? {
        channelId: channel.id,
        name: channel.snippet.title,
        avatar: channel.snippet.thumbnails?.default?.url ?? ''
      }
    : { channelId: 'mine', name: '', avatar: '' }
}

async function listSubscriptions(accountId: string): Promise<{ id: string; title: string }[]> {
  const entry = account(accountId)
  const { token } = entry
  if (entry.subscriptions && Date.now() - entry.subscriptions.at < SUBSCRIPTIONS_TTL) {
    return entry.subscriptions.channels
  }
  const channels: { id: string; title: string }[] = []
  let page: string | undefined
  // 10 pages de 50 au plus (500 abonnements)
  for (let index = 0; index < 10; index++) {
    const query = new URLSearchParams({ part: 'snippet', mine: 'true', maxResults: '50' })
    if (page) query.set('pageToken', page)
    const result = await apiJson<{
      items?: { snippet: { title: string; resourceId: { channelId: string } } }[]
      nextPageToken?: string
    }>(token, `${API}/subscriptions?${query}`)
    for (const item of result.items ?? []) {
      channels.push({ id: item.snippet.resourceId.channelId, title: item.snippet.title })
    }
    page = result.nextPageToken
    if (!page) break
  }
  entry.subscriptions = { at: Date.now(), channels }
  return channels
}

const decode = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/** Dernières vidéos d'une chaîne, d'après son flux RSS public. */
async function channelFeed(channel: { id: string; title: string }): Promise<YouTubeVideo[]> {
  const cached = feeds.get(channel.id)
  if (cached && Date.now() - cached.at < FEED_TTL) return cached.videos
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.id)}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (!response.ok) return cached?.videos ?? []
    const xml = await response.text()
    const videos: YouTubeVideo[] = []
    for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const field = (pattern: RegExp): string => decode(entry.match(pattern)?.[1] ?? '')
      const id = field(/<yt:videoId>([^<]+)<\/yt:videoId>/)
      if (!id) continue
      const views = entry.match(/<media:statistics views="(\d+)"/)?.[1]
      videos.push({
        id,
        title: field(/<title>([^<]*)<\/title>/),
        channelId: channel.id,
        channelTitle: field(/<author>\s*<name>([^<]*)<\/name>/) || channel.title,
        published: Date.parse(field(/<published>([^<]+)<\/published>/)) || null,
        thumbnail: field(/<media:thumbnail url="([^"]+)"/),
        views: views ? Number(views) : null
      })
    }
    feeds.set(channel.id, { at: Date.now(), videos })
    return videos
  } catch {
    return cached?.videos ?? []
  }
}

/** Fil des abonnements : dernières vidéos de toutes les chaînes, les plus récentes d'abord. */
export async function subscriptionFeed(
  accountId: string,
  refresh: boolean
): Promise<YouTubeVideo[]> {
  if (refresh) feeds.clear()
  const channels = await listSubscriptions(accountId)
  const videos: YouTubeVideo[] = []
  // 8 chaînes à la fois
  for (let index = 0; index < channels.length; index += 8) {
    const batch = await Promise.all(channels.slice(index, index + 8).map(channelFeed))
    videos.push(...batch.flat())
  }
  return videos.sort((a, b) => (b.published ?? 0) - (a.published ?? 0)).slice(0, MAX_FEED)
}

/** Identifiant de la liste des vidéos aimées (pas une vraie playlist pour l'API). */
export const LIKED_PLAYLIST = 'liked'

export async function listPlaylists(accountId: string): Promise<YouTubePlaylist[]> {
  const { token } = account(accountId)
  const result = await apiJson<{
    items?: {
      id: string
      snippet: { title: string; thumbnails?: Thumbnails }
      contentDetails: { itemCount: number }
    }[]
  }>(token, `${API}/playlists?part=snippet,contentDetails&mine=true&maxResults=50`)
  return (result.items ?? []).map((item) => ({
    id: item.id,
    title: item.snippet.title,
    thumbnail: thumbnail(item.snippet.thumbnails),
    count: item.contentDetails.itemCount
  }))
}

interface ApiVideo {
  id: string
  snippet: {
    title: string
    channelId: string
    channelTitle: string
    publishedAt?: string
    thumbnails?: Thumbnails
  }
  statistics?: { viewCount?: string }
}

export async function playlistVideos(
  accountId: string,
  playlistId: string
): Promise<YouTubeVideo[]> {
  const { token } = account(accountId)
  if (playlistId === LIKED_PLAYLIST) {
    const result = await apiJson<{ items?: ApiVideo[] }>(
      token,
      `${API}/videos?part=snippet,statistics&myRating=like&maxResults=50`
    )
    return (result.items ?? []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      published: Date.parse(item.snippet.publishedAt ?? '') || null,
      thumbnail: thumbnail(item.snippet.thumbnails),
      views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null
    }))
  }
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(playlistId)) throw mailError('invalid', 'playlist')
  const result = await apiJson<{
    items?: {
      snippet: {
        title: string
        videoOwnerChannelId?: string
        videoOwnerChannelTitle?: string
        thumbnails?: Thumbnails
        resourceId: { videoId: string }
      }
      contentDetails?: { videoPublishedAt?: string }
    }[]
  }>(
    token,
    `${API}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}`
  )
  return (
    (result.items ?? [])
      // Vidéos supprimées ou privées : sans chaîne
      .filter((item) => item.snippet.videoOwnerChannelId)
      .map((item) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        channelId: item.snippet.videoOwnerChannelId ?? '',
        channelTitle: item.snippet.videoOwnerChannelTitle ?? '',
        published: Date.parse(item.contentDetails?.videoPublishedAt ?? '') || null,
        thumbnail: thumbnail(item.snippet.thumbnails),
        views: null
      }))
  )
}

/** Durée ISO 8601 (« PT1H2M3S ») en secondes. */
function isoDuration(value: string | undefined): number | null {
  const match = value?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return null
  const [, days, hours, minutes, seconds] = match.map((part) => Number(part ?? 0))
  return days * 86_400 + hours * 3600 + minutes * 60 + seconds
}

const searches = new Map<string, { at: number; result: YouTubeSearch }>()
const SEARCH_TTL = 10 * 60_000

/**
 * Recherche de vidéos (API YouTube : 101 unités par recherche, sur un quota de 10 000 par
 * jour pour toute l'application). Les résultats sont gardés 10 minutes.
 */
export async function searchVideos(
  accountId: string,
  query: string,
  page: string | null
): Promise<YouTubeSearch> {
  const { token } = account(accountId)
  const key = `${query}|${page ?? ''}`
  const cached = searches.get(key)
  if (cached && Date.now() - cached.at < SEARCH_TTL) return cached.result
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '24',
    q: query,
    safeSearch: 'moderate'
  })
  if (page) params.set('pageToken', page)
  const found = await apiJson<{
    items?: { id: { videoId?: string } }[]
    nextPageToken?: string
  }>(token, `${API}/search?${params}`)
  const ids = (found.items ?? []).map((item) => item.id.videoId).filter(Boolean)
  const details = ids.length
    ? await apiJson<{
        items?: (ApiVideo & { contentDetails?: { duration?: string } })[]
      }>(token, `${API}/videos?part=snippet,contentDetails,statistics&id=${ids.join(',')}`)
    : { items: [] }
  const byId = new Map((details.items ?? []).map((item) => [item.id, item]))
  const videos: YouTubeVideo[] = []
  for (const id of ids) {
    const item = id ? byId.get(id) : undefined
    if (!item) continue
    videos.push({
      id: item.id,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      published: Date.parse(item.snippet.publishedAt ?? '') || null,
      thumbnail: thumbnail(item.snippet.thumbnails),
      views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
      duration: isoDuration(item.contentDetails?.duration)
    })
  }
  const result = { videos, next: found.nextPageToken ?? null }
  searches.set(key, { at: Date.now(), result })
  for (const old of [...searches.keys()].slice(0, -30)) searches.delete(old)
  return result
}
