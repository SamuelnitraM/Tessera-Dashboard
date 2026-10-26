import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useResolvedLanguage } from '../../stores/settings'
import { HeaderPopover } from './HeaderPopover'
import { WorldClocks } from './WorldClocks'
import styles from './HeaderBar.module.css'

/** Heure courante, mise à jour à chaque changement de minute. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const schedule = (): void => {
      const delay = 60_000 - (Date.now() % 60_000) + 50
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, delay)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Numéro de semaine ISO 8601 (la semaine 1 contient le premier jeudi de l'année). */
function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Jeudi de la même semaine (lundi = 1 … dimanche = 7)
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1)
  return Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7)
}

/**
 * Horloge de la barre : l'heure et la date ; un clic déplie la date complète, le calendrier du
 * mois et les horloges du monde.
 */
export function DateTimeItem(): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const now = useNow()

  return (
    <HeaderPopover
      label={t('headerBar.names.datetime')}
      button={
        <>
          <span className={styles.time}>
            {now.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={styles.date}>
            {now.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </>
      }
    >
      {() => (
        <div className={styles.dateTimePanel}>
          <Calendar now={now} language={language} />
          <WorldClocks />
        </div>
      )}
    </HeaderPopover>
  )
}

/** Calendrier du mois (semaines ISO), aussi affiché par le bloc Horloge. */
export function Calendar({
  now,
  language,
  longDate = true
}: {
  now: Date
  language: string
  /** Date complète au-dessus du mois (le bloc l'affiche déjà sous l'heure). */
  longDate?: boolean
}): React.JSX.Element {
  const { t } = useTranslation()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))

  // Semaines du lundi au dimanche, de celle du 1er à celle du dernier jour du mois
  const start = new Date(month)
  start.setDate(1 - ((month.getDay() + 6) % 7))
  const weeks: Date[][] = []
  for (const day = new Date(start); weeks.length < 6;) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }
    weeks.push(week)
    if (day.getMonth() !== month.getMonth()) break
  }
  const weekdays = weeks[0].map((day) => day.toLocaleDateString(language, { weekday: 'narrow' }))
  const moveMonth = (delta: number): void =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  const isCurrentMonth =
    month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()

  return (
    <div className={styles.calendar}>
      {longDate && (
        <p className={styles.longDate}>
          {now.toLocaleDateString(language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      )}
      <div className={styles.calendarHeader}>
        <button
          type="button"
          className={styles.iconButton}
          title={t('headerBar.calendar.previous')}
          aria-label={t('headerBar.calendar.previous')}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className={styles.monthName}>
          {month.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
        </span>
        {!isCurrentMonth && (
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
          >
            {t('headerBar.calendar.today')}
          </button>
        )}
        <button
          type="button"
          className={styles.iconButton}
          title={t('headerBar.calendar.next')}
          aria-label={t('headerBar.calendar.next')}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
      <table className={styles.calendarGrid}>
        <thead>
          <tr>
            <th title={t('headerBar.calendar.weekHint')}>{t('headerBar.calendar.week')}</th>
            {weekdays.map((name, index) => (
              <th key={index}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].getTime()}>
              <td className={styles.weekNumber}>{isoWeek(week[0])}</td>
              {week.map((day) => (
                <td
                  key={day.getTime()}
                  data-outside={day.getMonth() !== month.getMonth()}
                  data-today={sameDay(day, now)}
                >
                  {day.getDate()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
