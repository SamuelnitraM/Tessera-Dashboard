import { mailError, type MailAccount, type MailSummary } from '@shared/mail'
import { getSettings } from '../settings-store'
import type { MailConnection } from './connection'
import { apiFetch, apiJson, createTokenSource, jsonBody } from './http'
import type { OAuthClient } from './oauth'

/**
 * Outlook (comptes Microsoft personnels et professionnels), par Microsoft Graph, avec
 * l'application Microsoft Entra de l'utilisateur (Paramètres → Mails).
 */

const API = 'https://graph.microsoft.com/v1.0/me'

export function microsoftClient(): OAuthClient {
  const { microsoftClientId } = getSettings().mail
  if (!microsoftClientId) throw mailError('not-configured', 'microsoft')
  return {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: microsoftClientId,
    scopes: ['offline_access', 'User.Read', 'Mail.ReadWrite', 'Mail.Send'],
    extraParams: { prompt: 'select_account' }
  }
}

export async function fetchOutlookAddress(accessToken: string): Promise<string> {
  const me = await apiJson<{ mail?: string | null; userPrincipalName?: string }>(
    async () => accessToken,
    `${API}?$select=mail,userPrincipalName`
  )
  return me.mail || me.userPrincipalName || ''
}

interface GraphMessage {
  id: string
  conversationId?: string
  subject?: string | null
  bodyPreview?: string
  receivedDateTime?: string
  isRead?: boolean
  hasAttachments?: boolean
  from?: { emailAddress?: { name?: string; address?: string } }
}

const SELECT = 'id,conversationId,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments'

function toSummary(message: GraphMessage): MailSummary {
  return {
    id: message.id,
    threadId: message.conversationId ?? null,
    from: {
      name: message.from?.emailAddress?.name ?? '',
      address: message.from?.emailAddress?.address ?? ''
    },
    subject: message.subject ?? '',
    snippet: message.bodyPreview ?? '',
    date: Date.parse(message.receivedDateTime ?? '') || Date.now(),
    unread: message.isRead === false,
    hasAttachments: message.hasAttachments === true
  }
}

export function connectOutlook(account: MailAccount): MailConnection {
  const token = createTokenSource(account.id, microsoftClient)
  const messageUrl = (id: string): string => `${API}/messages/${encodeURIComponent(id)}`
  const move = (id: string, destinationId: string) =>
    apiFetch(token, `${messageUrl(id)}/move`, jsonBody({ destinationId }))

  return {
    readsBcc: true,

    async list(page, limit) {
      // La page suivante est une adresse complète donnée par Graph : vérifiée avant usage
      const url =
        page && page.startsWith(`${API}/mailFolders/inbox/messages?`)
          ? page
          : `${API}/mailFolders/inbox/messages?$top=${limit}&$select=${SELECT}&$orderby=receivedDateTime desc`
      const [list, inbox] = await Promise.all([
        apiJson<{ value: GraphMessage[]; '@odata.nextLink'?: string }>(token, url),
        apiJson<{ unreadItemCount?: number }>(
          token,
          `${API}/mailFolders/inbox?$select=unreadItemCount`
        )
      ])
      return {
        messages: list.value.map(toSummary),
        unread: inbox.unreadItemCount ?? 0,
        next: list['@odata.nextLink'] ?? null
      }
    },

    async getRaw(id) {
      const [info, raw] = await Promise.all([
        apiJson<GraphMessage>(token, `${messageUrl(id)}?$select=${SELECT}`),
        apiFetch(token, `${messageUrl(id)}/$value`).then(async (response) =>
          Buffer.from(await response.arrayBuffer())
        )
      ])
      const summary = toSummary(info)
      return {
        raw,
        known: {
          id: summary.id,
          threadId: summary.threadId,
          unread: summary.unread,
          date: summary.date
        }
      }
    },

    async act(id, action) {
      if (action === 'read' || action === 'unread') {
        await apiFetch(token, messageUrl(id), {
          ...jsonBody({ isRead: action === 'read' }),
          method: 'PATCH'
        })
      } else {
        await move(id, action === 'archive' ? 'archive' : 'deleteditems')
      }
    },

    async send(raw) {
      // Graph accepte un mail MIME complet, encodé en base64
      await apiFetch(token, `${API}/sendMail`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: raw.toString('base64')
      })
    },

    close: async () => {}
  }
}
