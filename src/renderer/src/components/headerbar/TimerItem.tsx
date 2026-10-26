import { useEffect, useState } from 'react'
import { Pause, Play, Square, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'
import i18n from 'i18next'
import { HeaderPopover } from './HeaderPopover'
import styles from './HeaderBar.module.css'

/** Durées proposées (minutes). */
const PRESETS = [1, 5, 10, 15, 25, 45, 60]

/**
 * Minuteur : continue de tourner quand on change de page ou qu'on ouvre les paramètres. À la
 * fin, une notification de Tessera (bannière, son, centre de notifications).
 */
interface TimerState {
  /** Durée choisie (ms), pour le texte de la notification. */
  duration: number
  /** Fin prévue (horodatage), si le minuteur tourne. */
  endsAt: number | null
  /** Temps restant (ms), si le minuteur est en pause. */
  pausedLeft: number | null
  /** Dernier démarrage ou reprise (horodatage). */
  startedAt: number
}

const useTimerStore = create<TimerState>()(() => ({
  duration: 0,
  endsAt: null,
  pausedLeft: null,
  startedAt: 0
}))

let endTimer = 0

function scheduleEnd(endsAt: number): void {
  window.clearTimeout(endTimer)
  endTimer = window.setTimeout(
    () => {
      const minutes = Math.round(useTimerStore.getState().duration / 60_000)
      useTimerStore.setState({ endsAt: null, pausedLeft: null })
      void window.tessera.notifications.notifyTessera({
        title: i18n.t('headerBar.timer.doneTitle'),
        body: i18n.t('headerBar.timer.doneBody', { minutes }),
        tag: 'timer'
      })
    },
    Math.max(0, endsAt - Date.now())
  )
}

function start(minutes: number): void {
  const duration = minutes * 60_000
  const startedAt = Date.now()
  const endsAt = startedAt + duration
  useTimerStore.setState({ duration, endsAt, pausedLeft: null, startedAt })
  scheduleEnd(endsAt)
}

function pause(): void {
  const { endsAt } = useTimerStore.getState()
  if (endsAt === null) return
  window.clearTimeout(endTimer)
  useTimerStore.setState({ endsAt: null, pausedLeft: Math.max(0, endsAt - Date.now()) })
}

function resume(): void {
  const { pausedLeft } = useTimerStore.getState()
  if (pausedLeft === null) return
  const startedAt = Date.now()
  const endsAt = startedAt + pausedLeft
  useTimerStore.setState({ endsAt, pausedLeft: null, startedAt })
  scheduleEnd(endsAt)
}

function stop(): void {
  window.clearTimeout(endTimer)
  useTimerStore.setState({ endsAt: null, pausedLeft: null })
}

/** Temps restant (ms), rafraîchi plusieurs fois par seconde pendant que le minuteur tourne. */
function useTimeLeft(): number | null {
  const endsAt = useTimerStore((state) => state.endsAt)
  const pausedLeft = useTimerStore((state) => state.pausedLeft)
  const startedAt = useTimerStore((state) => state.startedAt)
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (endsAt === null) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [endsAt])
  // Avant la première mise à jour, l'heure du démarrage
  if (endsAt !== null) return Math.max(0, endsAt - Math.max(now, startedAt))
  return pausedLeft
}

/** 4:05, ou 1:02:30 au-delà d'une heure. */
function formatLeft(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`
}

/** Minuteur de la barre : le temps restant s'affiche dans la barre pendant qu'il tourne. */
export function TimerItem(): React.JSX.Element {
  const { t } = useTranslation()
  const left = useTimeLeft()
  const running = useTimerStore((state) => state.endsAt !== null)

  return (
    <HeaderPopover
      label={t('headerBar.names.timer')}
      highlighted={left !== null}
      button={
        <>
          <Timer size={16} aria-hidden />
          {left !== null && (
            <span className={styles.time} data-paused={!running}>
              {formatLeft(left)}
            </span>
          )}
        </>
      }
    >
      {() => <TimerPanel left={left} running={running} />}
    </HeaderPopover>
  )
}

function TimerPanel({
  left,
  running
}: {
  left: number | null
  running: boolean
}): React.JSX.Element {
  const { t } = useTranslation()
  const [minutes, setMinutes] = useState('20')
  const custom = Number(minutes.replace(',', '.'))
  const customValid = Number.isFinite(custom) && custom > 0 && custom <= 24 * 60

  if (left !== null) {
    return (
      <div className={styles.timer}>
        <p className={styles.timerLeft} data-paused={!running}>
          {formatLeft(left)}
        </p>
        <div className={styles.timerActions}>
          {running ? (
            <button type="button" className={styles.textButton} onClick={pause}>
              <Pause size={14} aria-hidden /> {t('headerBar.timer.pause')}
            </button>
          ) : (
            <button type="button" className={styles.textButton} onClick={resume}>
              <Play size={14} aria-hidden /> {t('headerBar.timer.resume')}
            </button>
          )}
          <button type="button" className={styles.textButton} onClick={stop}>
            <Square size={14} aria-hidden /> {t('headerBar.timer.stop')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.timer}>
      <div className={styles.presets}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={styles.textButton}
            onClick={() => start(preset)}
          >
            {t('headerBar.timer.preset', { minutes: preset })}
          </button>
        ))}
      </div>
      <form
        className={styles.customTimer}
        onSubmit={(event) => {
          event.preventDefault()
          if (customValid) start(custom)
        }}
      >
        <input
          className={styles.minutesInput}
          value={minutes}
          inputMode="decimal"
          aria-label={t('headerBar.timer.minutes')}
          onChange={(event) => setMinutes(event.target.value)}
        />
        <span>{t('headerBar.timer.minutes')}</span>
        <button type="submit" className={styles.primaryButton} disabled={!customValid}>
          <Play size={14} aria-hidden /> {t('headerBar.timer.start')}
        </button>
      </form>
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function TimerBlock(): React.JSX.Element {
  const left = useTimeLeft()
  const running = useTimerStore((state) => state.endsAt !== null)
  return <TimerPanel left={left} running={running} />
}
