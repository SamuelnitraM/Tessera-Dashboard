/**
 * Notifications de Tessera : celles des applications web (Discord web…), des widgets et
 * modules, et de Tessera elle-même. Elles passent toutes par le processus principal, qui
 * applique les réglages (par source, Ne pas déranger), affiche la bannière Windows, joue le
 * son et les garde dans le centre de notifications.
 *
 * Les applications installées (Discord, Obsidian…) affichent leurs propres notifications
 * Windows : Tessera ne les voit pas.
 */

/**
 * Origine d'une notification :
 * - `app:<id>` : une application web de l'utilisateur
 * - `web` : une page web hors application (bloc « Application web » vers un autre site)
 * - `plugin:<id>` : un widget ou un module
 * - `tessera` : Tessera elle-même (notification de test…)
 */
export type NotificationSource = string

export const WEB_SOURCE = 'web'
export const TESSERA_SOURCE = 'tessera'
export const appSource = (appId: string): NotificationSource => `app:${appId}`
export const pluginSource = (pluginId: string): NotificationSource => `plugin:${pluginId}`

export type NotificationPriority = 'normal' | 'high'
export const NOTIFICATION_PRIORITIES = ['normal', 'high'] as const

/**
 * Son d'une notification :
 * - `system` : son de la bannière Windows
 * - `none` : aucun son
 * - `chime`, `pop`, `bell` : sons de Tessera (synthétisés, aucun fichier)
 * - `custom:<id>` : son importé par l'utilisateur
 */
export type SoundId = string
export const BUILT_IN_SOUNDS = ['chime', 'pop', 'bell'] as const
/** Pour une source : utiliser le son général. */
export const DEFAULT_SOUND = 'default'

export const customSound = (id: string): SoundId => `custom:${id}`

export interface CustomSound {
  id: string
  name: string
  /** Nom du fichier dans le dossier des sons (`%APPDATA%\Tessera Dashboard\sounds`). */
  file: string
}

/** Formats de sons acceptés à l'import, et taille maximale. */
export const SOUND_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'] as const
export const MAX_SOUND_BYTES = 3 * 1024 * 1024

export interface SourceSettings {
  enabled: boolean
  /** `default` ou un son. */
  sound: string
  /** Prioritaire : passe même en mode Ne pas déranger, et la bannière reste affichée. */
  priority: NotificationPriority
}

export const DEFAULT_SOURCE_SETTINGS: SourceSettings = {
  enabled: true,
  sound: DEFAULT_SOUND,
  priority: 'normal'
}

export interface NotificationSettings {
  /** Bannières Windows (en bas à droite de l'écran). */
  banners: boolean
  /** Son par défaut. */
  sound: SoundId
  /** Volume des sons de Tessera et des sons importés (0 à 100). */
  volume: number
  /** Ne pas déranger, activé à la main. */
  doNotDisturb: boolean
  /** Ne pas déranger, chaque jour entre deux heures (« HH:MM », peut passer minuit). */
  schedule: { enabled: boolean; from: string; to: string }
  /** Réglages par source (absente = valeurs par défaut). */
  sources: Record<NotificationSource, SourceSettings>
  sounds: CustomSound[]
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  banners: true,
  sound: 'chime',
  volume: 70,
  doNotDisturb: false,
  schedule: { enabled: false, from: '22:00', to: '08:00' },
  sources: {},
  sounds: []
}

/** Notification gardée dans le centre de notifications. */
export interface TesseraNotification {
  id: string
  source: NotificationSource
  title: string
  body: string
  /** Icône (image `data:`), ou `null` : celle de la source. */
  icon: string | null
  createdAt: number
  read: boolean
  priority: NotificationPriority
}

/** Ce qu'un widget, un module ou une page web demande d'afficher. */
export interface NotifyInput {
  title: string
  body?: string
  /** Icône : image `data:`, ou adresse http(s) pour une page web. */
  icon?: string | null
  /** Une notification avec la même étiquette remplace la précédente (même source). */
  tag?: string
}

/** Nombre maximal de notifications gardées dans l'historique. */
export const MAX_NOTIFICATIONS = 200

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const minutes = (time: string): number => {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

/** Ne pas déranger est-il actif à cet instant (à la main ou selon l'horaire) ? */
export function isDoNotDisturbActive(settings: NotificationSettings, now = new Date()): boolean {
  if (settings.doNotDisturb) return true
  const { enabled, from, to } = settings.schedule
  if (!enabled || from === to) return false
  const current = now.getHours() * 60 + now.getMinutes()
  const start = minutes(from)
  const end = minutes(to)
  // Horaire qui passe minuit (22:00 -> 08:00) ou dans la même journée (13:00 -> 14:00)
  return start < end ? current >= start && current < end : current >= start || current < end
}

/** Son à jouer pour une source : le sien, ou le son par défaut. */
export function resolveSound(settings: NotificationSettings, source: NotificationSource): SoundId {
  const own = settings.sources[source]?.sound ?? DEFAULT_SOUND
  return own === DEFAULT_SOUND ? settings.sound : own
}

export function sourceSettings(
  settings: NotificationSettings,
  source: NotificationSource
): SourceSettings {
  return settings.sources[source] ?? DEFAULT_SOURCE_SETTINGS
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

const SOURCE = /^(tessera|web|app:[a-z0-9-]{1,64}|plugin:[a-z0-9.-]{1,64})$/
const SOUND = /^(system|none|chime|pop|bell|custom:[a-z0-9-]{1,64})$/

const isSound = (value: unknown): value is SoundId => typeof value === 'string' && SOUND.test(value)

/** Réglages de notifications valides, à partir de n'importe quelle donnée. */
export function sanitizeNotificationSettings(input: unknown): NotificationSettings {
  const root = asRecord(input)
  const defaults = DEFAULT_NOTIFICATION_SETTINGS
  const schedule = asRecord(root.schedule)

  const sounds: CustomSound[] = []
  for (const raw of Array.isArray(root.sounds) ? root.sounds : []) {
    const sound = asRecord(raw)
    if (
      typeof sound.id === 'string' &&
      /^[a-z0-9-]{1,64}$/.test(sound.id) &&
      typeof sound.file === 'string' &&
      /^[a-z0-9-]{1,64}\.(mp3|wav|ogg|m4a)$/.test(sound.file) &&
      !sounds.some((other) => other.id === sound.id)
    ) {
      const name =
        typeof sound.name === 'string' && sound.name.trim() ? sound.name.trim() : sound.id
      sounds.push({ id: sound.id, name: name.slice(0, 60), file: sound.file })
    }
  }
  const soundExists = (sound: SoundId): boolean =>
    !sound.startsWith('custom:') || sounds.some((custom) => customSound(custom.id) === sound)

  const sources: Record<string, SourceSettings> = {}
  for (const [source, raw] of Object.entries(asRecord(root.sources))) {
    if (!SOURCE.test(source)) continue
    const value = asRecord(raw)
    const sound =
      value.sound === DEFAULT_SOUND || (isSound(value.sound) && soundExists(value.sound))
    sources[source] = {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
      sound: sound ? (value.sound as string) : DEFAULT_SOUND,
      priority: value.priority === 'high' ? 'high' : 'normal'
    }
  }

  return {
    banners: typeof root.banners === 'boolean' ? root.banners : defaults.banners,
    sound: isSound(root.sound) && soundExists(root.sound) ? root.sound : defaults.sound,
    volume:
      typeof root.volume === 'number' && Number.isFinite(root.volume)
        ? Math.min(100, Math.max(0, Math.round(root.volume)))
        : defaults.volume,
    doNotDisturb:
      typeof root.doNotDisturb === 'boolean' ? root.doNotDisturb : defaults.doNotDisturb,
    schedule: {
      enabled: typeof schedule.enabled === 'boolean' ? schedule.enabled : defaults.schedule.enabled,
      from:
        typeof schedule.from === 'string' && TIME.test(schedule.from)
          ? schedule.from
          : defaults.schedule.from,
      to:
        typeof schedule.to === 'string' && TIME.test(schedule.to)
          ? schedule.to
          : defaults.schedule.to
    },
    sources,
    sounds
  }
}

/** Historique valide (notifications bien formées, les plus récentes d'abord). */
export function sanitizeNotifications(input: unknown): TesseraNotification[] {
  if (!Array.isArray(input)) return []
  const result: TesseraNotification[] = []
  for (const raw of input) {
    const item = asRecord(raw)
    if (
      typeof item.id !== 'string' ||
      typeof item.source !== 'string' ||
      !SOURCE.test(item.source) ||
      typeof item.title !== 'string' ||
      typeof item.createdAt !== 'number'
    ) {
      continue
    }
    result.push({
      id: item.id,
      source: item.source,
      title: item.title.slice(0, 200),
      body: typeof item.body === 'string' ? item.body.slice(0, 1000) : '',
      icon:
        typeof item.icon === 'string' &&
        item.icon.startsWith('data:image/') &&
        item.icon.length < 150_000
          ? item.icon
          : null,
      createdAt: item.createdAt,
      read: item.read === true,
      priority: item.priority === 'high' ? 'high' : 'normal'
    })
  }
  return result.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_NOTIFICATIONS)
}
