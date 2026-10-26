/**
 * Comptes connectés à Tessera (Paramètres → Comptes) : Google (Gmail, YouTube, Agenda),
 * Twitch, et comptes de messagerie IMAP.
 */

/** Services Google qu'une même connexion peut ouvrir. */
export const GOOGLE_SERVICES = ['gmail', 'youtube', 'calendar', 'tasks'] as const
export type GoogleService = (typeof GOOGLE_SERVICES)[number]

export type AccountProvider = 'google' | 'twitch'

export interface AccountProviders {
  /** Connexion possible (identifiants de Tessera, ou ceux saisis dans « Avancé »). */
  available: Record<AccountProvider, boolean>
  /** Identifiants intégrés à cette version de Tessera. */
  builtIn: Record<AccountProvider, boolean>
}

/** Compte Google qui a donné accès à son agenda (widget « Prochain événement »). */
export interface CalendarAccount {
  id: string
  email: string
}

export interface CalendarSettings {
  accounts: CalendarAccount[]
}

/** Comptes Google d'un service (agenda, tâches) : identifiants `<préfixe>-…`. */
function sanitizeServiceAccounts(input: unknown, prefix: string): CalendarAccount[] {
  const accounts = Array.isArray(input) ? input : []
  const result: CalendarAccount[] = []
  for (const item of accounts) {
    const account =
      typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}
    if (
      typeof account.id === 'string' &&
      new RegExp(`^${prefix}-[a-z0-9-]{1,48}$`).test(account.id) &&
      typeof account.email === 'string' &&
      !result.some((other) => other.id === account.id)
    ) {
      result.push({ id: account.id, email: account.email.slice(0, 320) })
    }
  }
  return result
}

export function sanitizeCalendarSettings(input: unknown): CalendarSettings {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  return { accounts: sanitizeServiceAccounts(raw.accounts, 'calendar') }
}

/** Comptes Google qui ont donné accès à leurs tâches (module Tâches). */
export type TasksSettings = CalendarSettings

export function sanitizeTasksSettings(input: unknown): TasksSettings {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  return { accounts: sanitizeServiceAccounts(raw.accounts, 'tasks') }
}
