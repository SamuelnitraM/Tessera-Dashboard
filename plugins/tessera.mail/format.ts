import {
  formatAddress,
  type Language,
  type MailAddress,
  type MailMessage
} from '@tessera/plugin-sdk'

/** Date d'un mail dans la liste : l'heure aujourd'hui, sinon le jour (et l'année si ancienne). */
export function shortDate(time: number, language: Language): string {
  const date = new Date(time)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  })
}

export const longDate = (time: number, language: Language): string =>
  new Date(time).toLocaleString(language, { dateStyle: 'full', timeStyle: 'short' })

export const senderName = (address: MailAddress): string => address.name || address.address

export const addressList = (list: MailAddress[]): string => list.map(formatAddress).join(', ')

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Texte brut -> HTML : paragraphes conservés, adresses web cliquables. */
export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\bhttps?:\/\/[^\s<>"]+/g, (url) => `<a href="${url}">${url}</a>`)
}

/** Contenu d'un mail à citer (réponse) ou à reprendre (transfert), en HTML. */
export function messageBodyHtml(message: MailMessage): string {
  if (message.html) {
    // Seul le contenu du corps est repris (pas les styles ni l'en-tête du document d'origine)
    const document = new DOMParser().parseFromString(message.html, 'text/html')
    for (const element of document.querySelectorAll('script, style, link, meta, title')) {
      element.remove()
    }
    return document.body.innerHTML
  }
  return `<p style="white-space: pre-wrap">${textToHtml(message.text)}</p>`
}

/** Objet préfixé (« RE : », « TR : »), sans empiler les préfixes. */
export function prefixedSubject(prefix: string, subject: string): string {
  const bare = subject.replace(/^((re|tr|fw|fwd)\s*:\s*)+/i, '')
  return `${prefix}${bare}`
}

/** Taille d'un fichier (« 12 ko », « 1,4 Mo »). */
export function formatSize(bytes: number, language: Language): string {
  const [value, unit] =
    bytes < 1024
      ? [bytes, 'byte']
      : bytes < 1024 ** 2
        ? [bytes / 1024, 'kilobyte']
        : [bytes / 1024 ** 2, 'megabyte']
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: unit === 'megabyte' ? 1 : 0
  }).format(value)
}
