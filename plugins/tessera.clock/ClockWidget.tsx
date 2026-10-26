import { useEffect, useRef, useState } from 'react'
import { useLanguage, type WidgetProps } from '@tessera/plugin-sdk'
import { Calendar } from '../../src/renderer/src/components/headerbar/DateTimeItem'
import { BlockSizeContext } from '../../src/renderer/src/components/headerbar/helpers'
import { WorldClocks } from '../../src/renderer/src/components/headerbar/WorldClocks'
import styles from './ClockWidget.module.css'

/** Réglages déclarés dans manifest.json. */
interface ClockConfig {
  showTime: boolean
  showDate: boolean
  showSeconds: boolean
  hourCycle: 'auto' | 'h23' | 'h12'
  showCalendar: boolean
  showWorldClocks: boolean
}

/**
 * Heure et date du jour, dans la langue de l'app ; au choix, le calendrier du mois et les
 * horloges du monde (les mêmes villes que l'Horloge de la barre). Sans rien de coché, l'heure
 * reste affichée.
 */
export function ClockWidget({ config }: WidgetProps<ClockConfig>): React.JSX.Element {
  const language = useLanguage()
  const now = useNow(config.showSeconds ? 1_000 : 60_000)
  const ref = useRef<HTMLDivElement>(null)
  const size = useSize(ref)
  const hourCycle = config.hourCycle === 'auto' ? undefined : config.hourCycle
  const extras = config.showCalendar || config.showWorldClocks
  const showTime = config.showTime || (!config.showDate && !extras)

  const time = now.toLocaleTimeString(language, {
    hour: '2-digit',
    minute: '2-digit',
    second: config.showSeconds ? '2-digit' : undefined,
    hourCycle
  })
  const date = now.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div ref={ref} className={styles.widget} data-extras={extras}>
      {(showTime || config.showDate) && (
        <div className={styles.clock} data-seconds={config.showSeconds} data-time={showTime}>
          {showTime && (
            <time className={styles.time} dateTime={now.toISOString()}>
              {time}
            </time>
          )}
          {config.showDate && <span className={styles.date}>{date}</span>}
        </div>
      )}
      {extras && (
        <BlockSizeContext.Provider value={size}>
          <div className={styles.extras}>
            {config.showCalendar && (
              <Calendar now={now} language={language} longDate={!config.showDate} />
            )}
            {config.showWorldClocks && <WorldClocks hourCycle={hourCycle} />}
          </div>
        </BlockSizeContext.Provider>
      )}
    </div>
  )
}

/** Date courante, mise à jour au début de chaque intervalle (minute ou seconde). */
function useNow(interval: number): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number
    const schedule = (): void => {
      timer = window.setTimeout(tick, interval - (Date.now() % interval))
    }
    const tick = (): void => {
      setNow(new Date())
      schedule()
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [interval])

  return now
}

/** Taille du bloc, transmise aux panneaux de la barre (ils savent ainsi qu'ils sont en bloc). */
function useSize(ref: React.RefObject<HTMLDivElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}
