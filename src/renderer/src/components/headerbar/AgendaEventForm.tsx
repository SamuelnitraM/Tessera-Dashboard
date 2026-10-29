import { useState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CALENDAR_REPEATS,
  type CalendarEvent,
  type CalendarInfo,
  type CalendarReminder,
  type CalendarRepeat,
  type CalendarState
} from '@shared/header-bar'
import { isMailAddress } from '@shared/mail'
import { mailErrorMessage } from '../../stores/mail'
import { Select } from '../ui/Select'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

const pad = (value: number): string => String(value).padStart(2, '0')
const localDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const localTime = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/** Veille d'une date `AAAA-MM-JJ` (fin d'une journée entière : Google la donne exclue). */
function previousDay(date: string): string {
  const day = new Date(`${date}T12:00:00`)
  day.setDate(day.getDate() - 1)
  return localDate(day)
}

/** Valeurs de départ : l'événement modifié, sinon l'heure pleine suivante, pour une heure. */
function initialValues(event: CalendarEvent | null): {
  title: string
  location: string
  allDay: boolean
  date: string
  endDate: string
  start: string
  end: string
} {
  if (event) {
    const start = new Date(event.start)
    const end = new Date(event.end)
    return {
      title: event.title,
      location: event.location,
      allDay: event.allDay,
      date: event.allDay ? event.start : localDate(start),
      endDate: event.allDay ? previousDay(event.end) : localDate(end),
      start: event.allDay ? '09:00' : localTime(start),
      end: event.allDay ? '10:00' : localTime(end)
    }
  }
  const start = new Date()
  start.setHours(start.getHours() + 1, 0, 0, 0)
  const end = new Date(start.getTime() + 3_600_000)
  return {
    title: '',
    location: '',
    allDay: false,
    date: localDate(start),
    endDate: localDate(start),
    start: localTime(start),
    end: localTime(end)
  }
}

/** Rappels proposés (minutes avant le début). */
const REMINDER_MINUTES = [0, 5, 10, 15, 30, 60, 120, 1440]

/** Rappel de l'événement tel que le formulaire le montre (le premier, s'il en a plusieurs). */
const reminderOf = (event: CalendarEvent | null): CalendarReminder =>
  !event || event.defaultReminders ? 'default' : (event.reminders[0] ?? 'none')

/** Invités affichés dans le champ (sans l'utilisateur ni l'organisateur). */
const guestsOf = (event: CalendarEvent | null): string =>
  (event?.guests ?? [])
    .filter((guest) => !guest.self && !guest.organizer)
    .map((guest) => guest.email)
    .join(', ')

const parseGuests = (text: string): string[] =>
  text
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter(Boolean)

/** Nouvel événement, ou modification (et suppression) d'un événement existant. */
export function AgendaEventForm({
  event,
  calendars,
  onDone,
  onCancel
}: {
  event: CalendarEvent | null
  calendars: CalendarInfo[]
  /** Enregistré ou supprimé : l'agenda à jour. */
  onDone: (state: CalendarState) => void
  onCancel: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const writable = calendars.filter((calendar) => calendar.writable)
  const defaultCalendar = writable.find((calendar) => calendar.primary) ?? writable[0]
  const [values, setValues] = useState(() => initialValues(event))
  const [calendarKey, setCalendarKey] = useState(
    event
      ? `${event.accountId}|${event.calendarId}`
      : defaultCalendar
        ? `${defaultCalendar.accountId}|${defaultCalendar.id}`
        : ''
  )
  const [reminder, setReminder] = useState<CalendarReminder>(() => reminderOf(event))
  const [repeat, setRepeat] = useState<CalendarRepeat>(event?.repeat ?? 'none')
  const [guests, setGuests] = useState(() => guestsOf(event))
  // Occurrence d'une série : elle seule, ou toute la série
  const recurring = !!event?.recurringEventId
  const [scope, setScope] = useState<'occurrence' | 'series'>('occurrence')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountId, calendarId] = calendarKey.split('|')
  const delay = (minutes: number): string =>
    minutes % 1440 === 0
      ? t('headerBar.agenda.reminders.days', { count: minutes / 1440 })
      : minutes % 60 === 0
        ? t('headerBar.agenda.reminders.hours', { count: minutes / 60 })
        : t('headerBar.agenda.reminders.minutes', { count: minutes })
  const reminderLabel = (value: CalendarReminder): string =>
    value === 'default' || value === 'none'
      ? t(`headerBar.agenda.reminderOptions.${value}`)
      : value === 0
        ? t('headerBar.agenda.reminderOptions.start')
        : t('headerBar.agenda.reminderOptions.before', { delay: delay(value) })
  // Rappel d'un autre délai (choisi dans Google Agenda) : proposé lui aussi
  const minutes = [
    ...new Set([...REMINDER_MINUTES, ...(typeof reminder === 'number' ? [reminder] : [])])
  ].sort((a, b) => a - b)
  const reminderChoices: CalendarReminder[] = ['default', 'none', ...minutes]
  // Les invités se changent depuis l'événement de l'organisateur
  const canInvite = !event || event.organizer
  // La répétition se change pour toute la série (ou un événement seul)
  const canRepeat = !recurring || scope === 'series'
  const set = (patch: Partial<typeof values>): void =>
    setValues((current) => ({ ...current, ...patch }))

  const run = (action: () => Promise<CalendarState>): void => {
    setBusy(true)
    setError(null)
    action()
      .then(onDone)
      .catch((failure: unknown) => setError(mailErrorMessage(failure)))
      .finally(() => setBusy(false))
  }

  const save = (): void => {
    const guestList = parseGuests(guests)
    if (guestList.some((email) => !isMailAddress(email))) {
      setError(t('headerBar.agenda.form.invalidGuests'))
      return
    }
    run(() =>
      window.tessera.calendar.saveEvent({
        accountId,
        calendarId,
        eventId: event?.eventId,
        ...values,
        endDate: values.endDate < values.date ? values.date : values.endDate,
        // Seulement ce qui a changé : le reste (plusieurs rappels, règle précise) est gardé
        ...(reminder !== reminderOf(event) || !event ? { reminder } : {}),
        ...(canInvite && guests !== guestsOf(event) ? { guests: guestList } : {}),
        ...(canRepeat && repeat !== (event?.repeat ?? 'none') ? { repeat } : {}),
        ...(recurring ? { recurringEventId: event.recurringEventId!, scope } : {})
      })
    )
  }

  return (
    <form
      className={styles.agenda}
      onSubmit={(submit) => {
        submit.preventDefault()
        if (!busy) save()
      }}
    >
      <PanelTitle
        title={event ? t('headerBar.agenda.form.edit') : t('headerBar.agenda.form.new')}
        settings
        onSettings={onCancel}
      />
      <input
        className={styles.textInput}
        value={values.title}
        placeholder={t('headerBar.agenda.form.title')}
        aria-label={t('headerBar.agenda.form.title')}
        autoFocus
        onChange={(change) => set({ title: change.target.value })}
      />
      {!event && writable.length > 1 && (
        <Select
          value={calendarKey}
          aria-label={t('headerBar.agenda.form.calendar')}
          options={writable.map((calendar) => ({
            value: `${calendar.accountId}|${calendar.id}`,
            label: calendar.name
          }))}
          onChange={setCalendarKey}
        />
      )}
      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={values.allDay}
          onChange={(change) => set({ allDay: change.target.checked })}
        />
        {t('headerBar.agenda.allDay')}
      </label>
      <div className={styles.eventFields}>
        <label>
          <span>
            {values.allDay ? t('headerBar.agenda.form.from') : t('headerBar.agenda.form.date')}
          </span>
          <input
            type="date"
            className={styles.textInput}
            value={values.date}
            required
            onChange={(change) => set({ date: change.target.value })}
          />
        </label>
        {values.allDay ? (
          <label>
            <span>{t('headerBar.agenda.form.to')}</span>
            <input
              type="date"
              className={styles.textInput}
              value={values.endDate}
              min={values.date}
              required
              onChange={(change) => set({ endDate: change.target.value })}
            />
          </label>
        ) : (
          <>
            <label>
              <span>{t('headerBar.agenda.form.start')}</span>
              <input
                type="time"
                className={styles.textInput}
                value={values.start}
                required
                onChange={(change) => set({ start: change.target.value })}
              />
            </label>
            <label>
              <span>{t('headerBar.agenda.form.end')}</span>
              <input
                type="time"
                className={styles.textInput}
                value={values.end}
                required
                onChange={(change) => set({ end: change.target.value })}
              />
            </label>
          </>
        )}
      </div>
      <input
        className={styles.textInput}
        value={values.location}
        placeholder={t('headerBar.agenda.form.location')}
        aria-label={t('headerBar.agenda.form.location')}
        onChange={(change) => set({ location: change.target.value })}
      />
      {recurring && (
        <div className={styles.segmented} role="radiogroup">
          {(['occurrence', 'series'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              className={styles.segment}
              onClick={() => setScope(value)}
            >
              {t(`headerBar.agenda.form.${value}`)}
            </button>
          ))}
        </div>
      )}
      <div className={styles.eventFields}>
        <label>
          <span>{t('headerBar.agenda.form.reminder')}</span>
          <Select
            value={String(reminder)}
            aria-label={t('headerBar.agenda.form.reminder')}
            options={reminderChoices.map((value) => ({
              value: String(value),
              label: reminderLabel(value)
            }))}
            onChange={(value) =>
              setReminder(value === 'default' || value === 'none' ? value : Number(value))
            }
          />
        </label>
        {canRepeat && (
          <label>
            <span>{t('headerBar.agenda.form.repeat')}</span>
            <Select
              value={repeat}
              aria-label={t('headerBar.agenda.form.repeat')}
              options={CALENDAR_REPEATS.filter(
                (value) => value !== 'custom' || event?.repeat === 'custom'
              ).map((value) => ({ value, label: t(`headerBar.agenda.repeats.${value}`) }))}
              onChange={(value) => setRepeat(value as CalendarRepeat)}
            />
          </label>
        )}
      </div>
      {canInvite && (
        <label className={styles.guestsField}>
          <span className={styles.muted}>{t('headerBar.agenda.form.guestsTitle')}</span>
          <input
            className={styles.textInput}
            value={guests}
            placeholder={t('headerBar.agenda.form.guests')}
            aria-label={t('headerBar.agenda.form.guests')}
            spellCheck={false}
            onChange={(change) => setGuests(change.target.value)}
          />
          {parseGuests(guests).length > 0 && (
            <span className={styles.muted}>{t('headerBar.agenda.form.guestsHint')}</span>
          )}
        </label>
      )}
      {(event?.guests.length ?? 0) > 0 && (
        <ul className={styles.guestList}>
          {event!.guests.map((guest) => (
            <li key={guest.email} data-response={guest.response}>
              <span className={styles.guestName}>{guest.name || guest.email}</span>
              <span className={styles.muted}>
                {guest.organizer
                  ? t('headerBar.agenda.organizer')
                  : t(`headerBar.agenda.responses.${guest.response}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        {event && (
          <button
            type="button"
            className={styles.textButton}
            data-danger
            disabled={busy}
            onClick={() =>
              run(() =>
                window.tessera.calendar.deleteEvent(
                  event.accountId,
                  event.calendarId,
                  event.eventId,
                  scope,
                  event.recurringEventId ?? undefined
                )
              )
            }
          >
            <Trash2 size={14} aria-hidden /> {t('headerBar.agenda.form.delete')}
          </button>
        )}
        <button type="button" className={styles.textButton} disabled={busy} onClick={onCancel}>
          {t('headerBar.agenda.form.cancel')}
        </button>
        <button type="submit" className={styles.primaryButton} disabled={busy || !calendarKey}>
          {busy && <LoaderCircle size={14} className={styles.spin} aria-hidden />}
          {t('headerBar.agenda.form.save')}
        </button>
      </div>
    </form>
  )
}
