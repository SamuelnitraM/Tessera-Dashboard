import type { FetchMessageObject, ImapFlow, MessageStructureObject } from 'imapflow'
import {
  INBOX as DEFAULT_FOLDER,
  mailError,
  type MailAccount,
  type MailFolder,
  type MailFolderKind,
  type MailServer,
  type MailSummary
} from '@shared/mail'
import type { MailConnection } from './connection'
import { getAccountSecret } from '../auth/secrets'
import { snippetOf } from './mime'

/**
 * Autres fournisseurs : IMAP pour lire et classer, SMTP pour envoyer, avec le mot de passe
 * (souvent un « mot de passe d'application ») chiffré par Windows.
 */

export interface ImapSecret {
  password: string
}

const INBOX = 'INBOX'
const TIMEOUT_MS = 20_000

function serverError(error: unknown): Error {
  const raw = error as { authenticationFailed?: boolean; code?: string; responseText?: string }
  const message = error instanceof Error ? error.message : String(error)
  if (message.startsWith('mail-error:')) return error as Error
  if (
    raw?.authenticationFailed ||
    raw?.code === 'EAUTH' ||
    /auth|login|credentials|password/i.test(raw?.responseText ?? '')
  ) {
    return mailError('auth', raw?.responseText ?? message)
  }
  if (
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|timeout/i.test(
      `${raw?.code} ${message}`
    )
  ) {
    return mailError('network', message)
  }
  return mailError('unknown', raw?.responseText ?? message)
}

/**
 * Serveur sur ce PC (ex. Proton Mail Bridge) : certificat auto-signé accepté, connexion non
 * chiffrée permise. Ailleurs, le mot de passe ne part jamais sans chiffrement.
 */
const isLocal = (host: string): boolean => ['localhost', '127.0.0.1', '::1'].includes(host)

// IMAP et SMTP : bibliothèques chargées au premier usage (plus de 200 ms au démarrage sinon)

async function createImapClient(
  server: MailServer,
  user: string,
  password: string
): Promise<ImapFlow> {
  const { ImapFlow } = await import('imapflow')
  const local = isLocal(server.host)
  return new ImapFlow({
    host: server.host,
    port: server.port,
    secure: server.secure,
    // Sans TLS dès la connexion : STARTTLS obligatoire (sauf serveur local)
    doSTARTTLS: server.secure || local ? undefined : true,
    tls: local ? { rejectUnauthorized: false } : undefined,
    auth: { user, pass: password },
    logger: false,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: 5 * 60_000
  } as ConstructorParameters<typeof ImapFlow>[0])
}

async function createSmtpTransport(server: MailServer, user: string, password: string) {
  const { default: nodemailer } = await import('nodemailer')
  return nodemailer.createTransport({
    host: server.host,
    port: server.port,
    secure: server.secure,
    requireTLS: !server.secure && !isLocal(server.host),
    tls: isLocal(server.host) ? { rejectUnauthorized: false } : undefined,
    auth: { user, pass: password },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS
  })
}

/** Vérifie les serveurs avant d'ajouter le compte (connexion IMAP et SMTP). */
export async function verifyImapAccount(
  imap: MailServer,
  smtp: MailServer,
  user: string,
  password: string
): Promise<void> {
  const client = await createImapClient(imap, user, password)
  try {
    await client.connect()
    await client.logout()
  } catch (error) {
    throw serverError(error)
  } finally {
    client.close()
  }
  try {
    await (await createSmtpTransport(smtp, user, password)).verify()
  } catch (error) {
    throw serverError(error)
  }
}

function hasAttachment(node: MessageStructureObject | undefined): boolean {
  if (!node) return false
  if (node.disposition === 'attachment') return true
  return node.childNodes?.some(hasAttachment) ?? false
}

/**
 * Identifiant d'un mail : son dossier et son numéro (UID), qui n'est unique que dans son
 * dossier. Séparés par un saut de ligne (impossible dans un nom de dossier).
 */
const mailId = (path: string, uid: number): string => `${path}\n${uid}`

function parseId(id: string): { path: string; uid: string } {
  const index = id.lastIndexOf('\n')
  // Identifiant de l'étape 10 (UID seul) : boîte de réception
  if (index < 0) return { path: INBOX, uid: id }
  return { path: id.slice(0, index), uid: id.slice(index + 1) }
}

/** Dossiers habituels, d'après le rôle annoncé par le serveur. */
const SPECIAL_USE: Record<string, MailFolderKind> = {
  '\\Sent': 'sent',
  '\\Drafts': 'drafts',
  '\\All': 'all',
  '\\Archive': 'archive',
  '\\Junk': 'spam',
  '\\Trash': 'trash',
  '\\Flagged': 'starred'
}
/** Dossier virtuel : mails suivis de la boîte de réception (serveur sans dossier « Suivis »). */
const STARRED = '\u0000starred'

/** Partie qui donne l'aperçu d'un mail : son texte, sinon son HTML. */
interface TextPart {
  /** Numéro de la partie (`TEXT` : mail d'une seule partie). */
  key: string
  html: boolean
  encoding: string
  charset: string
}

/**
 * Octets lus au début de la partie (texte, HTML) : assez pour l'aperçu, sans télécharger le mail.
 * Le HTML commence souvent par ses styles.
 */
const PREVIEW_BYTES = { text: 2048, html: 12_288 }
/** Aperçus gardés en mémoire (par mail) : pas relus à chaque vérification. */
const SNIPPET_CACHE = 2000

function textPart(root: MessageStructureObject | undefined): TextPart | null {
  const found: Record<'plain' | 'html', MessageStructureObject | null> = { plain: null, html: null }
  const walk = (node: MessageStructureObject): void => {
    if (node.disposition === 'attachment' || node.type === 'message/rfc822') return
    if (node.childNodes) return node.childNodes.forEach(walk)
    if (node.type === 'text/plain') found.plain ??= node
    else if (node.type === 'text/html') found.html ??= node
  }
  if (root) walk(root)
  const node = found.plain ?? found.html
  if (!node) return null
  return {
    key: node.part ?? 'TEXT',
    html: node === found.html,
    encoding: (node.encoding ?? '').toLowerCase(),
    charset: node.parameters?.charset ?? 'utf-8'
  }
}

/** Début d'une partie, encore encodée (base64, quoted-printable) : son texte. */
function decodePart(raw: Buffer, part: TextPart): string {
  let bytes = raw
  if (part.encoding === 'base64') {
    const clean = raw.toString('latin1').replace(/[^A-Za-z0-9+/]/g, '')
    bytes = Buffer.from(clean.slice(0, clean.length - (clean.length % 4)), 'base64')
  } else if (part.encoding === 'quoted-printable') {
    const text = raw.toString('latin1').replace(/=\r?\n/g, '')
    const decoded: number[] = []
    for (let i = 0; i < text.length; i++) {
      const hex = text[i] === '=' ? text.slice(i + 1, i + 3) : ''
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        decoded.push(parseInt(hex, 16))
        i += 2
      } else decoded.push(text.charCodeAt(i) & 0xff)
    }
    bytes = Buffer.from(decoded)
  }
  let text: string
  try {
    text = new TextDecoder(part.charset).decode(bytes)
  } catch {
    // Jeu de caractères inconnu
    text = new TextDecoder().decode(bytes)
  }
  return snippetOf(text, part.html)
}

function toSummary(path: string, message: FetchMessageObject): MailSummary {
  const from = message.envelope?.from?.[0]
  const date = message.internalDate ?? message.envelope?.date
  return {
    id: mailId(path, message.uid),
    threadId: null,
    from: { name: from?.name ?? '', address: from?.address ?? '' },
    subject: message.envelope?.subject ?? '',
    snippet: '',
    date: date ? new Date(date).getTime() : Date.now(),
    unread: !message.flags?.has('\\Seen'),
    starred: message.flags?.has('\\Flagged') ?? false,
    hasAttachments: hasAttachment(message.bodyStructure),
    to: (message.envelope?.to ?? []).map((item) => ({
      name: item.name ?? '',
      address: item.address ?? ''
    }))
  }
}

export function connectImap(account: MailAccount): MailConnection {
  const { imap, smtp } = account
  const user = account.username ?? account.address
  if (!imap || !smtp) throw mailError('invalid', 'server')
  const password = (): string => {
    const secret = getAccountSecret<ImapSecret>(account.id)
    if (!secret?.password) throw mailError('auth', 'no-password')
    return secret.password
  }

  let client: ImapFlow | null = null
  let connecting: Promise<ImapFlow> | null = null
  const snippets = new Map<string, string>()

  /** Connexion gardée ouverte, rouverte si le serveur l'a fermée. */
  const connection = (): Promise<ImapFlow> => {
    if (client?.usable) return Promise.resolve(client)
    connecting ??= (async () => {
      const next = await createImapClient(imap, user, password())
      next.on('error', () => {})
      try {
        await next.connect()
      } catch (error) {
        next.close()
        throw serverError(error)
      } finally {
        connecting = null
      }
      client = next
      return next
    })()
    return connecting
  }

  /** Opération dans un dossier (verrou : une à la fois). */
  async function inMailbox<T>(path: string, run: (client: ImapFlow) => Promise<T>): Promise<T> {
    const current = await connection()
    let lock: Awaited<ReturnType<ImapFlow['getMailboxLock']>>
    try {
      lock = await current.getMailboxLock(path)
    } catch (error) {
      throw serverError(error)
    }
    try {
      return await run(current)
    } catch (error) {
      throw serverError(error)
    } finally {
      lock.release()
    }
  }

  /**
   * Aperçu des mails (début de leur texte), lu sans les marquer comme lus : une demande par sorte
   * de partie (souvent une ou deux pour toute la page). Un aperçu illisible reste vide.
   */
  async function readSnippets(
    current: ImapFlow,
    path: string,
    parts: Map<number, TextPart>
  ): Promise<void> {
    const groups = new Map<string, number[]>()
    for (const [uid, part] of parts) {
      const group = `${part.key}|${part.html}`
      groups.set(group, [...(groups.get(group) ?? []), uid])
    }
    for (const [group, uids] of groups) {
      const [key, html] = group.split('|')
      const maxLength = html === 'true' ? PREVIEW_BYTES.html : PREVIEW_BYTES.text
      try {
        for await (const message of current.fetch(
          uids.join(','),
          { uid: true, bodyParts: [{ key, maxLength }] },
          { uid: true }
        )) {
          const part = parts.get(message.uid)
          const raw = message.bodyParts?.values().next().value
          if (!part || !raw) continue
          snippets.set(mailId(path, message.uid), decodePart(raw, part))
        }
      } catch {
        // Sans aperçu : la liste s'affiche quand même
      }
    }
    for (const key of [...snippets.keys()].slice(0, -SNIPPET_CACHE)) snippets.delete(key)
  }

  /** Dossier spécial (Archives, Corbeille, Envoyés), d'après le serveur ou son nom. */
  async function specialFolder(use: '\\Archive' | '\\Trash' | '\\Sent'): Promise<string | null> {
    const folders = await (await connection()).list()
    const names: Record<typeof use, RegExp> = {
      '\\Archive': /^(archives?|all mail|tous les messages)$/i,
      '\\Trash': /^(trash|corbeille|deleted items|éléments supprimés|bin)$/i,
      '\\Sent': /^(sent|sent items|sent mail|envoyés|messages envoyés|éléments envoyés)$/i
    }
    return (
      folders.find((folder) => folder.specialUse === use)?.path ??
      folders.find((folder) => names[use].test(folder.name))?.path ??
      null
    )
  }

  return {
    readsBcc: false,

    async folders() {
      const listed = await (await connection()).list({ statusQuery: { unseen: true } })
      const folders: MailFolder[] = []
      for (const folder of listed) {
        if (folder.flags.has('\\Noselect') || folder.flags.has('\\NonExistent')) continue
        const inbox = folder.path.toUpperCase() === INBOX
        folders.push({
          id: folder.path,
          name: inbox ? 'Inbox' : folder.name,
          kind: inbox
            ? 'inbox'
            : ((folder.specialUse ? SPECIAL_USE[folder.specialUse] : undefined) ?? 'label'),
          unread: folder.status?.unseen ?? null
        })
      }
      if (!folders.some((folder) => folder.kind === 'starred')) {
        folders.push({ id: STARRED, name: 'Starred', kind: 'starred', unread: null })
      }
      return folders
    },

    async list(query, page, limit) {
      const path =
        query.folder === DEFAULT_FOLDER || query.folder === STARRED ? INBOX : query.folder
      const result = await inMailbox(path, async (current) => {
        // Connexion gardée ouverte : le serveur n'annonce les nouveaux mails qu'à l'échange suivant
        await current.noop()
        const criteria: Record<string, unknown> = { all: true }
        if (query.filter !== 'all') criteria.seen = query.filter === 'read'
        if (query.folder === STARRED) criteria.flagged = true
        if (query.search) {
          criteria.or = [
            { subject: query.search },
            { from: query.search },
            { to: query.search },
            { body: query.search }
          ]
        }
        const found = await current.search(criteria, { uid: true })
        const uids = (Array.isArray(found) ? found : []).sort((a, b) => b - a)
        // Page : position dans la liste (les plus récents d'abord)
        const offset = Math.max(0, Number(page) || 0)
        const slice = uids.slice(offset, offset + limit)
        const messages: MailSummary[] = []
        const parts = new Map<number, TextPart>()
        if (slice.length) {
          for await (const message of current.fetch(
            slice.join(','),
            { uid: true, flags: true, envelope: true, internalDate: true, bodyStructure: true },
            { uid: true }
          )) {
            const summary = toSummary(path, message)
            summary.snippet = snippets.get(summary.id) ?? ''
            messages.push(summary)
            const part = textPart(message.bodyStructure)
            if (part && !snippets.has(summary.id)) parts.set(message.uid, part)
          }
        }
        await readSnippets(current, path, parts)
        for (const message of messages) message.snippet = snippets.get(message.id) ?? ''
        return {
          messages: messages.sort((a, b) => b.date - a.date),
          next: offset + limit < uids.length ? String(offset + limit) : null
        }
      })
      const status = await (await connection()).status(INBOX, { unseen: true })
      return { ...result, unread: status ? (status.unseen ?? 0) : 0 }
    },

    async getRaw(id) {
      const { path, uid } = parseId(id)
      return inMailbox(path, async (current) => {
        const message = await current.fetchOne(
          uid,
          { uid: true, flags: true, source: true, internalDate: true },
          { uid: true }
        )
        if (!message || !message.source) throw mailError('not-found')
        return {
          raw: message.source,
          known: {
            id,
            threadId: null,
            unread: !message.flags?.has('\\Seen'),
            starred: message.flags?.has('\\Flagged') ?? false,
            date: message.internalDate ? new Date(message.internalDate).getTime() : Date.now()
          }
        }
      })
    },

    async act(id, action) {
      const { path, uid } = parseId(id)
      const flags: Partial<Record<typeof action, [string, boolean]>> = {
        read: ['\\Seen', true],
        unread: ['\\Seen', false],
        star: ['\\Flagged', true],
        unstar: ['\\Flagged', false]
      }
      const flag = flags[action]
      if (flag) {
        await inMailbox(path, (current) =>
          flag[1]
            ? current.messageFlagsAdd(uid, [flag[0]], { uid: true })
            : current.messageFlagsRemove(uid, [flag[0]], { uid: true })
        )
        return
      }
      const folder = await specialFolder(action === 'archive' ? '\\Archive' : '\\Trash')
      if (!folder) throw mailError('no-folder', action)
      await inMailbox(path, (current) => current.messageMove(uid, folder, { uid: true }))
    },

    async send(raw, { recipients }) {
      try {
        await (
          await createSmtpTransport(smtp, user, password())
        ).sendMail({
          envelope: { from: account.address, to: recipients },
          raw
        })
      } catch (error) {
        throw serverError(error)
      }
      // Copie dans « Envoyés » (Gmail la fait lui-même)
      if (imap.host === 'imap.gmail.com') return
      try {
        const sent = await specialFolder('\\Sent')
        if (sent) await (await connection()).append(sent, raw, ['\\Seen'])
      } catch {
        // Le mail est parti : la copie manquante n'est pas une erreur
      }
    },

    async close() {
      const current = client
      client = null
      await current?.logout().catch(() => current.close())
    }
  }
}
