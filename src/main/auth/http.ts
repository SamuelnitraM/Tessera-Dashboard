import { mailError } from '@shared/mail'
import { refreshTokens, type OAuthClient } from './oauth'
import { getAccountSecret, setAccountSecret } from './secrets'

/** Secret d'un compte connecté par OAuth (Gmail, YouTube, Twitch). */
export interface OAuthSecret {
  refreshToken: string
}

export type TokenSource = (force?: boolean) => Promise<string>

/**
 * Jeton d'accès d'un compte, renouvelé avant expiration. Un jeton de rafraîchissement refusé
 * (révoqué, mot de passe changé…) donne l'erreur `auth` : il faut reconnecter le compte.
 */
export function createTokenSource(accountId: string, client: () => OAuthClient): TokenSource {
  let cached: { token: string; expiresAt: number } | null = null
  let pending: Promise<string> | null = null
  return (force = false) => {
    if (!force && cached && cached.expiresAt - 60_000 > Date.now()) {
      return Promise.resolve(cached.token)
    }
    pending ??= (async () => {
      try {
        const secret = getAccountSecret<OAuthSecret>(accountId)
        if (!secret?.refreshToken) throw mailError('auth', 'no-token')
        const tokens = await refreshTokens(client(), secret.refreshToken)
        // Twitch renouvelle aussi le jeton de rafraîchissement
        if (tokens.refreshToken && tokens.refreshToken !== secret.refreshToken) {
          setAccountSecret(accountId, { refreshToken: tokens.refreshToken })
        }
        cached = { token: tokens.accessToken, expiresAt: tokens.expiresAt }
        return tokens.accessToken
      } finally {
        pending = null
      }
    })()
    return pending
  }
}

/** Appel d'une API (Gmail, YouTube, Twitch) avec le jeton du compte. */
export async function apiFetch(
  token: TokenSource,
  url: string,
  init: RequestInit = {},
  retried = false
): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${await token(retried)}` },
      signal: AbortSignal.timeout(30_000)
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('mail-error:')) throw error
    throw mailError('network', error instanceof Error ? error.message : '')
  }
  if (response.status === 401 && !retried) return apiFetch(token, url, init, true)
  if (response.ok) return response
  const body = (await response.text().catch(() => '')).slice(0, 300)
  // Limite quotidienne de l'API (YouTube : 10 000 unités par jour)
  if (response.status === 403 && /quotaExceeded|rateLimitExceeded|dailyLimitExceeded/.test(body)) {
    throw mailError('quota', body)
  }
  if (response.status === 401 || response.status === 403) throw mailError('auth', body)
  if (response.status === 404) throw mailError('not-found', body)
  throw mailError('unknown', `HTTP ${response.status} ${body}`)
}

export async function apiJson<T>(
  token: TokenSource,
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(token, url, init)
  return (await response.json()) as T
}

export const jsonBody = (value: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value)
})
