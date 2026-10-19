/**
 * Applications web (Discord, WhatsApp…) : sites ouverts dans un onglet de Tessera, chacun avec
 * sa propre session (cookies, connexion) conservée entre deux lancements.
 */

export interface WebApp {
  id: string
  name: string
  /** Page d'accueil de l'application. */
  url: string
  /** Icône du site (image `data:`), récupérée à la première ouverture. */
  icon: string | null
}

/** Applications proposées en un clic dans Paramètres → Applications. */
export const WEB_APP_PRESETS: { name: string; url: string }[] = [
  { name: 'Discord', url: 'https://discord.com/app' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com' },
  { name: 'Messenger', url: 'https://www.messenger.com' },
  { name: 'Telegram', url: 'https://web.telegram.org/a/' },
  { name: 'Slack', url: 'https://app.slack.com/client' },
  { name: 'Microsoft Teams', url: 'https://teams.microsoft.com' },
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'Outlook', url: 'https://outlook.live.com/mail/' },
  { name: 'Google Agenda', url: 'https://calendar.google.com' },
  { name: 'Notion', url: 'https://www.notion.so' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'YouTube', url: 'https://www.youtube.com' },
  { name: 'Twitch', url: 'https://www.twitch.tv' }
]

/** Session (cookies, stockage) propre à une application ; `persist:` = conservée sur le disque. */
export function appPartition(appId: string): string {
  return `persist:app-${appId}`
}

/** Session des widgets web qui ne sont rattachés à aucune application. */
export const SHARED_WEB_PARTITION = 'persist:web'

const APP_PARTITION = /^persist:app-[a-z0-9-]{1,64}$/

/** Seules ces sessions peuvent être utilisées par une page web intégrée. */
export function isWebPartition(partition: string): boolean {
  return partition === SHARED_WEB_PARTITION || APP_PARTITION.test(partition)
}

/**
 * Adresse saisie par l'utilisateur -> URL web valide (http ou https), ou `null`.
 * « discord.com » devient « https://discord.com/ ».
 */
export function normalizeWebUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null
    return url.href
  } catch {
    return null
  }
}

export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * Messages non lus d'après le titre de la page : « (3) Discord » -> 3, « • Discord » -> « • ».
 * La plupart des messageries web indiquent leurs non-lus ainsi.
 */
export function parseUnreadCount(title: string): number | '•' | null {
  const count = /^\s*\((\d+)\+?\)/.exec(title)
  if (count) return Number(count[1])
  if (/^\s*[•●*]/.test(title)) return '•'
  return null
}

/** Taille maximale d'une icône d'application gardée dans les réglages. */
export const MAX_APP_ICON_LENGTH = 150_000

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/** Liste d'applications valide (identifiants uniques, adresses web). */
export function sanitizeWebApps(input: unknown): WebApp[] {
  if (!Array.isArray(input)) return []
  const ids = new Set<string>()
  const apps: WebApp[] = []
  for (const raw of input) {
    const app = asRecord(raw)
    const id = typeof app.id === 'string' && /^[a-z0-9-]{1,64}$/.test(app.id) ? app.id : null
    const url = typeof app.url === 'string' ? normalizeWebUrl(app.url) : null
    if (!id || !url || ids.has(id)) continue
    ids.add(id)
    const icon =
      typeof app.icon === 'string' &&
      app.icon.startsWith('data:image/') &&
      app.icon.length <= MAX_APP_ICON_LENGTH
        ? app.icon
        : null
    apps.push({
      id,
      name:
        typeof app.name === 'string' && app.name.trim()
          ? app.name.trim().slice(0, 40)
          : new URL(url).hostname,
      url,
      icon
    })
  }
  return apps
}
