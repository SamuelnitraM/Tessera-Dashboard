import { randomUUID } from 'node:crypto'
import { getMailErrorCode } from '@shared/mail'
import { mailError } from '@shared/mail'
import { interpolate } from '@shared/i18n'
import { CALENDAR_SOURCE } from '@shared/notifications'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarInfo,
  CalendarState
} from '@shared/header-bar'
import { apiFetch, apiJson, createTokenSource, jsonBody, type TokenSource } from './auth/http'
import { googleClient } from './auth/providers'
import { setAccountSecret } from './auth/secrets'
import {
  colorOf,
  EVENT_ID,
  eventBody,
  isWritable,
  toEvent,
  type GoogleCalendar,
  type GoogleEvent
} from './calendar-body'
import { getLanguage, getTranslation } from './i18n'
import { notify } from './notifications'
import { getSettings, updateSettings } from './settings-store'

/**
 * Google Agenda (widget « Agenda » de la barre des pages) : événements des sept
 * prochains jours des agendas affichés dans Google Agenda ; création, modification et
 * suppression dans les agendas dont l'utilisateur est propriétaire ou éditeur (rappels, invités,
 * répétition). Les rappels sont aussi des notifications de Tessera, tant qu'il est ouvert.
 */

const CACHE_MS = 5 * 60_000
const CALENDARS_CACHE_MS = 30 * 60_000
const DAYS = 7
const MAX_CALENDARS = 12

interface AccountCache {
  token: TokenSource
  calendars: { list: GoogleCalendar[]; fetchedAt: number } | null
  /** Événements d'origine des séries (leur répétition), par agenda et identifiant. */
  series: Map<string, { event: GoogleEvent | null; fetchedAt: number }>
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
      series: new Map(),
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
    // `selected` est absent (et non `false`) pour un agenda décoché dans Google Agenda
    .filter((calendar) => calendar.selected === true && !calendar.hidden)
    .slice(0, MAX_CALENDARS)
  entry.calendars = { list, fetchedAt: Date.now() }
  return list
}

const eventUrl = (calendarId: string, eventId = ''): string =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${
    eventId ? `/${encodeURIComponent(eventId)}` : ''
  }`

/** Événements d'origine des séries de ces occurrences (gardés en mémoire un moment). */
async function seriesOf(
  entry: AccountCache,
  calendarId: string,
  events: GoogleEvent[]
): Promise<Map<string, GoogleEvent>> {
  const ids = [...new Set(events.flatMap((event) => event.recurringEventId ?? []))]
  const found = new Map<string, GoogleEvent>()
  await Promise.all(
    ids.map(async (id) => {
      const key = `${calendarId}|${id}`
      let cached = entry.series.get(key)
      if (!cached || Date.now() - cached.fetchedAt > CALENDARS_CACHE_MS) {
        const event = await apiJson<GoogleEvent>(entry.token, eventUrl(calendarId, id)).catch(
          () => null
        )
        cached = { event, fetchedAt: Date.now() }
        entry.series.set(key, cached)
      }
      if (cached.event) found.set(id, cached.event)
    })
  )
  return found
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
        `${eventUrl(calendar.id)}?${params}`
      )
      const items = data.items ?? []
      const series = await seriesOf(entry, calendar.id, items)
      return items
        .map((event) =>
          toEvent(
            event,
            calendar,
            accountId,
            event.recurringEventId ? series.get(event.recurringEventId) : undefined
          )
        )
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
      scheduleReminders(state.events)
      return state
    } finally {
      pending = null
    }
  })()
  return pending
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

/** Événement visé : l'occurrence, ou toute sa série. */
function targetOf(input: {
  eventId?: string
  recurringEventId?: string
  scope?: string
}): string | undefined {
  const id =
    input.scope === 'series' && input.recurringEventId ? input.recurringEventId : input.eventId
  if (id !== undefined && !EVENT_ID.test(String(id))) throw mailError('invalid', 'event')
  return id
}

/** Crée ou modifie un événement (ou toute sa série), puis renvoie l'agenda à jour. */
export async function saveCalendarEvent(input: CalendarEventInput): Promise<CalendarState> {
  const entry = await writableCalendar(input.accountId, input.calendarId)
  const target = targetOf(input)
  // Ce que Google connaît de l'événement : réponses des invités, règles de la série
  const existing = target
    ? await apiJson<GoogleEvent>(entry.token, eventUrl(input.calendarId, target))
    : null
  const { body, sendUpdates } = eventBody(
    input,
    existing,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const query = `?sendUpdates=${sendUpdates}`
  if (target) {
    await apiFetch(entry.token, `${eventUrl(input.calendarId, target)}${query}`, {
      ...jsonBody(body),
      method: 'PATCH'
    })
  } else {
    await apiFetch(entry.token, `${eventUrl(input.calendarId)}${query}`, jsonBody(body))
  }
  entry.series.clear()
  return getCalendar(true)
}

/** Supprime un événement, ou toute sa série (les invités sont prévenus). */
export async function deleteCalendarEvent(
  accountId: string,
  calendarId: string,
  eventId: string,
  scope?: 'occurrence' | 'series',
  recurringEventId?: string
): Promise<CalendarState> {
  const entry = await writableCalendar(accountId, calendarId)
  const target = targetOf({ eventId, recurringEventId, scope })
  if (!target) throw mailError('invalid', 'event')
  await apiFetch(entry.token, `${eventUrl(calendarId, target)}?sendUpdates=all`, {
    method: 'DELETE'
  })
  entry.series.clear()
  return getCalendar(true)
}

/* ---------- Rappels : notifications de Tessera ---------- */

/** Rappels prévus (une minuterie par rappel à venir), et ceux déjà envoyés. */
const reminderTimers = new Map<string, ReturnType<typeof setTimeout>>()
const reminded = new Set<string>()
let refreshTimer: ReturnType<typeof setInterval> | null = null

/** Délai lisible (« 10 min », « 1 h », « 1 j »). */
function delayText(minutes: number): string {
  const text = getTranslation().headerBar.agenda.reminders
  if (minutes % 1440 === 0) return interpolate(text.days, { count: String(minutes / 1440) })
  if (minutes % 60 === 0) return interpolate(text.hours, { count: String(minutes / 60) })
  return interpolate(text.minutes, { count: String(minutes) })
}

function remind(event: CalendarEvent, minutes: number): void {
  const text = getTranslation().headerBar.agenda
  const time = new Intl.DateTimeFormat(getLanguage(), {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(event.start))
  const when =
    minutes === 0
      ? interpolate(text.reminders.now, { time })
      : interpolate(text.reminders.soon, { delay: delayText(minutes), time })
  void notify(CALENDAR_SOURCE, {
    title: event.title || text.untitled,
    body: event.location ? `${when} · ${event.location}` : when,
    tag: event.id
  }).catch(() => undefined)
}

/**
 * Une minuterie par rappel à venir des événements à l'heure (pas les journées entières). Rien
 * n'est prévu quand Tessera est fermé : un rappel manqué n'est pas rattrapé.
 */
function scheduleReminders(events: CalendarEvent[]): void {
  for (const timer of reminderTimers.values()) clearTimeout(timer)
  reminderTimers.clear()
  const now = Date.now()
  for (const event of events) {
    if (event.allDay) continue
    const start = new Date(event.start).getTime()
    for (const minutes of new Set(event.reminders)) {
      const at = start - minutes * 60_000
      const key = `${event.id}|${event.start}|${minutes}`
      if (at <= now || at - now > DAYS * 86_400_000 || reminded.has(key)) continue
      reminderTimers.set(
        key,
        setTimeout(() => {
          reminderTimers.delete(key)
          reminded.add(key)
          remind(event, minutes)
        }, at - now)
      )
    }
  }
}

/**
 * Rappels des agendas connectés : l'agenda est relu toutes les 5 minutes tant que Tessera est
 * ouvert (même sans le widget Agenda), et ses rappels deviennent des notifications.
 */
export function startCalendarReminders(): void {
  const refresh = (): void => {
    if (getSettings().calendar.accounts.length > 0) void getCalendar().catch(() => undefined)
  }
  refresh()
  refreshTimer ??= setInterval(refresh, CACHE_MS)
}

export function stopCalendarReminders(): void {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  for (const timer of reminderTimers.values()) clearTimeout(timer)
  reminderTimers.clear()
}
