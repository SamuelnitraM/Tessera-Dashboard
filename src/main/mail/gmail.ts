import { mailError, type MailAccount, type MailSummary } from '@shared/mail'
import { getSettings } from '../settings-store'
import type { MailConnection } from './connection'
import { apiFetch, apiJson, createTokenSource, jsonBody } from './http'
import type { OAuthClient } from './oauth'
import { getSecret, GOOGLE_SECRET } from './secrets'

/**
 * Gmail, par l'API Google, avec le client OAuth de l'utilisateur (Paramètres → Mails).
 * Une seule autorisation : `gmail.modify` (lire, classer, mettre à la corbeille, envoyer ;
 * jamais de suppression définitive).
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export function googleClient(): OAuthClient {
  const { googleClientId } = getSettings().mail
  const clientSecret = getSecret(GOOGLE_SECRET)
  if (!googleClientId || !clientSecret) throw mailError('not-configured', 'google')
  return {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: googleClientId,
    clientSecret,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    // Jeton de rafraîchissement à chaque connexion, et choix du compte
    extraParams: { access_type: 'offline', prompt: 'consent select_account' }
  }
}

/** Adresse du compte qui vient de se connecter. */
export async function fetchGmailAddress(accessToken: string): Promise<string> {
  const profile = await apiJson<{ emailAddress: string }>(async () => accessToken, `${API}/profile`)
  return profile.emailAddress
}

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
    hasAttachments: message.payload?.mimeType === 'multipart/mixed'
  }
}

export function connectGmail(account: MailAccount): MailConnection {
  const token = createTokenSource(account.id, googleClient)
  const modify = (id: string, change: { addLabelIds?: string[]; removeLabelIds?: string[] }) =>
    apiFetch(token, `${API}/messages/${encodeURIComponent(id)}/modify`, jsonBody(change))

  return {
    readsBcc: true,

    async list(page, limit) {
      const query = new URLSearchParams({ labelIds: 'INBOX', maxResults: String(limit) })
      if (page) query.set('pageToken', page)
      const [list, inbox] = await Promise.all([
        apiJson<{ messages?: { id: string }[]; nextPageToken?: string }>(
          token,
          `${API}/messages?${query}`
        ),
        apiJson<{ messagesUnread?: number }>(token, `${API}/labels/INBOX`)
      ])
      const fields = new URLSearchParams({ format: 'metadata' })
      for (const name of ['From', 'Subject', 'Date']) fields.append('metadataHeaders', name)
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
          date: Number(message.internalDate) || Date.now()
        }
      }
    },

    async act(id, action) {
      if (action === 'read') await modify(id, { removeLabelIds: ['UNREAD'] })
      else if (action === 'unread') await modify(id, { addLabelIds: ['UNREAD'] })
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
