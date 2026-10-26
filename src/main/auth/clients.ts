import { mailError } from '@shared/mail'
import { getSecret, GOOGLE_SECRET } from './secrets'
import { getSettings } from '../settings-store'

/**
 * Identifiants des applications de Tessera chez Google et Twitch (« Se connecter
 * avec… »). Créés une fois par l'auteur de Tessera (docs/applications-oauth.md), ils sont
 * injectés à la compilation depuis `oauth-clients.local.json` (non versionné) ou la variable
 * d'environnement `TESSERA_OAUTH_CLIENTS` : personne d'autre n'a rien à créer.
 *
 * Un utilisateur peut les remplacer par les siens (Paramètres → Comptes → Avancé).
 *
 * Le « secret » du client Google de bureau n'en est pas un (Google le dit lui-même : une
 * application installée ne peut rien cacher) ; il n'est simplement pas publié dans le dépôt.
 */

interface BuiltInClients {
  google?: { clientId?: string; clientSecret?: string }
  twitch?: { clientId?: string }
  spotify?: { clientId?: string }
}

declare const __OAUTH_CLIENTS__: BuiltInClients | undefined

const builtIn: BuiltInClients = typeof __OAUTH_CLIENTS__ === 'object' ? __OAUTH_CLIENTS__ : {}

export type Provider = 'google' | 'twitch'

/** Identifiant de l'application Spotify de Tessera, s'il a été fourni à la compilation. */
export const builtInSpotifyClientId = (): string => builtIn.spotify?.clientId ?? ''

/** Identifiants utilisés (ceux de l'utilisateur s'il en a saisi, sinon ceux de Tessera). */
export function clientFor(provider: Provider): { clientId: string; clientSecret?: string } {
  const settings = getSettings()
  if (provider === 'google') {
    const own = settings.mail.googleClientId
    const id = own || builtIn.google?.clientId || ''
    const secret = own ? getSecret(GOOGLE_SECRET) : builtIn.google?.clientSecret
    if (!id || !secret) throw mailError('not-configured', 'google')
    return { clientId: id, clientSecret: secret }
  }
  const id = settings.media.twitchClientId || builtIn.twitch?.clientId || ''
  if (!id) throw mailError('not-configured', 'twitch')
  return { clientId: id }
}

/** Fournisseurs disponibles (identifiants intégrés ou saisis). */
export function availableProviders(): Record<Provider, boolean> {
  const available = (provider: Provider): boolean => {
    try {
      clientFor(provider)
      return true
    } catch {
      return false
    }
  }
  return {
    google: available('google'),
    twitch: available('twitch')
  }
}

/** Identifiants intégrés à cette version de Tessera (pour l'affichage « Avancé »). */
export const hasBuiltInClient = (provider: Provider): boolean =>
  provider === 'google'
    ? !!builtIn.google?.clientId && !!builtIn.google.clientSecret
    : !!builtIn[provider]?.clientId
