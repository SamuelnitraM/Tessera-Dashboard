import type { MailAction, MailPage, MailSummary } from '@shared/mail'

/**
 * Ce que chaque fournisseur (Gmail, Outlook, IMAP) sait faire. Le contenu des mails passe
 * toujours au format brut (MIME), lu par `mime.ts`.
 */
export interface MailConnection {
  /** Boîte de réception, des plus récents aux plus anciens. */
  list: (page: string | null, limit: number) => Promise<MailPage>
  /** Mail brut, avec ce que le fournisseur sait déjà. */
  getRaw: (
    id: string
  ) => Promise<{ raw: Buffer; known: Pick<MailSummary, 'id' | 'threadId' | 'unread' | 'date'> }>
  act: (id: string, action: MailAction) => Promise<void>
  /** Envoie un mail brut (`threadId` : même conversation). */
  send: (raw: Buffer, info: { threadId: string | null; recipients: string[] }) => Promise<void>
  /** Le fournisseur lit-il l'en-tête Cci du mail brut (sinon : enveloppe SMTP) ? */
  readsBcc: boolean
  close: () => Promise<void>
}
