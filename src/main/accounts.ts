import { mailError } from '@shared/mail'
import { GOOGLE_SERVICES, type AccountProviders, type GoogleService } from '@shared/accounts'
import { availableProviders, hasBuiltInClient } from './auth/clients'
import { apiJson } from './auth/http'
import { authorize, authorizeDevice } from './auth/oauth'
import { GOOGLE_SCOPES, googleClient, twitchClient } from './auth/providers'
import { getSettings } from './settings-store'
import { saveOAuthAccount } from './mail'
import { hasPermission } from './plugins/manifests'
import { saveTwitch, saveYouTube } from './media'

/**
 * Boutons « Se connecter avec Google / Twitch » (Paramètres → Comptes) : la page
 * de connexion s'ouvre dans le navigateur par défaut, où l'utilisateur est souvent déjà
 * connecté (un clic pour choisir le compte), puis les services choisis sont branchés.
 */

export function getAccountProviders(): AccountProviders {
  return {
    available: availableProviders(),
    builtIn: {
      google: hasBuiltInClient('google'),
      twitch: hasBuiltInClient('twitch')
    }
  }
}

/**
 * Une seule connexion Google pour les services cochés (Gmail, YouTube) : Google demande
 * l'accord une fois. Un service décoché par l'utilisateur sur la page de Google est ignoré.
 */
export async function connectGoogle(
  services: GoogleService[],
  loginHint?: string
): Promise<{ email: string; services: GoogleService[] }> {
  const wanted = [...new Set(services)].filter((service) => GOOGLE_SERVICES.includes(service))
  if (wanted.length === 0) throw mailError('invalid', 'services')
  const tokens = await authorize(
    googleClient(wanted.flatMap((service) => GOOGLE_SCOPES[service])),
    loginHint
  )
  if (!tokens.refreshToken) throw mailError('auth', 'no-refresh-token')
  const profile = await apiJson<{ email?: string; picture?: string }>(
    async () => tokens.accessToken,
    'https://openidconnect.googleapis.com/v1/userinfo'
  )
  const email = profile.email ?? ''
  const granted = wanted.filter((service) =>
    GOOGLE_SCOPES[service].every((scope) => tokens.scopes.includes(scope))
  )
  if (granted.length === 0) throw mailError('auth', 'scopes')

  if (granted.includes('gmail')) saveOAuthAccount('gmail', email, tokens.refreshToken)
  if (granted.includes('youtube')) {
    await saveYouTube(email, tokens.refreshToken, tokens.accessToken, profile.picture ?? '')
  }
  return { email, services: granted }
}

export async function connectTwitch(): Promise<void> {
  const tokens = await authorizeDevice(twitchClient())
  if (!tokens.refreshToken) throw mailError('auth', 'no-refresh-token')
  await saveTwitch(tokens.refreshToken, tokens.accessToken)
}

/**
 * « Reconnecter » dans un bloc Mails : la page de connexion s'ouvre sur le compte concerné.
 * La connexion Google garde YouTube s'il était branché sur la même adresse.
 */
export async function reconnectMailAccount(pluginId: string, accountId: string): Promise<void> {
  if (!hasPermission(pluginId, 'mail')) throw mailError('permission')
  const { mail, media } = getSettings()
  const account = mail.accounts.find((item) => item.id === accountId)
  if (!account) throw mailError('not-found', 'account')
  if (account.provider === 'imap') throw mailError('invalid', 'imap')
  const sameYouTube = media.youtubeAccounts.some(
    (item) => item.email.toLowerCase() === account.address.toLowerCase()
  )
  await connectGoogle(sameYouTube ? ['gmail', 'youtube'] : ['gmail'], account.address)
}
