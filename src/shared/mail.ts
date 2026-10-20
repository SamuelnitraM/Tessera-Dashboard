/**
 * Mails : comptes Gmail (API Google), Outlook (Microsoft Graph) et IMAP/SMTP.
 *
 * Les comptes (sans aucun secret) sont dans les réglages. Les jetons de connexion, mots de passe
 * IMAP et le secret du client Google sont chiffrés par Windows (`mail-secrets.json`), et ne
 * quittent jamais le processus principal.
 */

export const MAIL_PROVIDERS = ['gmail', 'outlook', 'imap'] as const
export type MailProvider = (typeof MAIL_PROVIDERS)[number]

/** Serveur IMAP ou SMTP. `secure` : TLS dès la connexion (sinon STARTTLS). */
export interface MailServer {
  host: string
  port: number
  secure: boolean
}

export interface MailAccount {
  id: string
  provider: MailProvider
  /** Nom affiché (par défaut l'adresse). */
  name: string
  address: string
  /** IMAP : serveurs et identifiant (souvent l'adresse). */
  imap?: MailServer
  smtp?: MailServer
  username?: string
}

export interface MailSettings {
  /** Identifiant du client OAuth Google (type « Application de bureau »), fourni par l'utilisateur. */
  googleClientId: string
  /** Identifiant d'application Microsoft Entra (client public), fourni par l'utilisateur. */
  microsoftClientId: string
  /** Vérification des nouveaux mails, en minutes. */
  checkMinutes: number
  accounts: MailAccount[]
}

export const DEFAULT_MAIL_SETTINGS: MailSettings = {
  googleClientId: '',
  microsoftClientId: '',
  checkMinutes: 2,
  accounts: []
}

export const CHECK_MINUTES = [1, 2, 5, 10, 15, 30, 60] as const

/** Source des notifications d'un compte (réglable dans Paramètres → Notifications). */
export const mailSource = (accountId: string): string => `mail:${accountId}`

export interface MailAddress {
  name: string
  address: string
}

/** Mail dans une liste. */
export interface MailSummary {
  id: string
  /** Conversation (Gmail, Outlook), pour répondre dans le même fil. */
  threadId: string | null
  from: MailAddress
  subject: string
  /** Début du texte. */
  snippet: string
  /** Date de réception (ms). */
  date: number
  unread: boolean
  hasAttachments: boolean
}

export interface MailAttachment {
  /** Index de la pièce jointe dans le mail. */
  index: number
  filename: string
  contentType: string
  size: number
}

/** Mail complet, pour la lecture. */
export interface MailMessage extends MailSummary {
  to: MailAddress[]
  cc: MailAddress[]
  replyTo: MailAddress[]
  /** HTML d'origine (non nettoyé : l'interface le nettoie avant affichage), ou `null`. */
  html: string | null
  text: string
  attachments: MailAttachment[]
  /** En-têtes `Message-ID` et `References`, pour répondre. */
  messageId: string | null
  references: string[]
}

export interface MailPage {
  messages: MailSummary[]
  /** Nombre de mails non lus dans la boîte de réception. */
  unread: number
  /** Page suivante, ou `null` s'il n'y en a plus. */
  next: string | null
}

/** Pièce jointe choisie pour un envoi (le fichier reste sur le disque jusqu'à l'envoi). */
export interface MailUpload {
  id: string
  filename: string
  size: number
}

export interface MailDraft {
  to: string
  cc: string
  bcc: string
  subject: string
  html: string
  text: string
  /** Réponse ou transfert : mail d'origine (même fil, en-têtes de réponse). */
  replyTo?: { messageId: string | null; references: string[]; threadId: string | null }
  /** Transfert : identifiant du mail d'origine, dont les pièces jointes sont reprises. */
  forwardFrom?: string
  attachments: MailUpload[]
}

export type MailAction = 'read' | 'unread' | 'archive' | 'trash'

/** État d'un compte (compteur, erreur de connexion), suivi par le processus principal. */
export interface MailAccountState {
  unread: number
  /** Dernière erreur (connexion expirée…), ou `null`. */
  error: MailErrorCode | null
  checkedAt: number | null
}

/** Réglages IMAP courants. */
export interface ImapPreset {
  id: string
  name: string
  imap: MailServer
  smtp: MailServer
  /** Domaines d'adresse reconnus. */
  domains: string[]
}

export const IMAP_PRESETS: ImapPreset[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
    domains: ['gmail.com', 'googlemail.com']
  },
  {
    id: 'ovh',
    name: 'OVHcloud',
    imap: { host: 'ssl0.ovh.net', port: 993, secure: true },
    smtp: { host: 'ssl0.ovh.net', port: 465, secure: true },
    domains: []
  },
  {
    id: 'orange',
    name: 'Orange',
    imap: { host: 'imap.orange.fr', port: 993, secure: true },
    smtp: { host: 'smtp.orange.fr', port: 465, secure: true },
    domains: ['orange.fr', 'wanadoo.fr']
  },
  {
    id: 'free',
    name: 'Free',
    imap: { host: 'imap.free.fr', port: 993, secure: true },
    smtp: { host: 'smtp.free.fr', port: 465, secure: true },
    domains: ['free.fr']
  },
  {
    id: 'sfr',
    name: 'SFR',
    imap: { host: 'imap.sfr.fr', port: 993, secure: true },
    smtp: { host: 'smtp.sfr.fr', port: 465, secure: true },
    domains: ['sfr.fr', 'neuf.fr']
  },
  {
    id: 'laposte',
    name: 'La Poste',
    imap: { host: 'imap.laposte.net', port: 993, secure: true },
    smtp: { host: 'smtp.laposte.net', port: 465, secure: true },
    domains: ['laposte.net']
  },
  {
    id: 'infomaniak',
    name: 'Infomaniak',
    imap: { host: 'mail.infomaniak.com', port: 993, secure: true },
    smtp: { host: 'mail.infomaniak.com', port: 465, secure: true },
    domains: ['ik.me', 'etik.com']
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
    domains: ['yahoo.com', 'yahoo.fr']
  },
  {
    id: 'icloud',
    name: 'iCloud',
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false },
    domains: ['icloud.com', 'me.com', 'mac.com']
  }
]

/** Nouveau compte IMAP, saisi par l'utilisateur. */
export interface ImapAccountInput {
  name: string
  address: string
  username: string
  password: string
  imap: MailServer
  smtp: MailServer
}

/**
 * Erreurs renvoyées à l'interface (le message de l'erreur porte le code) :
 * - `not-configured` : identifiant de client manquant (Paramètres → Mails)
 * - `auth` : connexion refusée ou expirée (reconnecter le compte)
 * - `cancelled` : connexion annulée par l'utilisateur
 * - `network` : serveur injoignable
 * - `not-found` : compte ou mail introuvable
 * - `no-folder` : dossier Archives ou Corbeille introuvable (IMAP)
 * - `permission` : l'extension n'a pas la permission `mail`
 * - `invalid` : données invalides (adresse, serveur…)
 * - `unknown`
 */
export const MAIL_ERROR_CODES = [
  'not-configured',
  'auth',
  'cancelled',
  'network',
  'not-found',
  'no-folder',
  'permission',
  'invalid',
  'unknown'
] as const
export type MailErrorCode = (typeof MAIL_ERROR_CODES)[number]

const ERROR_PREFIX = 'mail-error:'

export function mailError(code: MailErrorCode, detail = ''): Error {
  return new Error(`${ERROR_PREFIX}${code}${detail ? `:${detail}` : ''}`)
}

/** Code d'une erreur de mail (y compris après passage par l'IPC), sinon `unknown`. */
export function getMailErrorCode(error: unknown): MailErrorCode {
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/mail-error:([a-z-]+)/)
  const code = match?.[1] as MailErrorCode | undefined
  return code && MAIL_ERROR_CODES.includes(code) ? code : 'unknown'
}

/** Détail d'une erreur de mail (message du serveur…), ou chaîne vide. */
export function getMailErrorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.match(/mail-error:[a-z-]+:(.*)$/s)?.[1]?.trim() ?? ''
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

const ID = /^[a-z0-9-]{1,64}$/
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
const ADDRESS = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/

export const isMailAddress = (value: string): boolean => ADDRESS.test(value.trim())

export function sanitizeMailServer(input: unknown): MailServer | null {
  const raw = asRecord(input)
  const host = typeof raw.host === 'string' ? raw.host.trim().toLowerCase() : ''
  const port = typeof raw.port === 'number' ? Math.round(raw.port) : NaN
  if (!HOST.test(host) || host.length > 253 || !(port >= 1 && port <= 65535)) return null
  return { host, port, secure: raw.secure !== false }
}

function sanitizeAccount(input: unknown): MailAccount | null {
  const raw = asRecord(input)
  const provider = raw.provider as MailProvider
  const address = typeof raw.address === 'string' ? raw.address.trim() : ''
  if (typeof raw.id !== 'string' || !ID.test(raw.id) || !MAIL_PROVIDERS.includes(provider)) {
    return null
  }
  if (!isMailAddress(address) || address.length > 254) return null
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : address
  const account: MailAccount = { id: raw.id, provider, name, address }
  if (provider === 'imap') {
    const imap = sanitizeMailServer(raw.imap)
    const smtp = sanitizeMailServer(raw.smtp)
    const username =
      typeof raw.username === 'string' && raw.username.trim()
        ? raw.username.trim().slice(0, 254)
        : address
    if (!imap || !smtp) return null
    Object.assign(account, { imap, smtp, username })
  }
  return account
}

const CLIENT_ID = /^[A-Za-z0-9._-]{0,200}$/

export function sanitizeMailSettings(input: unknown): MailSettings {
  const raw = asRecord(input)
  const defaults = DEFAULT_MAIL_SETTINGS
  const accounts: MailAccount[] = []
  for (const item of Array.isArray(raw.accounts) ? raw.accounts : []) {
    const account = sanitizeAccount(item)
    if (account && !accounts.some((other) => other.id === account.id)) accounts.push(account)
  }
  const clientId = (value: unknown): string =>
    typeof value === 'string' && CLIENT_ID.test(value.trim()) ? value.trim() : ''
  return {
    googleClientId: clientId(raw.googleClientId),
    microsoftClientId: clientId(raw.microsoftClientId),
    checkMinutes: CHECK_MINUTES.includes(raw.checkMinutes as (typeof CHECK_MINUTES)[number])
      ? (raw.checkMinutes as number)
      : defaults.checkMinutes,
    accounts
  }
}

/** Adresses saisies (« a@b.fr, Nom <c@d.fr> ») : `null` si l'une est invalide. */
export function parseAddressList(input: string): MailAddress[] | null {
  const result: MailAddress[] = []
  for (const part of input.split(/[,;]/)) {
    const value = part.trim()
    if (!value) continue
    const match = value.match(/^(.*?)\s*<([^>]+)>$/)
    const address = (match ? match[2] : value).trim()
    if (!isMailAddress(address)) return null
    result.push({ name: match ? match[1].replace(/^"|"$/g, '').trim() : '', address })
  }
  return result
}

export const formatAddress = ({ name, address }: MailAddress): string =>
  name ? `${name} <${address}>` : address
