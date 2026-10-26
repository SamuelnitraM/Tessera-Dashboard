import {
  INBOX,
  type MailAccount,
  type MailFolder,
  type MailFolderKind,
  type MailSummary
} from '@shared/mail'
import type { MailConnection } from './connection'
import { apiFetch, apiJson, createTokenSource, jsonBody } from '../auth/http'
import { googleClient } from '../auth/providers'

/**
 * Gmail, par l'API Google (« Se connecter avec Google », Paramètres → Comptes).
 * Une seule autorisation : `gmail.modify` (lire, classer, mettre à la corbeille, envoyer ;
 * jamais de suppression définitive).
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: { mimeType?: string; headers?: GmailHeader[] }
  raw?: string
}

function parseFrom(value: string): { name: string; address: string } {
  const match = value.match(/^\s*"?(.*?)"?\s*<([^>]+)>\s*$/)
  return match ? { name: match[1], address: match[2] } : { name: '', address: value.trim() }
}

/** Liste d'adresses d'un en-tête (virgules hors des noms entre guillemets). */
const parseList = (value: string): { name: string; address: string }[] =>
  value
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseFrom)

/** Libellés système de Gmail affichés comme des dossiers habituels. */
const SYSTEM_LABELS: Record<string, MailFolderKind> = {
  INBOX: 'inbox',
  STARRED: 'starred',
  SENT: 'sent',
  DRAFT: 'drafts',
  SPAM: 'spam',
  TRASH: 'trash'
}
/** « Tous les messages » n'est pas un libellé : aucun filtre de libellé. */
const ALL_MAIL = 'ALL'

/** Le texte de l'aperçu Gmail contient des entités HTML (&#39;…). */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function toSummary(message: GmailMessage): MailSummary {
  const header = (name: string): string =>
    message.payload?.headers?.find((item) => item.name.toLowerCase() === name)?.value ?? ''
  return {
    id: message.id,
    threadId: message.threadId,
    from: parseFrom(header('from')),
    subject: header('subject'),
    snippet: decodeEntities(message.snippet ?? ''),
    date: Number(message.internalDate) || Date.now(),
    unread: message.labelIds?.includes('UNREAD') ?? false,
    starred: message.labelIds?.includes('STARRED') ?? false,
    hasAttachments: message.payload?.mimeType === 'multipart/mixed',
    to: parseList(header('to'))
  }
}

export function connectGmail(account: MailAccount): MailConnection {
  const token = createTokenSource(account.id, () => googleClient())
  const modify = (id: string, change: { addLabelIds?: string[]; removeLabelIds?: string[] }) =>
    apiFetch(token, `${API}/messages/${encodeURIComponent(id)}/modify`, jsonBody(change))

  return {
    readsBcc: true,

    async folders() {
      const result = await apiJson<{
        labels?: { id: string; name: string; type: 'system' | 'user' }[]
      }>(token, `${API}/labels`)
      const inbox = await apiJson<{ messagesUnread?: number }>(token, `${API}/labels/INBOX`)
      const folders: MailFolder[] = []
      for (const label of result.labels ?? []) {
        const kind = SYSTEM_LABELS[label.id]
        if (kind) {
          folders.push({
            id: label.id,
            name: label.name,
            kind,
            unread: label.id === 'INBOX' ? (inbox.messagesUnread ?? 0) : null
          })
        } else if (label.type === 'user') {
          folders.push({ id: label.id, name: label.name, kind: 'label', unread: null })
        }
      }
      folders.push({ id: ALL_MAIL, name: 'All Mail', kind: 'all', unread: null })
      return folders
    },

    async list(query, page, limit) {
      const folder = query.folder === INBOX ? 'INBOX' : query.folder
      const params = new URLSearchParams({ maxResults: String(limit) })
      if (folder !== ALL_MAIL) params.set('labelIds', folder)
      const terms = [
        query.filter === 'unread' ? 'is:unread' : query.filter === 'read' ? 'is:read' : '',
        query.search
      ].filter(Boolean)
      if (terms.length) params.set('q', terms.join(' '))
      if (page) params.set('pageToken', page)
      const [list, inbox] = await Promise.all([
        apiJson<{ messages?: { id: string }[]; nextPageToken?: string }>(
          token,
          `${API}/messages?${params}`
        ),
        apiJson<{ messagesUnread?: number }>(token, `${API}/labels/INBOX`)
      ])
      const fields = new URLSearchParams({ format: 'metadata' })
      for (const name of ['From', 'To', 'Subject', 'Date']) fields.append('metadataHeaders', name)
      const messages = await Promise.all(
        (list.messages ?? []).map((item) =>
          apiJson<GmailMessage>(token, `${API}/messages/${item.id}?${fields}`)
        )
      )
      return {
        messages: messages.map(toSummary),
        unread: inbox.messagesUnread ?? 0,
        next: list.nextPageToken ?? null
      }
    },

    async getRaw(id) {
      const message = await apiJson<GmailMessage>(
        token,
        `${API}/messages/${encodeURIComponent(id)}?format=raw`
      )
      return {
        raw: Buffer.from(message.raw ?? '', 'base64url'),
        known: {
          id: message.id,
          threadId: message.threadId,
          unread: message.labelIds?.includes('UNREAD') ?? false,
          starred: message.labelIds?.includes('STARRED') ?? false,
          date: Number(message.internalDate) || Date.now()
        }
      }
    },

    async act(id, action) {
      if (action === 'read') await modify(id, { removeLabelIds: ['UNREAD'] })
      else if (action === 'unread') await modify(id, { addLabelIds: ['UNREAD'] })
      else if (action === 'star') await modify(id, { addLabelIds: ['STARRED'] })
      else if (action === 'unstar') await modify(id, { removeLabelIds: ['STARRED'] })
      else if (action === 'archive') await modify(id, { removeLabelIds: ['INBOX'] })
      else
        await apiFetch(token, `${API}/messages/${encodeURIComponent(id)}/trash`, { method: 'POST' })
    },

    async send(raw, { threadId }) {
      await apiFetch(
        token,
        `${API}/messages/send`,
        jsonBody({ raw: raw.toString('base64url'), ...(threadId ? { threadId } : {}) })
      )
    },

    close: async () => {}
  }
}
