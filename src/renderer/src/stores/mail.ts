import { create } from 'zustand'
import { getMailErrorCode, getMailErrorDetail, type MailAccountState } from '@shared/mail'
import i18n from 'i18next'

/**
 * Mails côté interface : état des comptes (non lus, erreur de connexion), suivi par le
 * processus principal, et mail à ouvrir après un clic sur une notification.
 */
interface MailStore {
  states: Record<string, MailAccountState>
  /** Augmente quand de nouveaux mails arrivent sur un compte : les listes se rechargent. */
  arrivals: Record<string, number>
  /** Mail demandé par une notification (consommé par le premier bloc du compte). */
  openRequest: { accountId: string; messageId: string; nonce: number } | null
  requestOpen: (accountId: string, messageId: string) => void
  clearOpenRequest: (nonce: number) => void
}

/** Type des blocs Mails (extension intégrée `tessera.mail`). */
export const MAIL_WIDGET_TYPE = 'tessera.mail/inbox'

export const useMailStore = create<MailStore>()((set) => ({
  states: {},
  arrivals: {},
  openRequest: null,
  requestOpen: (accountId, messageId) =>
    set({ openRequest: { accountId, messageId, nonce: Date.now() } }),
  clearOpenRequest: (nonce) =>
    set((state) => (state.openRequest?.nonce === nonce ? { openRequest: null } : state))
}))

export async function initMailStore(): Promise<void> {
  useMailStore.setState({ states: await window.tessera.mail.getStates() })
  window.tessera.mail.onChange((accountId, state, fresh) =>
    useMailStore.setState((store) => ({
      states: { ...store.states, [accountId]: state },
      arrivals: fresh
        ? { ...store.arrivals, [accountId]: (store.arrivals[accountId] ?? 0) + 1 }
        : store.arrivals
    }))
  )
}

/** Message lisible d'une erreur de mail (traduit), avec le détail du serveur s'il aide. */
export function mailErrorMessage(error: unknown): string {
  const code = getMailErrorCode(error)
  const text = i18n.t(`mail.errors.${code}`)
  const detail = getMailErrorDetail(error)
  return code === 'unknown' || code === 'network' || code === 'auth'
    ? detail
      ? `${text} (${detail.slice(0, 160)})`
      : text
    : text
}
