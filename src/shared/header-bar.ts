/**
 * Barre des pages : petits widgets entre le titre de la page et « Modifier » (date et heure,
 * météo, son…), et leurs réglages. Partagé entre main (stockage, services) et renderer.
 */

export const HEADER_WIDGETS = [
  'datetime',
  'weather',
  'media',
  'sound',
  'system',
  'clipboard',
  'calculator',
  'timer',
  'stopwatch',
  'agenda',
  'converter',
  'eyedropper',
  'screenshot',
  'note'
] as const
export type HeaderWidget = (typeof HEADER_WIDGETS)[number]

/** Extension intégrée qui propose les widgets de la barre en blocs (`tessera.toolbox/météo`…). */
export const TOOLBOX_PLUGIN = 'tessera.toolbox'
export const toolboxWidgetType = (widget: HeaderWidget): string => `${TOOLBOX_PLUGIN}/${widget}`

/**
 * Bloc créé quand on glisse un widget de la barre sur une page. L'Horloge de la barre devient
 * le bloc Horloge, avec son calendrier et ses horloges du monde.
 */
export function headerWidgetBlock(widget: HeaderWidget): {
  type: string
  config: Record<string, unknown>
  /** Taille du bloc, si ce n'est pas celle par défaut de son widget. */
  size?: { w: number; h: number }
} {
  return widget === 'datetime'
    ? {
        type: 'tessera.clock/clock',
        config: { showCalendar: true, showWorldClocks: true },
        size: { w: 7, h: 10 }
      }
    : { type: toolboxWidgetType(widget), config: {} }
}

/**
 * Widgets fusionnés (étape 21) : Horloges du monde dans l'Horloge, Concentration dans le
 * Minuteur. Les barres enregistrées avant gardent ainsi leurs widgets.
 */
const MERGED_HEADER_WIDGETS: Record<string, HeaderWidget> = {
  clocks: 'datetime',
  focus: 'timer'
}

/** Glisser-déposer d'un widget de la barre (réordonner, ou en faire un bloc). */
export const HEADER_WIDGET_DRAG = 'application/x-tessera-header-widget'

/** Position des widgets dans la barre, entre le titre de la page et ses boutons. */
export const HEADER_ALIGNS = ['start', 'center', 'end', 'space-between', 'space-around'] as const
export type HeaderAlign = (typeof HEADER_ALIGNS)[number]

/** Lieu choisi (météo, horloges du monde), trouvé par la recherche de villes. */
export interface Place {
  name: string
  /** Région et pays, pour distinguer deux villes du même nom. */
  region: string
  country: string
  latitude: number
  longitude: number
  /** Fuseau horaire IANA (`Europe/Paris`). */
  timeZone: string
}

/** Mesures du widget Système ; celle de la barre est choisie par l'utilisateur. */
export const SYSTEM_METRICS = ['cpu', 'memory', 'disk', 'network'] as const
export type SystemMetric = (typeof SYSTEM_METRICS)[number]

export const SCREENSHOT_TOOLS = ['windows', 'tessera'] as const
export type ScreenshotTool = (typeof SCREENSHOT_TOOLS)[number]

export interface HeaderBarSettings {
  /** Widgets affichés, dans l'ordre. */
  items: HeaderWidget[]
  align: HeaderAlign
  /** Texte de la note rapide. */
  note: string
  weather: { place: Place | null }
  /** Horloges du monde (widget Horloge). */
  clocks: Place[]
  /** Concentration (Minuteur) : cycles Pomodoro (minutes) et Ne pas déranger pendant le travail. */
  focus: {
    work: number
    shortBreak: number
    longBreak: number
    /** Séances de travail avant une longue pause. */
    rounds: number
    doNotDisturb: boolean
  }
  /** Capture d'écran : outil utilisé et dossier des captures de Tessera (vide : par défaut). */
  screenshot: { tool: ScreenshotTool; folder: string }
  /** Mesure affichée dans la barre par le widget Système. */
  system: { metric: SystemMetric }
  /** Dernière conversion choisie. */
  converter: { category: string; from: string; to: string }
}

const MAX_NOTE_LENGTH = 10_000
const MAX_CLOCKS = 8

export const DEFAULT_HEADER_BAR: HeaderBarSettings = {
  items: ['datetime'],
  align: 'end',
  note: '',
  weather: { place: null },
  clocks: [],
  focus: { work: 25, shortBreak: 5, longBreak: 15, rounds: 4, doNotDisturb: true },
  screenshot: { tool: 'windows', folder: '' },
  system: { metric: 'cpu' },
  converter: { category: 'length', from: 'km', to: 'mi' }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function minutes(value: unknown, fallback: number, max = 180): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
    ? value
    : fallback
}

export function sanitizePlace(input: unknown): Place | null {
  const raw = asRecord(input)
  const { latitude, longitude } = raw
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !text(raw.name) ||
    !isTimeZone(raw.timeZone)
  ) {
    return null
  }
  return {
    name: text(raw.name),
    region: text(raw.region),
    country: text(raw.country),
    latitude,
    longitude,
    timeZone: raw.timeZone as string
  }
}

function isTimeZone(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function sanitizeHeaderBar(input: unknown): HeaderBarSettings {
  const raw = asRecord(input)
  const defaults = DEFAULT_HEADER_BAR
  const focus = asRecord(raw.focus)
  const screenshot = asRecord(raw.screenshot)
  const converter = asRecord(raw.converter)
  return {
    items: Array.isArray(raw.items)
      ? [
          ...new Set(
            raw.items
              .map((item: unknown) =>
                typeof item === 'string' ? (MERGED_HEADER_WIDGETS[item] ?? item) : item
              )
              .filter((item): item is HeaderWidget =>
                (HEADER_WIDGETS as readonly unknown[]).includes(item)
              )
          )
        ]
      : defaults.items,
    align: pick(raw.align, HEADER_ALIGNS, defaults.align),
    note: typeof raw.note === 'string' ? raw.note.slice(0, MAX_NOTE_LENGTH) : defaults.note,
    weather: { place: sanitizePlace(asRecord(raw.weather).place) },
    clocks: Array.isArray(raw.clocks)
      ? raw.clocks
          .map(sanitizePlace)
          .filter((place): place is Place => place !== null)
          .slice(0, MAX_CLOCKS)
      : defaults.clocks,
    focus: {
      work: minutes(focus.work, defaults.focus.work),
      shortBreak: minutes(focus.shortBreak, defaults.focus.shortBreak),
      longBreak: minutes(focus.longBreak, defaults.focus.longBreak),
      rounds: minutes(focus.rounds, defaults.focus.rounds, 12),
      doNotDisturb:
        typeof focus.doNotDisturb === 'boolean' ? focus.doNotDisturb : defaults.focus.doNotDisturb
    },
    screenshot: {
      tool: pick(screenshot.tool, SCREENSHOT_TOOLS, defaults.screenshot.tool),
      folder: text(screenshot.folder, 1000)
    },
    system: { metric: pick(asRecord(raw.system).metric, SYSTEM_METRICS, defaults.system.metric) },
    converter: {
      category: text(converter.category, 32) || defaults.converter.category,
      from: text(converter.from, 32) || defaults.converter.from,
      to: text(converter.to, 32) || defaults.converter.to
    }
  }
}

/* ---------- Données échangées avec le processus principal ---------- */

/** Météo d'un lieu (Open-Meteo). Codes météo de l'OMS (`weather_code`). */
export interface WeatherReport {
  current: {
    temperature: number
    apparentTemperature: number
    weatherCode: number
    isDay: boolean
    humidity: number
    windSpeed: number
  }
  hours: { time: string; temperature: number; weatherCode: number; isDay: boolean }[]
  days: {
    date: string
    min: number
    max: number
    weatherCode: number
    precipitationProbability: number | null
  }[]
  /** Heure de la mise à jour (horodatage). */
  updatedAt: number
}

/** Session multimédia de Windows (lecteur, navigateur…) qui joue ou vient de jouer. */
export interface MediaSession {
  /** Application (Spotify, Brave…). */
  app: string
  title: string
  artist: string
  album: string
  playing: boolean
  canPrevious: boolean
  canNext: boolean
  /** Pochette (`data:` URL), si l'application en donne une. */
  thumbnail: string | null
}

export type MediaCommand = 'play-pause' | 'next' | 'previous'

export interface AudioDevice {
  id: string
  name: string
  isDefault: boolean
}

/** Programme qui joue du son (widget Son) : son volume, réglable à part. */
export interface AppAudio {
  /** Programme (chemin de son exécutable, en minuscules). */
  id: string
  name: string
  /** Icône du programme (`data:` URL). */
  icon: string | null
  volume: number
  /** Coupé depuis Tessera (volume à 0, l'ancien est rendu au rallumage). */
  muted: boolean
}

/** Sortie (haut-parleurs) ou entrée (micro) audio. */
export interface AudioEndpoint {
  devices: AudioDevice[]
  /** Volume du périphérique par défaut (0 à 100), `null` sans périphérique. */
  volume: number | null
  muted: boolean
}

export interface AudioState {
  output: AudioEndpoint
  input: AudioEndpoint
}

export type AudioFlow = 'output' | 'input'

export interface SystemStats {
  /** Processeur (%). */
  cpu: number
  memory: { used: number; total: number }
  /** Disque du système (C:). */
  disk: { used: number; total: number; drive: string } | null
  /** Débit réseau (octets par seconde), `null` à la première mesure. */
  network: { down: number; up: number } | null
  /** Durée depuis le démarrage de Windows (secondes). */
  uptime: number
}

/** Programme parmi les plus gourmands (ses processus regroupés par nom). */
export interface TopProcess {
  name: string
  /** Processeur (%, sur tous les cœurs). */
  cpu: number
  /** Mémoire utilisée (octets, ensemble de travail). */
  memory: number
  /** Nombre de processus. */
  count: number
}

export interface ClipboardEntry {
  id: string
  kind: 'text' | 'image'
  /** Texte, ou aperçu réduit de l'image (`data:` URL). */
  text: string
  preview: string | null
  /** Taille de l'image (pixels). */
  size: { width: number; height: number } | null
  pinned: boolean
  copiedAt: number
}

/** Taux de change du jour (Banque centrale européenne), pour 1 euro. */
export interface CurrencyRates {
  date: string
  rates: Record<string, number>
}

export interface Screenshot {
  path: string
  name: string
  /** Aperçu réduit (`data:` URL). */
  preview: string
  createdAt: number
}

/** Répétition d'un événement : les plus courantes, ou une règle de Google Agenda gardée telle quelle. */
export const CALENDAR_REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const
export type CalendarRepeat = (typeof CALENDAR_REPEATS)[number]

/** Réponse d'un invité. */
export type CalendarResponse = 'accepted' | 'declined' | 'tentative' | 'needsAction'

export interface CalendarGuest {
  email: string
  name: string
  response: CalendarResponse
  /** Organisateur de l'événement. */
  organizer: boolean
  /** L'utilisateur lui-même. */
  self: boolean
}

/** Rappel choisi : ceux de l'agenda, aucun, ou un nombre de minutes avant le début. */
export type CalendarReminder = 'default' | 'none' | number

export interface CalendarEvent {
  /** Identifiant unique dans l'état (compte, agenda, événement). */
  id: string
  accountId: string
  calendarId: string
  eventId: string
  /** L'utilisateur peut modifier l'événement (agenda dont il est propriétaire ou éditeur). */
  writable: boolean
  title: string
  /** Début et fin (ISO) ; journée entière : dates `AAAA-MM-JJ`. */
  start: string
  end: string
  allDay: boolean
  location: string
  calendar: string
  /** Couleur de l'agenda (`#rrggbb`). */
  color: string | null
  link: string
  /** Lien de visioconférence (Meet…). */
  meeting: string | null
  /** Rappels (minutes avant le début) : ceux de l'événement, sinon ceux de son agenda. */
  reminders: number[]
  /** L'événement garde les rappels de son agenda. */
  defaultReminders: boolean
  guests: CalendarGuest[]
  /** L'utilisateur organise l'événement : il peut changer ses invités. */
  organizer: boolean
  /** Occurrence d'un événement qui se répète : l'événement d'origine (la série). */
  recurringEventId: string | null
  repeat: CalendarRepeat
}

/** Agenda d'un compte, proposé pour créer un événement. */
export interface CalendarInfo {
  accountId: string
  id: string
  name: string
  color: string | null
  primary: boolean
  writable: boolean
}

/** Création ou modification d'un événement (dates locales `AAAA-MM-JJ`, heures `HH:MM`). */
export interface CalendarEventInput {
  accountId: string
  calendarId: string
  /** Absent : nouvel événement. */
  eventId?: string
  title: string
  location: string
  allDay: boolean
  date: string
  /** Journée entière : dernier jour (inclus). */
  endDate: string
  start: string
  end: string
  /** Rappel ; absent : inchangé. */
  reminder?: CalendarReminder
  /** Adresses des invités (l'organisateur reste) ; absent : inchangés. */
  guests?: string[]
  /** Répétition ; absente ou `custom` : inchangée. */
  repeat?: CalendarRepeat
  /** Occurrence d'une série : la série d'origine, et ce qui change (elle seule, ou toute la série). */
  recurringEventId?: string
  scope?: 'occurrence' | 'series'
}

export interface CalendarState {
  /** Comptes Google qui ont donné accès à leur agenda. */
  accounts: { id: string; email: string; error: string | null }[]
  calendars: CalendarInfo[]
  events: CalendarEvent[]
  updatedAt: number
}
