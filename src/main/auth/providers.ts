import { clientFor } from './clients'
import type { OAuthClient } from './oauth'

/**
 * Pages de connexion de Google et Twitch (« Se connecter avec… »), avec les
 * identifiants de Tessera (ou ceux de l'utilisateur, Paramètres → Comptes → Avancé).
 */

export const GOOGLE_SCOPES = {
  /** Adresse et nom du compte (toujours demandés). */
  profile: ['openid', 'email', 'profile'],
  gmail: ['https://www.googleapis.com/auth/gmail.modify'],
  youtube: ['https://www.googleapis.com/auth/youtube.readonly'],
  // Événements (lire, créer, modifier) et liste des agendas
  calendar: [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
  ],
  tasks: ['https://www.googleapis.com/auth/tasks']
}

export function googleClient(scopes: string[] = []): OAuthClient {
  const { clientId, clientSecret } = clientFor('google')
  return {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId,
    clientSecret,
    scopes: [...GOOGLE_SCOPES.profile, ...scopes],
    // Jeton de rafraîchissement à chaque connexion, et choix du compte (déjà connecté dans le
    // navigateur : un clic suffit)
    extraParams: {
      access_type: 'offline',
      prompt: 'consent select_account',
      include_granted_scopes: 'true'
    }
  }
}

/** Twitch : client public (sans secret), connexion par code d'appareil. */
export function twitchClient(): OAuthClient & { deviceUrl: string } {
  return {
    authorizeUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    deviceUrl: 'https://id.twitch.tv/oauth2/device',
    clientId: clientFor('twitch').clientId,
    scopes: ['user:read:follows']
  }
}
