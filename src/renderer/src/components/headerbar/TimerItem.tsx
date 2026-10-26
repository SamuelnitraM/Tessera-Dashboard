import { useState } from 'react'
import { Brain, Coffee, Pause, Play, Square, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { SegmentedControl } from '../ui/SegmentedControl'
import { createCountdown, formatLeft } from './countdown'
import { focusCountdown, useFocusStore } from './focus'
import { FocusIdle, FocusRunning } from './FocusPanel'
import { HeaderPopover } from './HeaderPopover'
import { PanelTitle } from './parts'
import styles from './HeaderBar.module.css'
import widgetStyles from './Widgets.module.css'

/** Durées proposées (minutes). */
const PRESETS = [1, 5, 10, 15, 25, 45, 60]

/**
 * Minuteur : un compte à rebours, ou des séances de Concentration (Pomodoro). À la fin, une
 * notification de Tessera (bannière, son, centre de notifications).
 */
export type TimerMode = 'countdown' | 'focus'

const countdown = createCountdown(() => {
  const minutes = Math.round(countdown.store.getState().duration / 60_000)
  void window.tessera.notifications.notifyTessera({
    title: i18n.t('headerBar.timer.doneTitle'),
    body: i18n.t('headerBar.timer.doneBody', { minutes }),
    tag: 'timer'
  })
})

/** Ce qui tourne (Concentration ou compte à rebours) : temps restant pour la barre. */
function useActive(): {
  left: number | null
  running: boolean
  phase: ReturnType<typeof useFocusStore.getState>['phase']
} {
  const phase = useFocusStore((state) => state.phase)
  const focusLeft = focusCountdown.useTimeLeft()
  const focusRunning = focusCountdown.useRunning()
  const left = countdown.useTimeLeft()
  const running = countdown.useRunning()
  return phase !== null
    ? { left: focusLeft, running: focusRunning, phase }
    : { left, running, phase: null }
}

/** Minuteur de la barre : le temps restant s'affiche dans la barre pendant qu'il tourne. */
export function TimerItem(): React.JSX.Element {
  const { t } = useTranslation()
  const { left, running, phase } = useActive()
  // Mode choisi dans le panneau, gardé tant que Tessera est ouvert
  const [mode, setMode] = useState<TimerMode>('countdown')
  const Icon = phase === 'shortBreak' || phase === 'longBreak' ? Coffee : phase ? Brain : Timer

  return (
    <HeaderPopover
      label={
        phase
          ? `${t('headerBar.names.timer')} · ${t(`headerBar.focus.${phase}`)}`
          : t('headerBar.names.timer')
      }
      highlighted={left !== null}
      button={
        <>
          <Icon size={16} aria-hidden />
          {left !== null && (
            <span className={styles.time} data-paused={!running}>
              {formatLeft(left)}
            </span>
          )}
        </>
      }
    >
      {() => <TimerPanel mode={mode} onMode={setMode} />}
    </HeaderPopover>
  )
}

/** Panneau du Minuteur, dans la barre ou en bloc. */
export function TimerPanel({
  mode,
  onMode
}: {
  mode: TimerMode
  onMode: (mode: TimerMode) => void
}): React.JSX.Element {
  const phase = useFocusStore((state) => state.phase)
  const left = countdown.useTimeLeft()

  if (phase !== null) return <FocusRunning />
  if (left !== null) return <CountdownRunning left={left} />
  const tabs = <ModeTabs mode={mode} onMode={onMode} />
  return mode === 'focus' ? <FocusIdle tabs={tabs} /> : <CountdownIdle tabs={tabs} />
}

function ModeTabs({
  mode,
  onMode
}: {
  mode: TimerMode
  onMode: (mode: TimerMode) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className={widgetStyles.modeTabs}>
      <SegmentedControl
        value={mode}
        aria-label={t('headerBar.timer.mode')}
        options={[
          { value: 'countdown', label: t('headerBar.timer.countdown'), icon: Timer },
          { value: 'focus', label: t('headerBar.names.focus'), icon: Brain }
        ]}
        onChange={onMode}
      />
    </div>
  )
}

function CountdownRunning({ left }: { left: number }): React.JSX.Element {
  const { t } = useTranslation()
  const running = countdown.useRunning()
  return (
    <div className={styles.timer}>
      <PanelTitle title={t('headerBar.names.timer')} />
      <p className={styles.timerLeft} data-paused={!running}>
        {formatLeft(left)}
      </p>
      <div className={styles.timerActions}>
        {running ? (
          <button type="button" className={styles.textButton} onClick={countdown.pause}>
            <Pause size={14} aria-hidden /> {t('headerBar.timer.pause')}
          </button>
        ) : (
          <button type="button" className={styles.textButton} onClick={countdown.resume}>
            <Play size={14} aria-hidden /> {t('headerBar.timer.resume')}
          </button>
        )}
        <button type="button" className={styles.textButton} onClick={countdown.stop}>
          <Square size={14} aria-hidden /> {t('headerBar.timer.stop')}
        </button>
      </div>
    </div>
  )
}

function CountdownIdle({ tabs }: { tabs: React.ReactNode }): React.JSX.Element {
  const { t } = useTranslation()
  const [minutes, setMinutes] = useState('20')
  const custom = Number(minutes.replace(',', '.'))
  const customValid = Number.isFinite(custom) && custom > 0 && custom <= 24 * 60
  const start = (value: number): void => countdown.start(value * 60_000)

  return (
    <div className={styles.timer}>
      <PanelTitle title={t('headerBar.names.timer')} />
      {tabs}
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
