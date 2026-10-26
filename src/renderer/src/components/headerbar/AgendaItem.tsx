import { useEffect, useState } from 'react'
import { CalendarClock, ExternalLink, Pencil, Plus, RefreshCw, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CalendarEvent, CalendarState } from '@shared/header-bar'
import { AccountRequired } from '../../plugin-sdk/AccountRequired'
import { needsReconnect } from '../../plugin-sdk/accounts'
import { mailErrorMessage } from '../../stores/mail'
import { useNavigationStore } from '../../stores/navigation'
import { useSettingsStore } from '../../stores/settings'
import { AgendaEventForm } from './AgendaEventForm'
import { HeaderPopover } from './HeaderPopover'
import { useBlockSize, usePolling } from './helpers'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

const REFRESH_MS = 5 * 60_000
/** Événement affiché dans la barre s'il commence dans les 12 heures. */
const SOON_MS = 12 * 3_600_000

const startOf = (event: CalendarEvent): number =>
  new Date(event.allDay ? `${event.start}T00:00:00` : event.start).getTime()
const endOf = (event: CalendarEvent): number =>
  new Date(event.allDay ? `${event.end}T00:00:00` : event.end).getTime()

/** Heure courante, rafraîchie toutes les 30 secondes. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])
  return now
}

/** Prochain événement (Google Agenda) : dans la barre s'il est proche, la semaine dans le panneau. */
function useAgenda(): {
  state: CalendarState | null
  failed: boolean
  hasAccounts: boolean
  refresh: () => void
} {
  const accounts = useSettingsStore((store) => store.settings.calendar.accounts)
  const { data, failed, refresh } = usePolling(
    () => window.tessera.calendar.get(),
    REFRESH_MS,
    accounts.length > 0,
    accounts.map((account) => account.id).join(',')
  )
  return {
    state: accounts.length > 0 ? data : null,
    failed,
    hasAccounts: accounts.length > 0,
    refresh
  }
}

export function AgendaItem(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { state, failed, hasAccounts, refresh } = useAgenda()
  const now = useNow()
  const next = state?.events.find(
    (event) => !event.allDay && endOf(event) > now && startOf(event) - now < SOON_MS
  )
  const ongoing = next ? startOf(next) <= now : false
  const soon = next ? ongoing || startOf(next) - now < 15 * 60_000 : false
  const time = next
    ? ongoing
      ? t('headerBar.agenda.now')
      : new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }).format(
          startOf(next)
        )
    : ''

  return (
    <HeaderPopover
      label={
        next
          ? `${t('headerBar.names.agenda')} · ${time} ${next.title}`
          : t('headerBar.names.agenda')
      }
      highlighted={soon}
      button={
        <>
          <CalendarClock size={16} aria-hidden />
          {next && (
            <span className={styles.chipText}>
              <span className={styles.chipValue}>{time}</span> {next.title}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <AgendaPanel
          state={state}
          failed={failed}
          hasAccounts={hasAccounts}
          now={now}
          onRefresh={refresh}
          onClose={close}
        />
      )}
    </HeaderPopover>
  )
}

function AgendaPanel({
  state,
  failed,
  hasAccounts,
  now,
  onRefresh,
  onClose,
  week = false
}: {
  state: CalendarState | null
  failed: boolean
  hasAccounts: boolean
  now: number
  onRefresh: () => void
  onClose: () => void
  /** Grand bloc : les 7 jours côte à côte. */
  week?: boolean
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const navigate = useNavigationStore((store) => store.navigate)
  /** Formulaire ouvert : nouvel événement, ou événement modifié. */
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null)

  if (!hasAccounts) {
    return (
      <div className={styles.agenda}>
        <PanelTitle title={t('headerBar.names.agenda')} />
        <AccountRequired
          service="calendar"
          message={t('headerBar.agenda.intro')}
          onConnected={onRefresh}
          onManage={onClose}
        />
      </div>
    )
  }

  if (editing && state) {
    return (
      <AgendaEventForm
        event={editing === 'new' ? null : editing}
        calendars={state.calendars}
        onCancel={() => setEditing(null)}
        onDone={() => {
          setEditing(null)
          onRefresh()
        }}
      />
    )
  }
  const canCreate = state?.calendars.some((calendar) => calendar.writable) ?? false

  const timeFormat = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const dayFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const dayKey = (time: number): string => new Date(time).toDateString()
  const today = dayKey(now)
  const tomorrow = dayKey(now + 86_400_000)
  const dayLabel = (time: number): string => {
    const key = dayKey(Math.max(time, now))
    if (key === today) return t('headerBar.agenda.today')
    if (key === tomorrow) return t('headerBar.agenda.tomorrow')
    return dayFormat.format(time)
  }
  const events = (state?.events ?? []).filter((event) => endOf(event) > now)
  const groups: { label: string; events: CalendarEvent[] }[] = []
  for (const event of events) {
    const label = dayLabel(startOf(event))
    const group = groups.at(-1)
    if (group?.label === label) group.events.push(event)
    else groups.push({ label, events: [event] })
  }
  const broken = state?.accounts.filter((account) => account.error) ?? []

  // Vue semaine : aujourd'hui et les 6 jours suivants (minuit local, changement d'heure compris)
  const weekDays = Array.from({ length: 8 }, (_day, index) => {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index)
    return date.getTime()
  })
  const weekDayFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: 'numeric'
  })

  return (
    <div className={styles.agenda} data-week={week}>
      <PanelTitle title={t('headerBar.names.agenda')}>
        {canCreate && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('headerBar.agenda.form.new')}
            aria-label={t('headerBar.agenda.form.new')}
            onClick={() => setEditing('new')}
          >
            <Plus size={15} aria-hidden />
          </button>
        )}
        <button
          type="button"
          className={styles.iconButton}
          title={t('headerBar.agenda.refresh')}
          aria-label={t('headerBar.agenda.refresh')}
          onClick={() => void window.tessera.calendar.get(true).then(onRefresh)}
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </PanelTitle>
      {broken.map((account) =>
        // Compte à reconnecter : sur place ; autre erreur (réseau…) : le message
        needsReconnect(account.error) ? (
          <AccountRequired
            key={account.id}
            compact
            service="calendar"
            className={styles.agendaError}
            error={account.error}
            account={account.email}
            onConnected={onRefresh}
            onManage={onClose}
          />
        ) : (
          <div key={account.id} className={styles.agendaError}>
            <p className={styles.error}>
              {t('headerBar.agenda.accountError', {
                email: account.email,
                error: mailErrorMessage(new Error(`mail-error:${account.error}`))
              })}
            </p>
          </div>
        )
      )}
      {!state ? (
        <p className={styles.muted}>{failed ? t('headerBar.offline') : t('headerBar.loading')}</p>
      ) : week ? (
        <div className={styles.agendaWeek}>
          {weekDays.slice(0, 7).map((day, index) => {
            const dayEvents = events.filter(
              (event) => startOf(event) < weekDays[index + 1] && endOf(event) > day
            )
            return (
              <section key={day} className={styles.agendaDay} data-today={index === 0}>
                <h3 className={styles.groupTitle}>
                  {index === 0 ? t('headerBar.agenda.today') : weekDayFormat.format(day)}
                </h3>
                <ul className={styles.eventList}>
                  {dayEvents.map((event) => {
                    const content = (
                      <>
                        <span className={styles.muted}>
                          {event.allDay
                            ? t('headerBar.agenda.allDay')
                            : timeFormat.format(Math.max(startOf(event), day))}
                        </span>
                        <strong>{event.title || t('headerBar.agenda.untitled')}</strong>
                      </>
                    )
                    return (
                      <li key={event.id}>
                        {event.writable ? (
                          <button
                            type="button"
                            className={styles.weekEvent}
                            style={event.color ? { borderColor: event.color } : undefined}
                            data-ongoing={!event.allDay && startOf(event) <= now}
                            title={t('headerBar.agenda.form.edit')}
                            onClick={() => setEditing(event)}
                          >
                            {content}
                          </button>
                        ) : (
                          <a
                            className={styles.weekEvent}
                            style={event.color ? { borderColor: event.color } : undefined}
                            data-ongoing={!event.allDay && startOf(event) <= now}
                            href={event.link || undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {content}
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      ) : groups.length === 0 ? (
        <p className={styles.muted}>{t('headerBar.agenda.empty')}</p>
      ) : (
        <div className={styles.agendaScroll}>
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className={styles.groupTitle}>{group.label}</h3>
              <ul className={styles.eventList}>
                {group.events.map((event) => {
                  const ongoing = !event.allDay && startOf(event) <= now
                  return (
                    <li key={event.id} className={styles.event} data-ongoing={ongoing}>
                      <span
                        className={styles.eventColor}
                        style={event.color ? { background: event.color } : undefined}
                      />
                      <span className={styles.eventText}>
                        <span className={styles.muted}>
                          {event.allDay
                            ? t('headerBar.agenda.allDay')
                            : `${timeFormat.format(startOf(event))} – ${timeFormat.format(endOf(event))}`}
                          {ongoing && ` · ${t('headerBar.agenda.now')}`}
                        </span>
                        <strong>{event.title || t('headerBar.agenda.untitled')}</strong>
                        {event.location && <span className={styles.muted}>{event.location}</span>}
                      </span>
                      <span className={styles.eventActions}>
                        {event.writable && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            title={t('headerBar.agenda.form.edit')}
                            aria-label={t('headerBar.agenda.form.edit')}
                            onClick={() => setEditing(event)}
                          >
                            <Pencil size={14} aria-hidden />
                          </button>
                        )}
                        {event.meeting && (
                          <a
                            className={styles.textButton}
                            href={event.meeting}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Video size={14} aria-hidden /> {t('headerBar.agenda.join')}
                          </a>
                        )}
                        {event.link && (
                          <a
                            className={styles.iconButton}
                            href={event.link}
                            target="_blank"
                            rel="noreferrer"
                            title={t('headerBar.agenda.open')}
                            aria-label={t('headerBar.agenda.open')}
                          >
                            <ExternalLink size={14} aria-hidden />
                          </a>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => {
          onClose()
          navigate({ type: 'settings', section: 'accounts' })
        }}
      >
        {t('headerBar.agenda.manage')}
      </button>
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function AgendaBlock(): React.JSX.Element {
  const { state, failed, hasAccounts, refresh } = useAgenda()
  const now = useNow()
  const week = (useBlockSize()?.width ?? 0) >= 640
  return (
    <AgendaPanel
      state={state}
      failed={failed}
      hasAccounts={hasAccounts}
      now={now}
      onRefresh={refresh}
      onClose={() => undefined}
      week={week}
    />
  )
}
