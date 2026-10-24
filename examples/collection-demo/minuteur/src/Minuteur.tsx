import { useEffect, useState } from 'react'
import {
  Button,
  getErrorCode,
  openContextMenu,
  useNotifications,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/module-sdk'
import styles from './Minuteur.module.css'

interface MinuteurConfig {
  /** Réglage du manifeste (fenêtre « Réglages du bloc »). */
  minutes: number
  /** En cours : heure de fin (ms depuis 1970). */
  endsAt?: number | null
  /** En pause : temps restant (ms). */
  remaining?: number | null
}

function format(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Compte à rebours. L'état (heure de fin ou temps restant) est enregistré dans la configuration
 * du bloc : il survit à un changement de page et au redémarrage de Tessera.
 */
export function Minuteur({ instanceId, config, setConfig }: WidgetProps<MinuteurConfig>) {
  const t = usePluginTranslation()
  const { notify } = useNotifications()
  const [now, setNow] = useState(() => Date.now())

  const total = config.minutes * 60_000
  const running = typeof config.endsAt === 'number'
  const left = running ? (config.endsAt as number) - now : (config.remaining ?? total)

  // Rafraîchit l'affichage pendant le décompte
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [running])

  // Arrivé à zéro : notification (si l'utilisateur a accordé la permission), puis remise à zéro
  useEffect(() => {
    if (!running || left > 0) return
    setConfig({ endsAt: null, remaining: null })
    notify({
      title: t('done'),
      body: t('doneBody', { count: config.minutes }),
      tag: instanceId
    }).catch((error) => {
      if (getErrorCode(error) !== 'permission') console.error(error)
    })
  }, [running, left, setConfig, notify, t, config.minutes, instanceId])

  const start = (): void => setConfig({ endsAt: Date.now() + left, remaining: null })
  const pause = (): void => setConfig({ endsAt: null, remaining: Math.max(0, left) })
  const reset = (): void => setConfig({ endsAt: null, remaining: null })

  return (
    <div
      className={styles.timer}
      onContextMenu={openContextMenu([{ label: t('reset'), onSelect: reset }])}
    >
      <span className={styles.time} data-running={running}>
        {format(left)}
      </span>
      <div className={styles.actions}>
        {running ? (
          <Button onClick={pause}>{t('pause')}</Button>
        ) : (
          <Button variant="primary" onClick={start}>
            {left < total ? t('resume') : t('start')}
          </Button>
        )}
        {(running || left < total) && (
          <Button variant="ghost" onClick={reset}>
            {t('reset')}
          </Button>
        )}
      </div>
    </div>
  )
}
