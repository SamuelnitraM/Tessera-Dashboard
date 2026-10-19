import { useEffect, useState } from 'react'
import { useLanguage, type WidgetProps } from '@tessera/plugin-sdk'
import styles from './ClockWidget.module.css'

/** Réglages déclarés dans manifest.json. */
interface ClockConfig {
  showDate: boolean
  showSeconds: boolean
  hourCycle: 'auto' | 'h23' | 'h12'
}

/** Heure et date du jour, dans la langue de l'app. */
export function ClockWidget({ config }: WidgetProps<ClockConfig>): React.JSX.Element {
  const language = useLanguage()
  const now = useNow(config.showSeconds ? 1_000 : 60_000)

  const time = now.toLocaleTimeString(language, {
    hour: '2-digit',
    minute: '2-digit',
    second: config.showSeconds ? '2-digit' : undefined,
    hourCycle: config.hourCycle === 'auto' ? undefined : config.hourCycle
  })
  const date = now.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={styles.clock} data-seconds={config.showSeconds}>
      <time className={styles.time} dateTime={now.toISOString()}>
        {time}
      </time>
      {config.showDate && <span className={styles.date}>{date}</span>}
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
