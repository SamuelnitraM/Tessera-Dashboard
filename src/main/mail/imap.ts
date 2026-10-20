import { ImapFlow, type FetchMessageObject, type MessageStructureObject } from 'imapflow'
import nodemailer from 'nodemailer'
import { mailError, type MailAccount, type MailServer, type MailSummary } from '@shared/mail'
import type { MailConnection } from './connection'
import { getAccountSecret } from './secrets'

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

function createImapClient(server: MailServer, user: string, password: string): ImapFlow {
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

function createSmtpTransport(server: MailServer, user: string, password: string) {
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
  const client = createImapClient(imap, user, password)
  try {
    await client.connect()
    await client.logout()
  } catch (error) {
    throw serverError(error)
  } finally {
    client.close()
  }
  try {
    await createSmtpTransport(smtp, user, password).verify()
  } catch (error) {
    throw serverError(error)
  }
}

function hasAttachment(node: MessageStructureObject | undefined): boolean {
  if (!node) return false
  if (node.disposition === 'attachment') return true
  return node.childNodes?.some(hasAttachment) ?? false
}

function toSummary(message: FetchMessageObject): MailSummary {
  const from = message.envelope?.from?.[0]
  const date = message.internalDate ?? message.envelope?.date
  return {
    id: String(message.uid),
    threadId: null,
    from: { name: from?.name ?? '', address: from?.address ?? '' },
    subject: message.envelope?.subject ?? '',
    snippet: '',
    date: date ? new Date(date).getTime() : Date.now(),
    unread: !message.flags?.has('\\Seen'),
    hasAttachments: hasAttachment(message.bodyStructure)
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

  /** Connexion gardée ouverte, rouverte si le serveur l'a fermée. */
  const connection = (): Promise<ImapFlow> => {
    if (client?.usable) return Promise.resolve(client)
    connecting ??= (async () => {
      const next = createImapClient(imap, user, password())
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

    async list(page, limit) {
      return inMailbox(INBOX, async (current) => {
        // Connexion gardée ouverte : le serveur n'annonce les nouveaux mails qu'à l'échange suivant
        await current.noop()
        const mailbox = current.mailbox
        const exists = mailbox ? mailbox.exists : 0
        // Page : numéro du dernier mail à afficher (les plus récents ont les plus grands numéros)
        const end = Math.min(exists, page ? Number(page) || exists : exists)
        const start = Math.max(1, end - limit + 1)
        const messages: MailSummary[] = []
        if (end >= 1) {
          for await (const message of current.fetch(`${start}:${end}`, {
            uid: true,
            flags: true,
            envelope: true,
            internalDate: true,
            bodyStructure: true
          })) {
            messages.push(toSummary(message))
          }
        }
        const status = await current.status(INBOX, { unseen: true })
        return {
          messages: messages.sort((a, b) => b.date - a.date),
          unread: status ? (status.unseen ?? 0) : 0,
          next: start > 1 ? String(start - 1) : null
        }
      })
    },

    async getRaw(id) {
      return inMailbox(INBOX, async (current) => {
        const message = await current.fetchOne(
          id,
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
            date: message.internalDate ? new Date(message.internalDate).getTime() : Date.now()
          }
        }
      })
    },

    async act(id, action) {
      if (action === 'read' || action === 'unread') {
        await inMailbox(INBOX, (current) =>
          action === 'read'
            ? current.messageFlagsAdd(id, ['\\Seen'], { uid: true })
            : current.messageFlagsRemove(id, ['\\Seen'], { uid: true })
        )
        return
      }
      const folder = await specialFolder(action === 'archive' ? '\\Archive' : '\\Trash')
      if (!folder) throw mailError('no-folder', action)
      await inMailbox(INBOX, (current) => current.messageMove(id, folder, { uid: true }))
    },

    async send(raw, { recipients }) {
      try {
        await createSmtpTransport(smtp, user, password()).sendMail({
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
