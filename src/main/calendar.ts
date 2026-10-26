import { randomUUID } from 'node:crypto'
import { getMailErrorCode } from '@shared/mail'
import { mailError } from '@shared/mail'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarInfo,
  CalendarState
} from '@shared/header-bar'
import { apiFetch, apiJson, createTokenSource, jsonBody, type TokenSource } from './auth/http'
import { googleClient } from './auth/providers'
import { setAccountSecret } from './auth/secrets'
import { getSettings, updateSettings } from './settings-store'

/**
 * Google Agenda (widget « Prochain événement » de la barre des pages) : événements des sept
 * prochains jours des agendas affichés dans Google Agenda ; création, modification et
 * suppression dans les agendas dont l'utilisateur est propriétaire ou éditeur.
 */

const CACHE_MS = 5 * 60_000
const CALENDARS_CACHE_MS = 30 * 60_000
const DAYS = 7
const MAX_CALENDARS = 12

interface GoogleCalendar {
  id: string
  summary?: string
  summaryOverride?: string
  backgroundColor?: string
  selected?: boolean
  hidden?: boolean
  primary?: boolean
  accessRole?: string
}

const isWritable = (calendar: GoogleCalendar): boolean =>
  calendar.accessRole === 'owner' || calendar.accessRole === 'writer'

const colorOf = (calendar: GoogleCalendar): string | null =>
  /^#[0-9a-f]{6}$/i.test(calendar.backgroundColor ?? '') ? (calendar.backgroundColor ?? null) : null

interface GoogleEvent {
  id: string
  status?: string
  summary?: string
  location?: string
  htmlLink?: string
  hangoutLink?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }
  attendees?: { self?: boolean; responseStatus?: string }[]
}

interface AccountCache {
  token: TokenSource
  calendars: { list: GoogleCalendar[]; fetchedAt: number } | null
  error: string | null
}

const accounts = new Map<string, AccountCache>()
let state: CalendarState | null = null
let pending: Promise<CalendarState> | null = null

function account(accountId: string): AccountCache {
  let entry = accounts.get(accountId)
  if (!entry) {
    entry = {
      token: createTokenSource(accountId, () => googleClient()),
      calendars: null,
      error: null
    }
    accounts.set(accountId, entry)
  }
  return entry
}

/** Compte Google qui vient de donner accès à son agenda (même adresse : reconnexion). */
export function saveCalendar(email: string, refreshToken: string): void {
  const list = getSettings().calendar.accounts
  const existing = list.find((item) => item.email.toLowerCase() === email.toLowerCase())
  const id = existing?.id ?? `calendar-${randomUUID()}`
  setAccountSecret(id, { refreshToken })
  accounts.delete(id)
  state = null
  if (!existing) updateSettings({ calendar: { accounts: [...list, { id, email }] } })
}

export function disconnectCalendar(accountId: string): void {
  const list = getSettings().calendar.accounts
  if (!list.some((item) => item.id === accountId)) return
  setAccountSecret(accountId, null)
  accounts.delete(accountId)
  state = null
  updateSettings({ calendar: { accounts: list.filter((item) => item.id !== accountId) } })
}

async function calendarsOf(entry: AccountCache): Promise<GoogleCalendar[]> {
  if (entry.calendars && Date.now() - entry.calendars.fetchedAt < CALENDARS_CACHE_MS) {
    return entry.calendars.list
  }
  const data = await apiJson<{ items?: GoogleCalendar[] }>(
    entry.token,
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader'
  )
  const list = (data.items ?? [])
    .filter((calendar) => calendar.selected !== false && !calendar.hidden)
    .slice(0, MAX_CALENDARS)
  entry.calendars = { list, fetchedAt: Date.now() }
  return list
}

function toEvent(
  event: GoogleEvent,
  calendar: GoogleCalendar,
  accountId: string
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
      : null
  }
}

async function eventsOf(entry: AccountCache, accountId: string): Promise<CalendarEvent[]> {
  const calendars = await calendarsOf(entry)
  const now = new Date()
  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + DAYS * 86_400_000).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25'
  })
  const lists = await Promise.all(
    calendars.map(async (calendar) => {
      const data = await apiJson<{ items?: GoogleEvent[] }>(
        entry.token,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`
      )
      return (data.items ?? [])
        .map((event) => toEvent(event, calendar, accountId))
        .filter((event): event is CalendarEvent => event !== null)
    })
  )
  return lists.flat()
}

/** Début d'un événement (journée entière : minuit, heure locale). */
const startTime = (event: CalendarEvent): number =>
  new Date(event.allDay ? `${event.start}T00:00:00` : event.start).getTime()

export function getCalendar(force = false): Promise<CalendarState> {
  if (!force && state && Date.now() - state.updatedAt < CACHE_MS) return Promise.resolve(state)
  pending ??= (async () => {
    try {
      const list = getSettings().calendar.accounts
      const results = await Promise.all(
        list.map(async (item) => {
          const entry = account(item.id)
          try {
            const events = await eventsOf(entry, item.id)
            entry.error = null
            return events
          } catch (error) {
            entry.error = getMailErrorCode(error)
            return []
          }
        })
      )
      const calendars: CalendarInfo[] = list.flatMap((item) =>
        (account(item.id).calendars?.list ?? []).map((calendar) => ({
          accountId: item.id,
          id: calendar.id,
          name: calendar.summaryOverride ?? calendar.summary ?? item.email,
          color: colorOf(calendar),
          primary: calendar.primary === true,
          writable: isWritable(calendar)
        }))
      )
      state = {
        accounts: list.map((item) => ({ ...item, error: account(item.id).error })),
        calendars,
        events: results
          .flat()
          .sort((a, b) => startTime(a) - startTime(b))
          .slice(0, 40),
        updatedAt: Date.now()
      }
      return state
    } finally {
      pending = null
    }
  })()
  return pending
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

/** Lendemain d'une date `AAAA-MM-JJ` (fin exclue des journées entières de Google). */
function nextDay(date: string): string {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}

/** Agenda modifiable d'un compte connecté, sinon erreur. */
async function writableCalendar(accountId: string, calendarId: string): Promise<AccountCache> {
  if (!getSettings().calendar.accounts.some((item) => item.id === accountId)) {
    throw mailError('not-found', 'account')
  }
  const entry = account(accountId)
  const calendar = (await calendarsOf(entry)).find((item) => item.id === calendarId)
  if (!calendar || !isWritable(calendar)) throw mailError('permission')
  return entry
}

const eventUrl = (calendarId: string, eventId = ''): string =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${
    eventId ? `/${encodeURIComponent(eventId)}` : ''
  }`

/** Crée ou modifie un événement, puis renvoie l'agenda à jour. */
export async function saveCalendarEvent(input: CalendarEventInput): Promise<CalendarState> {
  const title = String(input.title ?? '')
    .trim()
    .slice(0, 500)
  if (
    !DATE.test(input.date) ||
    (input.allDay ? !DATE.test(input.endDate) : !TIME.test(input.start) || !TIME.test(input.end))
  ) {
    throw mailError('invalid', 'date')
  }
  const entry = await writableCalendar(input.accountId, input.calendarId)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  // Fin avant le début (ex. 23:00 – 01:00) : le lendemain
  const endDate = input.allDay
    ? input.endDate
    : input.end <= input.start
      ? nextDay(input.date)
      : input.date
  const body = {
    summary: title,
    location: String(input.location ?? '').slice(0, 500),
    start: input.allDay
      ? { date: input.date, dateTime: null }
      : { dateTime: `${input.date}T${input.start}:00`, timeZone, date: null },
    end: input.allDay
      ? { date: nextDay(endDate < input.date ? input.date : endDate), dateTime: null }
      : { dateTime: `${endDate}T${input.end}:00`, timeZone, date: null }
  }
  if (input.eventId) {
    await apiFetch(entry.token, eventUrl(input.calendarId, input.eventId), {
      ...jsonBody(body),
      method: 'PATCH'
    })
  } else {
    await apiFetch(entry.token, eventUrl(input.calendarId), jsonBody(body))
  }
  return getCalendar(true)
}

export async function deleteCalendarEvent(
  accountId: string,
  calendarId: string,
  eventId: string
): Promise<CalendarState> {
  const entry = await writableCalendar(accountId, calendarId)
  await apiFetch(entry.token, eventUrl(calendarId, eventId), { method: 'DELETE' })
  return getCalendar(true)
}
