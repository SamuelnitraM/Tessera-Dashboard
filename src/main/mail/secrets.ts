import { safeStorage } from 'electron'
import { JsonStore } from '../json-store'

/**
 * Secrets des mails : jetons de connexion, mots de passe IMAP, secret du client Google.
 * Chiffrés par Windows (DPAPI, liés à la session de l'utilisateur) dans `mail-secrets.json` ;
 * ils ne quittent jamais le processus principal.
 */

type Secrets = Record<string, string>

const KEY = /^(google-client-secret|account:[a-z0-9-]{1,64})$/

function sanitize(input: unknown): Secrets {
  const result: Secrets = {}
  if (typeof input !== 'object' || input === null) return result
  for (const [key, value] of Object.entries(input)) {
    if (KEY.test(key) && typeof value === 'string' && value.length < 20_000) result[key] = value
  }
  return result
}

const store = new JsonStore<Secrets>('mail-secrets.json', sanitize)

export const loadMailSecrets = (): void => void store.load()
export const flushMailSecrets = (): void => store.flush()

export const GOOGLE_SECRET = 'google-client-secret'
export const accountSecret = (accountId: string): string => `account:${accountId}`

export function getSecret(key: string): string | null {
  const value = store.get()[key]
  if (!value || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return null
  }
}

/** Enregistre (chiffré) ou supprime (`null`) un secret. */
export function setSecret(key: string, value: string | null): void {
  const next = { ...store.get() }
  if (value === null) delete next[key]
  else {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Chiffrement indisponible')
    next[key] = safeStorage.encryptString(value).toString('base64')
  }
  store.set(next)
}

export const hasSecret = (key: string): boolean => key in store.get()

/** Secret JSON d'un compte (jeton de rafraîchissement ou mot de passe). */
export function getAccountSecret<T>(accountId: string): T | null {
  const value = getSecret(accountSecret(accountId))
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const setAccountSecret = (accountId: string, value: object | null): void =>
  setSecret(accountSecret(accountId), value === null ? null : JSON.stringify(value))

/** Supprime les secrets des comptes qui n'existent plus. */
export function pruneAccountSecrets(accountIds: string[]): void {
  const keep = new Set(accountIds.map(accountSecret))
  const current = store.get()
  const next = Object.fromEntries(
    Object.entries(current).filter(([key]) => !key.startsWith('account:') || keep.has(key))
  )
  if (Object.keys(next).length !== Object.keys(current).length) store.set(next)
}
