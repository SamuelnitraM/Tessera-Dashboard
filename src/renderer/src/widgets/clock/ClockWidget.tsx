import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ClockWidget.module.css'

/** Heure et date du jour, dans la langue de l'app. */
export function ClockWidget(): React.JSX.Element {
  const { i18n } = useTranslation()
  const now = useNow()

  const time = now.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className={styles.clock}>
      <time className={styles.time} dateTime={now.toISOString()}>
        {time}
      </time>
      <span className={styles.date}>{date}</span>
    </div>
  )
}

/** Date courante, mise à jour au début de chaque minute. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number
    const tick = (): void => {
      setNow(new Date())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    return () => window.clearTimeout(timer)
  }, [])

  return now
}
