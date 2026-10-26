import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'
import { JsonStore } from '../json-store'

/**
 * Secrets des comptes connectés : jetons de connexion (mails, YouTube, Twitch), mots de passe
 * IMAP, secrets des clients Google et Twitch. Chiffrés par Windows (DPAPI, liés à la session
 * de l'utilisateur) dans `secrets.json` ; ils ne quittent jamais le processus principal.
 */

type Secrets = Record<string, string>

const KEY = /^(google-client-secret|twitch-client-secret|account:[a-z0-9-]{1,64})$/

function sanitize(input: unknown): Secrets {
  const result: Secrets = {}
  if (typeof input !== 'object' || input === null) return result
  for (const [key, value] of Object.entries(input)) {
    if (KEY.test(key) && typeof value === 'string' && value.length < 20_000) result[key] = value
  }
  return result
}

const store = new JsonStore<Secrets>('secrets.json', sanitize)

export function loadSecrets(): void {
  // Étape 10 : les secrets s'appelaient `mail-secrets.json`
  const folder = app.getPath('userData')
  const previous = join(folder, 'mail-secrets.json')
  if (!existsSync(join(folder, 'secrets.json')) && existsSync(previous)) {
    renameSync(previous, join(folder, 'secrets.json'))
  }
  store.load()
}
export const flushSecrets = (): void => store.flush()

export const GOOGLE_SECRET = 'google-client-secret'
/** Comptes uniques (pas des comptes mail) : jamais supprimés avec les comptes mail retirés. */
export const YOUTUBE_ACCOUNT = 'youtube'
export const TWITCH_ACCOUNT = 'twitch'
const RESERVED = new Set([YOUTUBE_ACCOUNT, TWITCH_ACCOUNT])
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

/**
 * Supprime les secrets des comptes mail retirés (et seulement eux). Les autres services
 * (YouTube, Twitch, Agenda, Tâches, Spotify) suppriment les leurs à leur déconnexion : une
 * liste de comptes « à garder » effaçait les jetons des services qu'elle ne connaissait pas.
 */
export function removeAccountSecrets(accountIds: string[]): void {
  const remove = new Set(accountIds.filter((id) => !RESERVED.has(id)).map(accountSecret))
  const current = store.get()
  const next = Object.fromEntries(Object.entries(current).filter(([key]) => !remove.has(key)))
  if (Object.keys(next).length !== Object.keys(current).length) store.set(next)
}
