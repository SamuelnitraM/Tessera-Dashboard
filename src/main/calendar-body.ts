import { isMailAddress, mailError } from '@shared/mail'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarGuest,
  CalendarRepeat,
  CalendarResponse
} from '@shared/header-bar'

/**
 * Google Agenda : conversion des événements de l'API en événements de Tessera, et corps des
 * demandes de création et de modification (rappels, invités, répétition). Sans accès au réseau.
 */

export interface GoogleReminder {
  method?: string
  minutes?: number
}

export interface GoogleCalendar {
  id: string
  summary?: string
  summaryOverride?: string
  backgroundColor?: string
  selected?: boolean
  hidden?: boolean
  primary?: boolean
  accessRole?: string
  defaultReminders?: GoogleReminder[]
}

export interface GoogleAttendee {
  email?: string
  displayName?: string
  self?: boolean
  organizer?: boolean
  responseStatus?: string
}

export interface GoogleEvent {
  id: string
  status?: string
  summary?: string
  location?: string
  htmlLink?: string
  hangoutLink?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }
  attendees?: GoogleAttendee[]
  organizer?: { email?: string; self?: boolean }
  reminders?: { useDefault?: boolean; overrides?: GoogleReminder[] }
  /** Occurrence d'une série : l'événement d'origine. */
  recurringEventId?: string
  /** Événement d'origine d'une série : ses règles (`RRULE:…`, `EXDATE:…`). */
  recurrence?: string[]
}

export const isWritable = (calendar: GoogleCalendar): boolean =>
  calendar.accessRole === 'owner' || calendar.accessRole === 'writer'

export const colorOf = (calendar: GoogleCalendar): string | null =>
  /^#[0-9a-f]{6}$/i.test(calendar.backgroundColor ?? '') ? (calendar.backgroundColor ?? null) : null

/** Rappels affichés par Tessera (notifications) : ceux de Google Agenda à l'écran. */
const popupMinutes = (list: GoogleReminder[] | undefined): number[] =>
  (list ?? [])
    .filter((reminder) => reminder.method === 'popup' && typeof reminder.minutes === 'number')
    .map((reminder) => reminder.minutes!)
    .sort((a, b) => a - b)

/** Règles simples (une par fréquence) ; une règle plus précise est gardée telle quelle. */
const SIMPLE_RULES: Record<Exclude<CalendarRepeat, 'none' | 'custom'>, RegExp> = {
  daily: /^RRULE:FREQ=DAILY(;INTERVAL=1)?$/,
  // Google ajoute le jour de la semaine (celui de l'événement)
  weekly: /^RRULE:FREQ=WEEKLY(;INTERVAL=1)?(;BYDAY=[A-Z]{2})?$/,
  monthly: /^RRULE:FREQ=MONTHLY(;INTERVAL=1)?(;BYMONTHDAY=\d{1,2})?$/,
  yearly: /^RRULE:FREQ=YEARLY(;INTERVAL=1)?$/
}

/** Répétition d'une série d'après ses règles (`undefined` : série inconnue). */
export function repeatOf(rules: string[] | undefined): CalendarRepeat {
  if (!rules) return 'custom'
  const rrules = rules.filter((rule) => rule.startsWith('RRULE:'))
  if (rrules.length === 0) return 'none'
  if (rrules.length > 1) return 'custom'
  const found = (Object.keys(SIMPLE_RULES) as (keyof typeof SIMPLE_RULES)[]).find((repeat) =>
    SIMPLE_RULES[repeat].test(rrules[0])
  )
  return found ?? 'custom'
}

const RESPONSES: CalendarResponse[] = ['accepted', 'declined', 'tentative', 'needsAction']

function guestOf(attendee: GoogleAttendee): CalendarGuest | null {
  if (!attendee.email) return null
  const response = attendee.responseStatus as CalendarResponse
  return {
    email: attendee.email,
    name: attendee.displayName ?? '',
    response: RESPONSES.includes(response) ? response : 'needsAction',
    organizer: attendee.organizer === true,
    self: attendee.self === true
  }
}

/**
 * Événement de l'API -> événement de Tessera. `series` : l'événement d'origine d'une occurrence
 * (sa répétition), s'il est connu. `null` : annulé, ou invitation refusée.
 */
export function toEvent(
  event: GoogleEvent,
  calendar: GoogleCalendar,
  accountId: string,
  series?: GoogleEvent
): CalendarEvent | null {
  const start = event.start?.dateTime ?? event.start?.date
  const end = event.end?.dateTime ?? event.end?.date
  if (!start || !end || event.status === 'cancelled') return null
  // Invitation refusée : pas affichée
  if (
    event.attendees?.some((attendee) => attendee.self && attendee.responseStatus === 'declined')
  ) {
    return null
  }
  const video = event.conferenceData?.entryPoints?.find((point) => point.entryPointType === 'video')
  const defaultReminders = event.reminders?.useDefault !== false
  return {
    id: `${accountId}|${calendar.id}|${event.id}`,
    accountId,
    calendarId: calendar.id,
    eventId: event.id,
    writable: isWritable(calendar),
    title: event.summary ?? '',
    start,
    end,
    allDay: !event.start?.dateTime,
    location: event.location ?? '',
    calendar: calendar.summaryOverride ?? calendar.summary ?? '',
    color: colorOf(calendar),
    link: event.htmlLink?.startsWith('https://') ? event.htmlLink : '',
    meeting: (video?.uri ?? event.hangoutLink ?? '').startsWith('https://')
      ? (video?.uri ?? event.hangoutLink ?? null)
      : null,
    reminders: popupMinutes(
      defaultReminders ? calendar.defaultReminders : event.reminders?.overrides
    ),
    defaultReminders,
    guests: (event.attendees ?? [])
      .map(guestOf)
      .filter((guest): guest is CalendarGuest => guest !== null),
    // Sans organisateur indiqué : un événement de l'utilisateur
    organizer: event.organizer?.self !== false,
    recurringEventId: event.recurringEventId ?? null,
    repeat: event.recurringEventId ? repeatOf(series?.recurrence) : repeatOf(event.recurrence ?? [])
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
/** Identifiant d'un événement Google (base32hex, `_` pour une occurrence). */
export const EVENT_ID = /^[A-Za-z0-9_-]{1,1024}$/
/** Rappel le plus éloigné accepté par Google Agenda (4 semaines). */
const MAX_REMINDER = 40_320
const MAX_GUESTS = 100

/** Date `AAAA-MM-JJ` décalée de quelques jours. */
export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

const daysBetween = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000
  )

/** Date de début d'un événement de l'API (la sienne, sans l'heure). */
const dateOf = (event: GoogleEvent): string | null =>
  (event.start?.date ?? event.start?.dateTime ?? '').slice(0, 10) || null

/**
 * Corps d'une création ou d'une modification. `existing` : l'événement modifié tel que Google le
 * connaît (toute la série si `scope` vaut `series`), pour garder ce qui ne change pas (réponses
 * des invités, exceptions d'une série, sa date de départ). `sendUpdates` : les invités sont
 * prévenus (`all`) ou non.
 */
export function eventBody(
  input: CalendarEventInput,
  existing: GoogleEvent | null,
  timeZone: string
): { body: Record<string, unknown>; sendUpdates: 'all' | 'none' } {
  const title = String(input.title ?? '')
    .trim()
    .slice(0, 500)
  if (
    !DATE.test(input.date) ||
    (input.allDay ? !DATE.test(input.endDate) : !TIME.test(input.start) || !TIME.test(input.end))
  ) {
    throw mailError('invalid', 'date')
  }
  const series = input.scope === 'series'
  // Toute la série : sa date de départ reste, les heures (et la durée) changent
  const date = series && existing ? (dateOf(existing) ?? input.date) : input.date
  const lastDay = addDays(date, Math.max(0, daysBetween(input.date, input.endDate)))
  // Fin avant le début (ex. 23:00 – 01:00) : le lendemain
  const endDate = input.end <= input.start ? addDays(date, 1) : date
  const body: Record<string, unknown> = {
    summary: title,
    location: String(input.location ?? '').slice(0, 500),
    start: input.allDay
      ? { date, dateTime: null }
      : { dateTime: `${date}T${input.start}:00`, timeZone, date: null },
    end: input.allDay
      ? { date: addDays(lastDay, 1), dateTime: null }
      : { dateTime: `${endDate}T${input.end}:00`, timeZone, date: null }
  }

  const reminder = input.reminder
  if (reminder !== undefined) {
    if (reminder === 'default') body.reminders = { useDefault: true }
    else if (reminder === 'none') body.reminders = { useDefault: false, overrides: [] }
    else if (Number.isInteger(reminder) && reminder >= 0 && reminder <= MAX_REMINDER) {
      body.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: reminder }] }
    } else {
      throw mailError('invalid', 'reminder')
    }
  }

  let attendees = existing?.attendees ?? []
  if (input.guests !== undefined) {
    if (!Array.isArray(input.guests)) throw mailError('invalid', 'guests')
    const emails = [
      ...new Set(input.guests.map((email) => String(email).trim().toLowerCase()).filter(Boolean))
    ]
    if (emails.length > MAX_GUESTS || emails.some((email) => !isMailAddress(email))) {
      throw mailError('invalid', 'guests')
    }
    const known = new Map(attendees.map((attendee) => [attendee.email?.toLowerCase(), attendee]))
    // L'organisateur et l'utilisateur restent ; les autres invités gardent leur réponse
    const kept = attendees.filter(
      (attendee) =>
        (attendee.organizer || attendee.self) &&
        !emails.includes(attendee.email?.toLowerCase() ?? '')
    )
    attendees = [...kept, ...emails.map((email) => known.get(email) ?? { email })]
    body.attendees = attendees
  }

  // Une occurrence seule ne change pas la répétition de sa série
  const repeat = input.repeat
  const instanceOnly = !!input.recurringEventId && !series
  if (repeat && repeat !== 'custom' && !instanceOnly) {
    const rules = existing?.recurrence ?? []
    if (repeat !== repeatOf(rules)) {
      // Exceptions de la série (EXDATE…) gardées
      const kept = rules.filter((rule) => !rule.startsWith('RRULE:'))
      body.recurrence = repeat === 'none' ? kept : [...kept, `RRULE:FREQ=${repeat.toUpperCase()}`]
    }
  }

  // Invités avant ou après la modification (un invité retiré est prévenu aussi)
  const invited = [...(existing?.attendees ?? []), ...attendees].some(
    (attendee) => !attendee.self && !attendee.organizer
  )
  return { body, sendUpdates: invited ? 'all' : 'none' }
}
