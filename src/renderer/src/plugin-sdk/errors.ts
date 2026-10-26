import { getMailErrorCode } from '@shared/mail'
import { mailErrorMessage } from '../stores/mail'

/**
 * Texte d'une erreur à montrer à l'utilisateur. Une erreur venue du processus principal arrive
 * enrobée par Electron (« Error invoking remote method 'canal': Error: … ») : seul le message
 * d'origine est gardé. Une erreur de compte (`mail-error:code`) devient sa phrase traduite.
 */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (/mail-error:[a-z-]+/.test(raw) && getMailErrorCode(error) !== 'unknown') {
    return mailErrorMessage(error)
  }
  return raw
    .replace(/^Error invoking remote method '[^']+': /, '')
    .replace(/^(?:Error|TypeError|RangeError): /, '')
    .trim()
}
