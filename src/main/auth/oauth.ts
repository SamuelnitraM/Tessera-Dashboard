import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { shell } from 'electron'
import { mailError } from '@shared/mail'
import { getTranslation } from '../i18n'

/**
 * Connexion OAuth 2 d'une application de bureau (Google) : la page de connexion
 * s'ouvre dans le navigateur par défaut (Google refuse les navigateurs intégrés), puis revient
 * sur une petite adresse locale (`http://localhost:<port>`) que Tessera écoute le temps de la
 * connexion. Code PKCE : le code reçu ne sert à rien sans le vérificateur gardé par Tessera.
 */

export interface OAuthClient {
  authorizeUrl: string
  tokenUrl: string
  clientId: string
  /** Google (application de bureau) : secret non confidentiel, mais demandé. */
  clientSecret?: string
  scopes: string[]
  /** Paramètres propres au fournisseur (accès hors ligne, choix du compte…). */
  extraParams?: Record<string, string>
  /** Port fixe de l'adresse de retour (adresse exacte enregistrée chez le fournisseur). */
  redirectPort?: number
  /** Hôte de l'adresse de retour (`localhost` par défaut ; Spotify exige `127.0.0.1`). */
  redirectHost?: string
}

export interface OAuthTokens {
  accessToken: string
  /** Absent si le fournisseur garde le précédent. */
  refreshToken: string | null
  /** Expiration (ms). */
  expiresAt: number
  /** Autorisations accordées (l'utilisateur peut en décocher chez Google). */
  scopes: string[]
}

/** L'utilisateur a cinq minutes pour se connecter. */
const AUTHORIZE_TIMEOUT_MS = 5 * 60_000

const base64Url = (bytes: Buffer): string => bytes.toString('base64url')

let cancelPending: (() => void) | null = null

/** Annule la connexion en cours (bouton « Annuler » des Paramètres). */
export function cancelAuthorization(): void {
  cancelPending?.()
}

function page(title: string, text: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:'Segoe UI',sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#111318;color:#e6e7ea}
main{text-align:center;max-width:28rem;padding:1rem}h1{font-size:1.25rem}p{color:#9aa0aa}</style></head>
<body><main><h1>${title}</h1><p>${text}</p></main></body></html>`
}

async function requestTokens(
  client: OAuthClient,
  params: Record<string, string>
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: client.clientId,
    ...(client.clientSecret ? { client_secret: client.clientSecret } : {}),
    ...params
  })
  let response: Response
  try {
    response = await fetch(client.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20_000)
    })
  } catch (error) {
    throw mailError('network', error instanceof Error ? error.message : '')
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || typeof data.access_token !== 'string') {
    const detail = [data.error ?? data.message, data.error_description].filter(Boolean).join(' : ')
    throw mailError('auth', detail || `HTTP ${response.status}`)
  }
  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    scopes:
      typeof data.scope === 'string'
        ? data.scope.split(' ')
        : Array.isArray(data.scope)
          ? data.scope.map(String)
          : client.scopes
  }
}

/** Écoute `localhost` (IPv4 et IPv6, même port) le temps de la connexion. */
async function listenLocally(
  handler: Parameters<typeof createServer>[1],
  fixedPort = 0
): Promise<{
  port: number
  close: () => void
}> {
  const servers: Server[] = []
  const first = createServer(handler)
  await new Promise<void>((resolve, reject) => {
    first.once('error', reject)
    first.listen(fixedPort, '127.0.0.1', () => resolve())
  })
  servers.push(first)
  const address = first.address()
  const port = typeof address === 'object' && address ? address.port : 0
  // `localhost` peut désigner ::1 : le navigateur doit trouver Tessera dans les deux cas
  const second = createServer(handler)
  await new Promise<void>((resolve) => {
    second.once('error', () => resolve())
    second.listen(port, '::1', () => {
      servers.push(second)
      resolve()
    })
  })
  return {
    port,
    close: () => {
      for (const server of servers) {
        server.close()
        server.closeAllConnections()
      }
    }
  }
}

/** Ouvre la page de connexion du fournisseur et attend le retour. */
export async function authorize(client: OAuthClient, loginHint?: string): Promise<OAuthTokens> {
  cancelPending?.()
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  const state = base64Url(randomBytes(16))
  const text = getTranslation().mail.oauth

  let settle: (result: { code: string } | Error) => void = () => {}
  const received = new Promise<{ code: string } | Error>((resolve) => {
    settle = resolve
  })

  const server = await listenLocally((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname !== '/') {
      response.writeHead(404).end()
      return
    }
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    // Requête sans le bon `state` (autre programme, page qui sonde les ports) : ignorée, elle
    // n'interrompt pas la connexion en cours
    if (url.searchParams.get('state') !== state) {
      response.writeHead(400).end()
      return
    }
    const ok = !!code
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(
      ok ? page(text.successTitle, text.successText) : page(text.failedTitle, text.failedText)
    )
    if (ok) settle({ code })
    else if (error === 'access_denied') settle(mailError('cancelled'))
    else settle(mailError('auth', error ?? 'state'))
  }, client.redirectPort)
  const redirectUri = `http://${client.redirectHost ?? 'localhost'}:${server.port}`

  const url = new URL(client.authorizeUrl)
  const params: Record<string, string> = {
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: client.scopes.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(loginHint ? { login_hint: loginHint } : {}),
    ...client.extraParams
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const timer = setTimeout(() => settle(mailError('cancelled', 'timeout')), AUTHORIZE_TIMEOUT_MS)
  cancelPending = () => settle(mailError('cancelled'))
  try {
    await shell.openExternal(url.toString())
    const result = await received
    if (result instanceof Error) throw result
    return await requestTokens(client, {
      grant_type: 'authorization_code',
      code: result.code,
      code_verifier: verifier,
      redirect_uri: redirectUri
    })
  } finally {
    clearTimeout(timer)
    cancelPending = null
    server.close()
  }
}

/** Nouveau jeton d'accès à partir du jeton de rafraîchissement. */
export function refreshTokens(client: OAuthClient, refreshToken: string): Promise<OAuthTokens> {
  return requestTokens(client, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })
}

/**
 * Connexion par code d'appareil (Twitch, client public sans secret) : la page d'activation
 * s'ouvre dans le navigateur avec le code déjà rempli ; il suffit d'accepter. Tessera attend
 * la réponse en interrogeant le fournisseur.
 */
export async function authorizeDevice(
  client: OAuthClient & { deviceUrl: string }
): Promise<OAuthTokens> {
  cancelPending?.()
  let response: Response
  try {
    response = await fetch(client.deviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: client.clientId, scopes: client.scopes.join(' ') }),
      signal: AbortSignal.timeout(20_000)
    })
  } catch (error) {
    throw mailError('network', error instanceof Error ? error.message : '')
  }
  const device = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || typeof device.device_code !== 'string') {
    throw mailError('auth', String(device.message ?? `HTTP ${response.status}`))
  }

  let cancelled = false
  cancelPending = () => {
    cancelled = true
  }
  try {
    const verification = String(device.verification_uri)
    if (!/^https:\/\//i.test(verification)) throw mailError('auth', 'verification_uri')
    await shell.openExternal(verification)
    const deadline = Date.now() + Math.min(Number(device.expires_in) || 600, 900) * 1000
    const interval = Math.max(Number(device.interval) || 5, 2) * 1000
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, interval))
      if (cancelled) throw mailError('cancelled')
      try {
        return await requestTokens(client, {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: device.device_code,
          scopes: client.scopes.join(' ')
        })
      } catch (error) {
        // L'utilisateur n'a pas encore accepté : on attend
        if (!/authorization_pending|slow_down/.test((error as Error).message)) throw error
      }
    }
    throw mailError('cancelled', 'timeout')
  } finally {
    cancelPending = null
  }
}
