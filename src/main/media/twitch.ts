import { mailError } from '@shared/mail'
import type { TwitchChannel, TwitchStream } from '@shared/media'
import { apiJson, createTokenSource } from '../auth/http'
import { clientFor } from '../auth/clients'
import { twitchClient } from '../auth/providers'
import { TWITCH_ACCOUNT } from '../auth/secrets'
import { getSettings } from '../settings-store'

/**
 * Twitch : chaînes suivies en direct (API Helix), « Se connecter avec Twitch ».
 * Seule autorisation : `user:read:follows` (voir qui l'on suit). Le chat passe par la page de
 * Twitch elle-même (connexion à Twitch dans le chat pour y écrire).
 */

const API = 'https://api.twitch.tv/helix'

let token = createTokenSource(TWITCH_ACCOUNT, twitchClient)

export function resetTwitch(): void {
  token = createTokenSource(TWITCH_ACCOUNT, twitchClient)
}

/** En-tête demandé par Helix en plus du jeton. */
const helix = (): RequestInit => ({ headers: { 'Client-Id': clientFor('twitch').clientId } })

/** Compte qui vient de se connecter. */
export async function fetchTwitchUser(
  accessToken: string
): Promise<{ userId: string; login: string; name: string }> {
  const result = await apiJson<{ data: { id: string; login: string; display_name: string }[] }>(
    async () => accessToken,
    `${API}/users`,
    helix()
  )
  const user = result.data[0]
  if (!user) throw mailError('auth', 'user')
  return { userId: user.id, login: user.login, name: user.display_name || user.login }
}

/** Chaînes suivies actuellement en direct, les plus regardées d'abord. */
export async function followedLive(): Promise<TwitchStream[]> {
  const user = getSettings().media.twitch
  if (!user) return []
  const result = await apiJson<{
    data: {
      user_login: string
      user_name: string
      title: string
      game_name: string
      viewer_count: number
      started_at: string
      thumbnail_url: string
    }[]
  }>(token, `${API}/streams/followed?user_id=${encodeURIComponent(user.userId)}&first=100`, helix())
  return result.data.map((stream) => ({
    login: stream.user_login,
    name: stream.user_name || stream.user_login,
    title: stream.title,
    game: stream.game_name,
    viewers: stream.viewer_count,
    startedAt: Date.parse(stream.started_at) || Date.now(),
    thumbnail: stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
  }))
}

/** Chaîne au nom exact (la recherche de Twitch, approximative, peut l'oublier). */
async function exactChannel(login: string): Promise<TwitchChannel | null> {
  const users = await apiJson<{
    data: { login: string; display_name: string; profile_image_url: string }[]
  }>(token, `${API}/users?login=${encodeURIComponent(login)}`, helix())
  const user = users.data[0]
  if (!user) return null
  const streams = await apiJson<{ data: { title: string; game_name: string }[] }>(
    token,
    `${API}/streams?user_login=${encodeURIComponent(user.login)}`,
    helix()
  )
  const stream = streams.data[0]
  return {
    login: user.login,
    name: user.display_name || user.login,
    live: !!stream,
    title: stream?.title ?? '',
    game: stream?.game_name ?? '',
    avatar: user.profile_image_url
  }
}

/** Recherche de chaînes : le nom exact d'abord, puis les chaînes en direct. */
export async function searchChannels(query: string): Promise<TwitchChannel[]> {
  const exact = /^\w{3,25}$/.test(query)
    ? exactChannel(query.toLowerCase()).catch(() => null)
    : null
  const result = await apiJson<{
    data: {
      broadcaster_login: string
      display_name: string
      is_live: boolean
      title: string
      game_name: string
      thumbnail_url: string
    }[]
  }>(token, `${API}/search/channels?first=24&query=${encodeURIComponent(query)}`, helix())
  const channels = result.data
    .map((channel) => ({
      login: channel.broadcaster_login,
      name: channel.display_name || channel.broadcaster_login,
      live: channel.is_live,
      title: channel.title,
      game: channel.game_name,
      avatar: channel.thumbnail_url
    }))
    .sort((a, b) => Number(b.live) - Number(a.live))
  const found = await exact
  if (!found) return channels
  return [found, ...channels.filter((channel) => channel.login !== found.login)]
}
