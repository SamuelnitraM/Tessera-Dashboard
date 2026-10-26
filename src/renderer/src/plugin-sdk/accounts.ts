/** Erreurs des comptes connectés (Google, Twitch, Spotify) vues par les blocs. */
import { getMailErrorCode, MAIL_ERROR_CODES, type MailErrorCode } from '@shared/mail'

/** Erreurs de compte qui demandent de se reconnecter (ou de revoir la connexion). */
const RECONNECT_CODES: readonly MailErrorCode[] = [
  'auth',
  'scope',
  'api-disabled',
  'not-configured'
]

/** Code d'une erreur de compte : code seul (`'auth'`) ou erreur reçue ; `null` si aucune. */
export function accountErrorCode(error: unknown): MailErrorCode | null {
  if (error === null || error === undefined || error === '') return null
  if (typeof error === 'string' && (MAIL_ERROR_CODES as readonly string[]).includes(error)) {
    return error as MailErrorCode
  }
  return getMailErrorCode(error)
}

/**
 * L'erreur d'un compte demande-t-elle de le reconnecter (jeton révoqué, autorisation
 * manquante, API désactivée, connexion non configurée) ? Accepte un code ou une erreur.
 */
export function needsReconnect(error: unknown): boolean {
  const code = accountErrorCode(error)
  return code !== null && RECONNECT_CODES.includes(code)
}
