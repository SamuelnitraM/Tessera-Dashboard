import { useEffect, useState } from 'react'
import { Flag, Pause, Play, RotateCcw, Watch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'
import { HeaderPopover } from './HeaderPopover'
import styles from './Widgets.module.css'

/**
 * Chronomètre : continue de tourner quand on change de page ou qu'on ouvre les paramètres,
 * avec des temps intermédiaires (tours).
 */
interface StopwatchState {
  /** Dernier démarrage ou reprise (horodatage), si le chronomètre tourne. */
  startedAt: number | null
  /** Temps cumulé avant le dernier démarrage (ms). */
  before: number
  /** Temps total à chaque tour (ms), du plus récent au plus ancien. */
  laps: number[]
}

const useStopwatchStore = create<StopwatchState>()(() => ({ startedAt: null, before: 0, laps: [] }))

const elapsedAt = (state: StopwatchState, now: number): number =>
  state.before + (state.startedAt === null ? 0 : now - state.startedAt)

function toggle(): void {
  const state = useStopwatchStore.getState()
  if (state.startedAt === null) useStopwatchStore.setState({ startedAt: Date.now() })
  else useStopwatchStore.setState({ startedAt: null, before: elapsedAt(state, Date.now()) })
}

function lap(): void {
  const state = useStopwatchStore.getState()
  useStopwatchStore.setState({ laps: [elapsedAt(state, Date.now()), ...state.laps].slice(0, 99) })
}

function reset(): void {
  useStopwatchStore.setState({ startedAt: null, before: 0, laps: [] })
}

/** Temps écoulé (ms), rafraîchi pendant que le chronomètre tourne. */
function useElapsed(precise: boolean): number {
  const state = useStopwatchStore()
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (state.startedAt === null) return
    const interval = window.setInterval(() => setNow(Date.now()), precise ? 50 : 500)
    return () => window.clearInterval(interval)
  }, [state.startedAt, precise])
  return state.startedAt === null ? state.before : elapsedAt(state, Math.max(now, state.startedAt))
}

/** 1:05, 1:02:30 ; avec les dixièmes : 1:05,3. */
function format(ms: number, tenths: boolean, decimal: string): string {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  const base =
    hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
  return tenths ? `${base}${decimal}${Math.floor((ms % 1000) / 100)}` : base
}

export function StopwatchItem(): React.JSX.Element {
  const { t } = useTranslation()
  const elapsed = useElapsed(false)
  const running = useStopwatchStore((state) => state.startedAt !== null)
  const active = running || elapsed > 0
  return (
    <HeaderPopover
      label={t('headerBar.names.stopwatch')}
      highlighted={active}
      button={
        <>
          <Watch size={16} aria-hidden />
          {active && (
            <span className={styles.chipValue} data-paused={!running}>
              {format(elapsed, false, ',')}
            </span>
          )}
        </>
      }
    >
      {() => <StopwatchPanel />}
    </HeaderPopover>
  )
}

/** Aussi affiché seul, en bloc sur une page. */
export function StopwatchPanel(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const elapsed = useElapsed(true)
  const running = useStopwatchStore((state) => state.startedAt !== null)
  const laps = useStopwatchStore((state) => state.laps)
  const decimal = (1.5).toLocaleString(i18n.language).charAt(1)

  return (
    <div className={styles.stopwatch}>
      <p className={styles.bigTime} data-paused={!running && elapsed > 0}>
        {format(elapsed, true, decimal)}
      </p>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.primaryButton} onClick={toggle}>
          {running ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          {running
            ? t('headerBar.stopwatch.pause')
            : elapsed > 0
              ? t('headerBar.stopwatch.resume')
              : t('headerBar.stopwatch.start')}
        </button>
        {running ? (
          <button type="button" className={styles.textButton} onClick={lap}>
            <Flag size={14} aria-hidden /> {t('headerBar.stopwatch.lap')}
          </button>
        ) : (
          <button
            type="button"
            className={styles.textButton}
            disabled={elapsed === 0}
            onClick={reset}
          >
            <RotateCcw size={14} aria-hidden /> {t('headerBar.stopwatch.reset')}
          </button>
        )}
      </div>
      {laps.length > 0 && (
        <ol className={styles.laps} aria-label={t('headerBar.stopwatch.laps')}>
          {laps.map((total, index) => {
            const previous = laps[index + 1] ?? 0
            return (
              <li key={laps.length - index}>
                <span className={styles.muted}>
                  {t('headerBar.stopwatch.lapNumber', { number: laps.length - index })}
                </span>
                <span>+{format(total - previous, true, decimal)}</span>
                <strong>{format(total, true, decimal)}</strong>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
