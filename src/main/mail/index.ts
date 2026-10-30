import { randomUUID } from 'node:crypto'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, dialog, shell, type BrowserWindow, type WebContents } from 'electron'
import { openPageFrom } from '../open-in-tessera'
import {
  getMailErrorCode,
  isMailAddress,
  mailError,
  mailSource,
  parseAddressList,
  sanitizeMailQuery,
  DEFAULT_QUERY,
  sanitizeMailServer,
  type ImapAccountInput,
  type MailAccount,
  type MailAccountState,
  type MailAction,
  type MailDraft,
  type MailFolder,
  type MailQuery,
  type MailMessage,
  type MailPage,
  type MailProvider,
  type MailUpload
} from '@shared/mail'
import { getTranslation } from '../i18n'
import { JsonStore } from '../json-store'
import { notify } from '../notifications'
import { hasPermission } from '../plugins/manifests'
import { getSettings, onSettingsChange, updateSettings } from '../settings-store'
import type { MailConnection } from './connection'
import { connectGmail } from './gmail'
import { connectImap, verifyImapAccount, type ImapSecret } from './imap'
import { compose, extractAttachment, extractAttachments, toMessage } from './mime'
import { cancelAuthorization } from '../auth/oauth'
import {
  GOOGLE_SECRET,
  hasSecret,
  removeAccountSecrets,
  setAccountSecret,
  setSecret
} from '../auth/secrets'

/**
 * Mails : comptes, connexions aux fournisseurs, vérification des nouveaux mails (et leurs
 * notifications). L'interface n'a jamais accès aux jetons ni aux mots de passe.
 */

interface MailListeners {
  /** Nouvel état d'un compte ; `fresh` : de nouveaux mails sont arrivés. */
  changed: (accountId: string, state: MailAccountState, fresh: boolean) => void
}

let listeners: MailListeners = { changed: () => {} }

const PAGE_SIZE = 25
/** Au-delà, une seule notification résume les nouveaux mails. */
const MAX_NOTIFIED = 3

const connections = new Map<string, MailConnection>()
const states = new Map<string, MailAccountState>()
/** Mails déjà vus par la vérification (par compte). */
const seen = new Map<string, Set<string>>()
/**
 * Date du mail le plus récent déjà vu, par compte. Seul un mail plus récent est nouveau : un
 * ancien non lu qui remonte dans la liste (après une suppression) n'est pas notifié.
 */
const newestSeen = new Map<string, number>()
/** Derniers mails bruts lus (pièces jointes). */
const rawCache = new Map<string, Buffer>()
/** Fichiers choisis pour être joints. */
const uploads = new Map<string, { path: string; filename: string; size: number }>()

/** Dernière vérification de chaque compte : les mails arrivés depuis sont notifiés. */
const lastChecks = new JsonStore<Record<string, number>>('mail-state.json', (input) =>
  Object.fromEntries(
    Object.entries(typeof input === 'object' && input !== null ? input : {}).filter(
      ([key, value]) => /^[a-z0-9-]{1,64}$/.test(key) && typeof value === 'number'
    )
  )
)

export const flushMailState = (): void => lastChecks.flush()

const accounts = (): MailAccount[] => getSettings().mail.accounts

function findAccount(accountId: string): MailAccount {
  const account = accounts().find((item) => item.id === accountId)
  if (!account) throw mailError('not-found', 'account')
  return account
}

function connect(account: MailAccount): MailConnection {
  let connection = connections.get(account.id)
  if (!connection) {
    connection = account.provider === 'gmail' ? connectGmail(account) : connectImap(account)
    connections.set(account.id, connection)
  }
  return connection
}

function disconnect(accountId: string): void {
  void connections.get(accountId)?.close()
  connections.delete(accountId)
}

export function getAccountStates(): Record<string, MailAccountState> {
  return Object.fromEntries(states)
}

function setState(accountId: string, patch: Partial<MailAccountState>, fresh = false): void {
  const next = {
    ...(states.get(accountId) ?? { unread: 0, error: null, checkedAt: null }),
    ...patch
  }
  states.set(accountId, next)
  listeners.changed(accountId, next, fresh)
}

/** Lance l'opération d'un compte et note son erreur de connexion éventuelle. */
async function withAccount<T>(
  accountId: string,
  run: (connection: MailConnection, account: MailAccount) => Promise<T>
): Promise<T> {
  const account = findAccount(accountId)
  try {
    const result = await run(connect(account), account)
    if (states.get(accountId)?.error) setState(accountId, { error: null })
    return result
  } catch (error) {
    const code = getMailErrorCode(error)
    if (code === 'auth' || code === 'network' || code === 'not-configured') {
      setState(accountId, { error: code })
    }
    throw error
  }
}

function ensurePermission(pluginId: string): void {
  if (!hasPermission(pluginId, 'mail')) throw mailError('permission')
}

// ---------------------------------------------------------------------------
// Comptes (Paramètres → Comptes)
// ---------------------------------------------------------------------------

export function getMailConfig(): { googleSecretSet: boolean } {
  return { googleSecretSet: hasSecret(GOOGLE_SECRET) }
}

/** Secret du client Google (application de bureau). Chaîne vide : supprimé. */
export function setGoogleClientSecret(secret: string): void {
  const value = typeof secret === 'string' ? secret.trim() : ''
  if (value.length > 200) throw mailError('invalid')
  setSecret(GOOGLE_SECRET, value || null)
  for (const account of accounts()) if (account.provider === 'gmail') disconnect(account.id)
}

function saveAccount(account: MailAccount): MailAccount {
  const list = accounts()
  const exists = list.some((item) => item.id === account.id)
  updateSettings({
    mail: {
      accounts: exists
        ? list.map((item) => (item.id === account.id ? account : item))
        : [...list, account]
    }
  })
  return account
}

/**
 * Compte Gmail qui vient de se connecter (Paramètres → Comptes). Même adresse
 * qu'un compte existant : c'est une reconnexion, le compte garde ses réglages.
 */
export function saveOAuthAccount(
  provider: Exclude<MailProvider, 'imap'>,
  address: string,
  refreshToken: string
): MailAccount {
  const clean = address.trim()
  if (!isMailAddress(clean)) throw mailError('invalid', 'address')
  const existing = accounts().find(
    (item) => item.provider === provider && item.address.toLowerCase() === clean.toLowerCase()
  )
  const account = existing ?? { id: randomUUID(), provider, name: clean, address: clean }
  setAccountSecret(account.id, { refreshToken })
  disconnect(account.id)
  saveAccount(account)
  void checkAccount(account.id)
  return account
}

/** Nouveau compte IMAP (ou nouveau mot de passe), après vérification des serveurs. */
export async function addImapAccount(
  input: ImapAccountInput,
  reconnectId?: string
): Promise<MailAccount> {
  const address = String(input?.address ?? '').trim()
  const username = String(input?.username ?? '').trim() || address
  const password = String(input?.password ?? '')
  const imap = sanitizeMailServer(input?.imap)
  const smtp = sanitizeMailServer(input?.smtp)
  if (!isMailAddress(address) || !imap || !smtp || !password || password.length > 500) {
    throw mailError('invalid')
  }
  await verifyImapAccount(imap, smtp, username, password)
  const previous = reconnectId ? findAccount(reconnectId) : null
  const account: MailAccount = {
    id: previous?.id ?? randomUUID(),
    provider: 'imap',
    name: String(input.name ?? '').trim() || previous?.name || address,
    address,
    imap,
    smtp,
    username
  }
  setAccountSecret(account.id, { password } satisfies ImapSecret)
  disconnect(account.id)
  saveAccount(account)
  void checkAccount(account.id)
  return account
}

export function removeAccount(accountId: string): void {
  disconnect(accountId)
  states.delete(accountId)
  seen.delete(accountId)
  newestSeen.delete(accountId)
  updateSettings({ mail: { accounts: accounts().filter((item) => item.id !== accountId) } })
  setAccountSecret(accountId, null)
}

/**
 * Réglages venant de l'interface : elle peut renommer ou réordonner les comptes, mais pas
 * en ajouter ni changer leurs serveurs (un mot de passe pourrait partir ailleurs).
 */
export function protectMailAccounts<T extends { mail?: { accounts?: unknown } }>(patch: T): T {
  if (!patch?.mail || !('accounts' in patch.mail)) return patch
  const current = accounts()
  const incoming = Array.isArray(patch.mail.accounts) ? patch.mail.accounts : []
  const next: MailAccount[] = []
  for (const raw of incoming) {
    const item = raw as Partial<MailAccount>
    const known = current.find((account) => account.id === item?.id)
    if (known && !next.includes(known)) {
      next.push({ ...known, name: typeof item.name === 'string' ? item.name : known.name })
    }
  }
  return { ...patch, mail: { ...patch.mail, accounts: next } }
}

// ---------------------------------------------------------------------------
// Mails (widgets, permission `mail`)
// ---------------------------------------------------------------------------

/** Dossiers et libellés d'un compte. */
export async function listFolders(pluginId: string, accountId: string): Promise<MailFolder[]> {
  ensurePermission(pluginId)
  return withAccount(accountId, (connection) => connection.folders())
}

export async function listMessages(
  pluginId: string,
  accountId: string,
  query: MailQuery,
  page: string | null
): Promise<MailPage> {
  ensurePermission(pluginId)
  const result = await withAccount(accountId, (connection) =>
    connection.list(sanitizeMailQuery(query), typeof page === 'string' ? page : null, PAGE_SIZE)
  )
  setState(accountId, { unread: result.unread })
  return result
}

export async function getMessage(
  pluginId: string,
  accountId: string,
  id: string
): Promise<MailMessage> {
  ensurePermission(pluginId)
  return withAccount(accountId, async (connection) => {
    const { raw, known } = await connection.getRaw(String(id))
    rawCache.set(`${accountId}|${id}`, raw)
    // Seuls les derniers mails ouverts restent en mémoire
    for (const key of [...rawCache.keys()].slice(0, -10)) rawCache.delete(key)
    return toMessage(raw, known)
  })
}

export async function actOnMessage(
  pluginId: string,
  accountId: string,
  id: string,
  action: MailAction
): Promise<void> {
  ensurePermission(pluginId)
  if (!['read', 'unread', 'star', 'unstar', 'archive', 'trash'].includes(action)) {
    throw mailError('invalid')
  }
  await withAccount(accountId, (connection) => connection.act(String(id), action))
  // Compteur de non-lus exact (le mail archivé ou supprimé était peut-être non lu)
  void checkAccount(accountId)
}

/** Mail marqué comme lu depuis sa notification (bouton de la bulle, action de Tessera). */
export async function markMessageRead(accountId: string, id: string): Promise<void> {
  await withAccount(accountId, (connection) => connection.act(String(id), 'read'))
  void checkAccount(accountId)
}

export async function sendMessage(
  pluginId: string,
  accountId: string,
  draft: MailDraft
): Promise<void> {
  ensurePermission(pluginId)
  const to = parseAddressList(String(draft?.to ?? ''))
  const cc = parseAddressList(String(draft?.cc ?? ''))
  const bcc = parseAddressList(String(draft?.bcc ?? ''))
  if (!to || !cc || !bcc || to.length + cc.length + bcc.length === 0) {
    throw mailError('invalid', 'recipients')
  }
  const files = (Array.isArray(draft.attachments) ? draft.attachments : []).map((upload) => {
    const file = uploads.get(upload?.id)
    if (!file) throw mailError('not-found', 'attachment')
    return file
  })
  await withAccount(accountId, async (connection, account) => {
    // Transfert : les pièces jointes du mail d'origine sont reprises
    const forwarded =
      typeof draft.forwardFrom === 'string'
        ? await extractAttachments(
            rawCache.get(`${accountId}|${draft.forwardFrom}`) ??
              (await connection.getRaw(draft.forwardFrom)).raw
          )
        : []
    const raw = await compose(
      {
        to: String(draft.to),
        cc: String(draft.cc ?? ''),
        bcc: String(draft.bcc ?? ''),
        subject: String(draft.subject ?? '').slice(0, 500),
        html: String(draft.html ?? ''),
        text: String(draft.text ?? ''),
        replyTo: draft.replyTo,
        attachments: []
      },
      { name: account.name === account.address ? '' : account.name, address: account.address },
      [...files, ...forwarded],
      connection.readsBcc
    )
    await connection.send(raw, {
      threadId: draft.replyTo?.threadId ?? null,
      recipients: [...to, ...cc, ...bcc].map((item) => item.address)
    })
  })
  for (const upload of draft.attachments ?? []) uploads.delete(upload.id)
}

/** Fichiers à joindre, choisis dans la fenêtre de Windows (25 Mo au total au plus). */
export async function pickUploads(
  pluginId: string,
  window: BrowserWindow | null
): Promise<MailUpload[]> {
  ensurePermission(pluginId)
  const options = { properties: ['openFile', 'multiSelections'] as const }
  const result = window
    ? await dialog.showOpenDialog(window, { properties: [...options.properties] })
    : await dialog.showOpenDialog({ properties: [...options.properties] })
  if (result.canceled) return []
  const picked: MailUpload[] = []
  for (const path of result.filePaths) {
    const info = await stat(path)
    if (!info.isFile()) continue
    const upload = { id: randomUUID(), path, filename: basename(path), size: info.size }
    uploads.set(upload.id, upload)
    picked.push({ id: upload.id, filename: upload.filename, size: upload.size })
  }
  return picked
}

/** Enregistre une pièce jointe là où l'utilisateur le choisit. */
export async function saveAttachment(
  pluginId: string,
  accountId: string,
  id: string,
  index: number,
  window: BrowserWindow | null
): Promise<boolean> {
  ensurePermission(pluginId)
  let raw = rawCache.get(`${accountId}|${id}`)
  if (!raw) {
    raw = (await withAccount(accountId, (connection) => connection.getRaw(String(id)))).raw
  }
  const attachment = await extractAttachment(raw, Number(index))
  if (!attachment) throw mailError('not-found', 'attachment')
  const options = { defaultPath: attachment.filename.replace(/[\\/:*?"<>|]/g, '_') }
  const result = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return false
  await writeFile(result.filePath, attachment.content)
  return true
}

/** Pièces jointes ouvertes (copies temporaires), vidé au lancement suivant de Tessera. */
const openedAttachments = (): string =>
  join(app.getPath('temp'), 'Tessera Dashboard', 'attachments')

/** Programmes et scripts : jamais ouverts depuis un mail, seulement enregistrés. */
const RISKY_ATTACHMENT =
  /\.(exe|msi|msix|msixbundle|appx|appxbundle|bat|cmd|com|scr|pif|cpl|ps1|psm1|psd1|vbs|vbe|js|jse|wsf|wsh|hta|jar|lnk|url|reg|scf|inf|application|gadget|msc|dll|sys|iso|img|vhd|vhdx)$/i

/**
 * Ouvre une pièce jointe : copie dans un dossier temporaire, marquée comme venue d'Internet
 * (Windows prévient avant d'ouvrir ce qui le demande), puis l'interface l'ouvre dans le bloc qui
 * doit l'afficher. Renvoie son chemin, ou `null` pour un programme ou un script (à enregistrer).
 */
export async function openAttachment(
  pluginId: string,
  accountId: string,
  id: string,
  index: number
): Promise<string | null> {
  ensurePermission(pluginId)
  let raw = rawCache.get(`${accountId}|${id}`)
  if (!raw) {
    raw = (await withAccount(accountId, (connection) => connection.getRaw(String(id)))).raw
  }
  const attachment = await extractAttachment(raw, Number(index))
  if (!attachment) throw mailError('not-found', 'attachment')
  const name =
    attachment.filename
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[. ]+$/, '')
      .slice(0, 150) || 'attachment'
  if (RISKY_ATTACHMENT.test(name)) return null
  const folder = join(openedAttachments(), randomUUID())
  await mkdir(folder, { recursive: true })
  const file = join(folder, name)
  await writeFile(file, attachment.content)
  await writeFile(`${file}:Zone.Identifier`, '[ZoneTransfer]\r\nZoneId=3\r\n').catch(() => {})
  return file
}

/** Copies des pièces jointes ouvertes lors d'un lancement précédent : effacées. */
export function clearOpenedAttachments(): void {
  void rm(openedAttachments(), { recursive: true, force: true }).catch(() => {})
}

/**
 * Lien cliqué dans un mail : une page (http, https) va dans un bloc Navigateur s'il y en a un
 * (sinon le navigateur par défaut), un `mailto:` à la messagerie de Windows.
 */
export async function openMailLink(
  pluginId: string,
  url: string,
  sender?: WebContents
): Promise<void> {
  ensurePermission(pluginId)
  const parsed = URL.canParse(String(url)) ? new URL(String(url)) : null
  if (!parsed || !['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
    throw mailError('invalid', 'url')
  }
  if (parsed.protocol === 'mailto:') await shell.openExternal(parsed.toString())
  else openPageFrom(sender, parsed.toString())
}

export const cancelConnect = (): void => cancelAuthorization()

// ---------------------------------------------------------------------------
// Vérification des nouveaux mails
// ---------------------------------------------------------------------------

const checking = new Set<string>()

/** Vérifie la boîte de réception d'un compte et notifie les nouveaux mails. */
async function checkAccount(accountId: string): Promise<void> {
  if (checking.has(accountId)) return
  checking.add(accountId)
  try {
    const page = await withAccount(accountId, (connection) =>
      connection.list(DEFAULT_QUERY, null, PAGE_SIZE)
    )
    const known = seen.get(accountId)
    // Premier passage : seuls les mails arrivés depuis la dernière vérification sont nouveaux
    const since = newestSeen.get(accountId) ?? lastChecks.get()[accountId] ?? Date.now()
    const fresh = page.messages.filter(
      (message) => message.unread && message.date > since && !known?.has(message.id)
    )
    seen.set(accountId, new Set([...(known ?? []), ...page.messages.map((item) => item.id)]))
    newestSeen.set(accountId, Math.max(since, ...page.messages.map((message) => message.date)))
    lastChecks.set({ ...lastChecks.get(), [accountId]: Date.now() })
    setState(
      accountId,
      { unread: page.unread, error: null, checkedAt: Date.now() },
      fresh.length > 0
    )
    await notifyFresh(accountId, fresh)
  } catch {
    // L'erreur est déjà notée dans l'état du compte
  } finally {
    checking.delete(accountId)
  }
}

async function notifyFresh(accountId: string, fresh: MailPage['messages']): Promise<void> {
  if (fresh.length === 0) return
  const account = findAccount(accountId)
  const source = mailSource(accountId)
  if (fresh.length > MAX_NOTIFIED) {
    await notify(source, {
      title: account.name,
      body: getTranslation().mail.newMessages.replace('{{count}}', String(fresh.length)),
      tag: 'summary'
    })
    return
  }
  for (const message of fresh.reverse()) {
    await notify(source, {
      title: message.from.name || message.from.address,
      body: [message.subject, message.snippet].filter(Boolean).join('\n'),
      target: message.id
    })
  }
}

let timer: NodeJS.Timeout | undefined

function schedule(): void {
  clearInterval(timer)
  const minutes = getSettings().mail.checkMinutes
  timer = setInterval(() => {
    for (const account of accounts()) void checkAccount(account.id)
  }, minutes * 60_000)
}

/** Vérifie tout de suite (bouton « Actualiser » d'un widget). */
export async function checkNow(pluginId: string, accountId: string): Promise<void> {
  ensurePermission(pluginId)
  await checkAccount(accountId)
}

export function initMail(next: MailListeners): void {
  listeners = next
  lastChecks.load()
  schedule()
  // Premier passage peu après le démarrage
  setTimeout(() => {
    for (const account of accounts()) void checkAccount(account.id)
  }, 5_000)

  onSettingsChange((settings, previous) => {
    if (settings.mail.checkMinutes !== previous.mail.checkMinutes) schedule()
    if (settings.mail.googleClientId !== previous.mail.googleClientId) {
      for (const account of settings.mail.accounts) {
        if (account.provider === 'gmail') disconnect(account.id)
      }
    }
    // Comptes retirés : connexion fermée et secrets effacés
    const ids = settings.mail.accounts.map((account) => account.id)
    for (const id of connections.keys()) if (!ids.includes(id)) disconnect(id)
    const removed = previous.mail.accounts
      .map((account) => account.id)
      .filter((id) => !ids.includes(id))
    if (removed.length > 0) removeAccountSecrets(removed)
  })
}

export function stopMail(): void {
  clearInterval(timer)
  for (const id of [...connections.keys()]) disconnect(id)
}
