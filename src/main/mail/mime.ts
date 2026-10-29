import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser'
import MailComposer from 'nodemailer/lib/mail-composer'
import type { MailAddress, MailAttachment, MailDraft, MailMessage, MailSummary } from '@shared/mail'

/**
 * Format des mails (MIME) : lecture d'un mail brut (Gmail et IMAP le donnent tous les deux
 * ainsi) et composition d'un mail à envoyer.
 */

const MAX_TEXT = 500_000
/** Longueur de l'aperçu d'un mail dans la liste. */
const SNIPPET_LENGTH = 200

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Caractère d'après son code (`&#233;`), rien s'il n'existe pas. */
function codePoint(code: number): string {
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
}

/**
 * Aperçu d'un mail : le début de son texte, sur une ligne. HTML (peut-être coupé au milieu) :
 * sans styles, balises ni caractères invisibles (texte caché des lettres d'information).
 */
export function snippetOf(content: string, html = false): string {
  let text = content
  if (html) {
    text = text
      .replace(/<(style|script|head|title)\b[\s\S]*?(<\/\1\s*>|$)/gi, ' ')
      .replace(/<!--[\s\S]*?(-->|$)/g, ' ')
      .replace(/<[^>]*(>|$)/g, ' ')
      .replace(/&#(\d+);/g, (_, code: string) => codePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => codePoint(parseInt(code, 16)))
      .replace(/&nbsp;/gi, ' ')
      .replace(/&(amp|lt|gt|quot|apos);/gi, (_, name: string) => ENTITIES[name.toLowerCase()])
      .replace(/&[a-z]+;/gi, ' ')
  }
  return text
    .replace(/[\u00ad\u200b-\u200f\u2060\ufeff\ufffd]|\u034f/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SNIPPET_LENGTH)
}

function addresses(value: AddressObject | AddressObject[] | undefined): MailAddress[] {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list.flatMap((group) =>
    group.value.flatMap((entry) =>
      entry.group
        ? entry.group.map((member) => ({ name: member.name, address: member.address ?? '' }))
        : [{ name: entry.name, address: entry.address ?? '' }]
    )
  )
}

/** Pièces jointes à lister : les images intégrées au texte (`cid:`) n'en font pas partie. */
const listedAttachments = (mail: ParsedMail): ParsedMail['attachments'] =>
  mail.attachments.filter((attachment) => !attachment.related)

export const parseRaw = (raw: Buffer): Promise<ParsedMail> =>
  simpleParser(raw, { skipTextToHtml: true })

/** Mail brut -> mail à lire. `known` : ce que le fournisseur sait déjà (lu, fil…). */
export async function toMessage(
  raw: Buffer,
  known: Pick<MailSummary, 'id' | 'threadId' | 'unread'> & { date?: number; starred?: boolean }
): Promise<MailMessage> {
  const mail = await parseRaw(raw)
  const from = addresses(mail.from)[0] ?? { name: '', address: '' }
  const text = (mail.text ?? '').slice(0, MAX_TEXT)
  const attachments: MailAttachment[] = listedAttachments(mail).map((attachment, index) => ({
    index,
    filename: attachment.filename || `piece-jointe-${index + 1}`,
    contentType: attachment.contentType,
    size: attachment.size
  }))
  const references = Array.isArray(mail.references)
    ? mail.references
    : mail.references
      ? [mail.references]
      : []
  return {
    ...known,
    starred: known.starred ?? false,
    from,
    subject: mail.subject ?? '',
    snippet: snippetOf(text),
    date: known.date ?? mail.date?.getTime() ?? Date.now(),
    hasAttachments: attachments.length > 0,
    to: addresses(mail.to),
    cc: addresses(mail.cc),
    replyTo: addresses(mail.replyTo),
    html: typeof mail.html === 'string' ? mail.html : null,
    text,
    attachments,
    messageId: mail.messageId ?? null,
    references
  }
}

/** Toutes les pièces jointes listées d'un mail (transfert). */
export async function extractAttachments(
  raw: Buffer
): Promise<{ filename: string; content: Buffer; contentType: string }[]> {
  return listedAttachments(await parseRaw(raw)).map((attachment, index) => ({
    filename: attachment.filename || `piece-jointe-${index + 1}`,
    content: attachment.content,
    contentType: attachment.contentType
  }))
}

/** Contenu d'une pièce jointe (index de `MailMessage.attachments`). */
export async function extractAttachment(
  raw: Buffer,
  index: number
): Promise<{ filename: string; content: Buffer } | null> {
  const attachment = listedAttachments(await parseRaw(raw))[index]
  if (!attachment) return null
  return {
    filename: attachment.filename || `piece-jointe-${index + 1}`,
    content: attachment.content
  }
}

/** Mail à envoyer, au format brut. `keepBcc` : le fournisseur lit lui-même l'en-tête Cci. */
export async function compose(
  draft: MailDraft,
  from: MailAddress,
  files: ({ filename: string; path: string } | { filename: string; content: Buffer })[],
  keepBcc: boolean
): Promise<Buffer> {
  const reply = draft.replyTo
  const node = new MailComposer({
    from: { name: from.name, address: from.address },
    to: draft.to || undefined,
    cc: draft.cc || undefined,
    bcc: draft.bcc || undefined,
    subject: draft.subject,
    text: draft.text,
    html: draft.html || undefined,
    inReplyTo: reply?.messageId ?? undefined,
    references: reply
      ? [...reply.references, ...(reply.messageId ? [reply.messageId] : [])]
      : undefined,
    attachments: files
  }).compile()
  node.keepBcc = keepBcc
  return node.build()
}
