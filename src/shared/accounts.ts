/**
 * Comptes connectés à Tessera (Paramètres → Comptes) : Google (Gmail, YouTube), Twitch,
 * et comptes de messagerie IMAP.
 */

/** Services Google qu'une même connexion peut ouvrir. */
export const GOOGLE_SERVICES = ['gmail', 'youtube'] as const
export type GoogleService = (typeof GOOGLE_SERVICES)[number]

export type AccountProvider = 'google' | 'twitch'

export interface AccountProviders {
  /** Connexion possible (identifiants de Tessera, ou ceux saisis dans « Avancé »). */
  available: Record<AccountProvider, boolean>
  /** Identifiants intégrés à cette version de Tessera. */
  builtIn: Record<AccountProvider, boolean>
}
