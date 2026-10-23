import type { MailAction, MailFolder, MailPage, MailQuery, MailSummary } from '@shared/mail'

/**
 * Ce que chaque fournisseur (Gmail, IMAP) sait faire. Le contenu des mails passe
 * toujours au format brut (MIME), lu par `mime.ts`.
 */
export interface MailConnection {
  /** Dossiers et libellés du compte. */
  folders: () => Promise<MailFolder[]>
  /**
   * Mails d'un dossier, des plus récents aux plus anciens (filtrés, recherchés). `unread` de
   * la page : non lus de la boîte de réception.
   */
  list: (query: MailQuery, page: string | null, limit: number) => Promise<MailPage>
  /** Mail brut, avec ce que le fournisseur sait déjà. */
  getRaw: (id: string) => Promise<{
    raw: Buffer
    known: Pick<MailSummary, 'id' | 'threadId' | 'unread' | 'date'> & { starred?: boolean }
  }>
  act: (id: string, action: MailAction) => Promise<void>
  /** Envoie un mail brut (`threadId` : même conversation). */
  send: (raw: Buffer, info: { threadId: string | null; recipients: string[] }) => Promise<void>
  /** Le fournisseur lit-il l'en-tête Cci du mail brut (sinon : enveloppe SMTP) ? */
  readsBcc: boolean
  close: () => Promise<void>
}
