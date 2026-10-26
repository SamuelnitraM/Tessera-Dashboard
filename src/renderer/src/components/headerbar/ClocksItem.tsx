import { useEffect, useState } from 'react'
import { Globe, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Place } from '@shared/header-bar'
import { useSettingsStore } from '../../stores/settings'
import { useBlockSize } from './helpers'
import { HeaderPopover } from './HeaderPopover'
import { PanelTitle, PlaceSearch } from './parts'
import styles from './Widgets.module.css'

const MAX_CLOCKS = 8

/** Heure courante, rafraîchie au changement de minute. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const tick = (): void => {
      setNow(new Date())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50)
    }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50)
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

/** Décalage (minutes) d'un fuseau par rapport à UTC, à cet instant. */
function utcOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).formatToParts(date)
  const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value)
  const local = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute')
  )
  return Math.round((local - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000)
}

/** Jour du fuseau comparé au jour local : -1 (hier), 0, 1 (demain). */
function dayShift(date: Date, timeZone: string): number {
  const day = (zone?: string): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, dateStyle: 'short' }).format(date)
  const there = day(timeZone)
  const here = day()
  return there === here ? 0 : there > here ? 1 : -1
}

/** Horloges du monde : la première dans la barre, toutes dans le panneau. */
function useClocks(): { clocks: Place[]; now: Date; time: (place: Place) => string } {
  const { i18n } = useTranslation()
  const clocks = useSettingsStore((state) => state.settings.headerBar.clocks)
  const now = useNow()
  const time = (place: Place): string =>
    new Intl.DateTimeFormat(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: place.timeZone
    }).format(now)
  return { clocks, now, time }
}

export function ClocksItem(): React.JSX.Element {
  const { t } = useTranslation()
  const { clocks, now, time } = useClocks()
  const first = clocks[0]

  return (
    <HeaderPopover
      label={
        first
          ? `${t('headerBar.names.clocks')} · ${first.name} ${time(first)}`
          : t('headerBar.names.clocks')
      }
      button={
        <>
          <Globe size={16} aria-hidden />
          {first && (
            <span className={styles.chipText}>
              <span className={styles.muted}>{first.name}</span>{' '}
              <span className={styles.chipValue}>{time(first)}</span>
            </span>
          )}
        </>
      }
    >
      {() => <ClocksPanel clocks={clocks} now={now} time={time} />}
    </HeaderPopover>
  )
}

function ClocksPanel({
  clocks,
  now,
  time
}: {
  clocks: Place[]
  now: Date
  time: (place: Place) => string
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const update = useSettingsStore((state) => state.update)
  const [adding, setAdding] = useState(clocks.length === 0)
  // En bloc, la recherche ne prend le focus qu'après « Ajouter » (sinon la page sauterait jusqu'à lui)
  const inBlock = useBlockSize() !== null
  const [addClicked, setAddClicked] = useState(false)
  const save = (next: Place[]): void => void update({ headerBar: { clocks: next } })
  const localOffset = -now.getTimezoneOffset()

  const offsetLabel = (place: Place): string => {
    const difference = utcOffset(now, place.timeZone) - localOffset
    if (difference === 0) return t('headerBar.clocks.sameTime')
    const hours = difference / 60
    const value = `${hours > 0 ? '+' : '−'}${Math.abs(hours).toLocaleString(i18n.language, { maximumFractionDigits: 2 })}`
    return t('headerBar.clocks.offset', { value })
  }

  return (
    <div className={styles.clocks}>
      <PanelTitle title={t('headerBar.names.clocks')}>
        {clocks.length < MAX_CLOCKS && !adding && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('headerBar.clocks.add')}
            aria-label={t('headerBar.clocks.add')}
            onClick={() => {
              setAdding(true)
              setAddClicked(true)
            }}
          >
            <Plus size={15} aria-hidden />
          </button>
        )}
      </PanelTitle>
      {clocks.length === 0 && <p className={styles.muted}>{t('headerBar.clocks.empty')}</p>}
      {clocks.length > 0 && (
        <ul className={styles.clockList}>
          {clocks.map((place, index) => {
            const shift = dayShift(now, place.timeZone)
            return (
              <li key={`${place.latitude},${place.longitude}`} className={styles.clockRow}>
                <span className={styles.clockPlace}>
                  <strong>{place.name}</strong>
                  <span className={styles.muted}>
                    {[
                      shift === 1
                        ? t('headerBar.clocks.tomorrow')
                        : shift === -1
                          ? t('headerBar.clocks.yesterday')
                          : t('headerBar.clocks.today'),
                      offsetLabel(place)
                    ].join(' · ')}
                  </span>
                </span>
                <span className={styles.clockTime}>{time(place)}</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('headerBar.clocks.remove', { name: place.name })}
                  aria-label={t('headerBar.clocks.remove', { name: place.name })}
                  onClick={() => save(clocks.filter((_item, other) => other !== index))}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {adding && clocks.length < MAX_CLOCKS && (
        <PlaceSearch
          autoFocus={!inBlock || addClicked}
          onPick={(place) => {
            if (
              !clocks.some((item) => item.timeZone === place.timeZone && item.name === place.name)
            ) {
              save([...clocks, place])
            }
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function ClocksBlock(): React.JSX.Element {
  const { clocks, now, time } = useClocks()
  return <ClocksPanel clocks={clocks} now={now} time={time} />
}
