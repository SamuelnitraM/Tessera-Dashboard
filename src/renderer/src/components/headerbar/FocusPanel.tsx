import { useState } from 'react'
import { BellOff, Pause, Play, SkipForward, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settings'
import { formatLeft } from './countdown'
import { advanceFocus, focusCountdown, startFocus, stopFocus, useFocusStore } from './focus'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

/** Séance en cours : temps restant, séances faites, pause, passer, arrêter. */
export function FocusRunning(): React.JSX.Element {
  const { t } = useTranslation()
  const phase = useFocusStore((state) => state.phase) ?? 'work'
  const round = useFocusStore((state) => state.round)
  const left = focusCountdown.useTimeLeft()
  const running = focusCountdown.useRunning()
  const focus = useSettingsStore((state) => state.settings.headerBar.focus)
  const doNotDisturb = useSettingsStore((state) => state.settings.notifications.doNotDisturb)
  const position = ((round - 1) % focus.rounds) + 1

  return (
    <div className={styles.focus}>
      <PanelTitle title={t(`headerBar.focus.${phase}`)} />
      <p className={styles.bigTime} data-paused={!running} data-phase={phase}>
        {left !== null ? formatLeft(left) : ''}
      </p>
      <div
        className={styles.rounds}
        aria-label={t('headerBar.focus.round', { current: position, total: focus.rounds })}
      >
        {Array.from({ length: focus.rounds }, (_value, index) => (
          <span
            key={index}
            data-done={index + 1 < position || (index + 1 === position && phase !== 'work')}
            data-current={index + 1 === position && phase === 'work'}
          />
        ))}
      </div>
      {phase === 'work' && doNotDisturb && (
        <p className={styles.focusHint}>
          <BellOff size={13} aria-hidden /> {t('headerBar.focus.dndOn')}
        </p>
      )}
      <div className={styles.buttonRow}>
        {running ? (
          <button type="button" className={styles.textButton} onClick={focusCountdown.pause}>
            <Pause size={14} aria-hidden /> {t('headerBar.focus.pause')}
          </button>
        ) : (
          <button type="button" className={styles.textButton} onClick={focusCountdown.resume}>
            <Play size={14} aria-hidden /> {t('headerBar.focus.resume')}
          </button>
        )}
        <button type="button" className={styles.textButton} onClick={() => advanceFocus(false)}>
          <SkipForward size={14} aria-hidden /> {t('headerBar.focus.skip')}
        </button>
        <button type="button" className={styles.textButton} onClick={stopFocus}>
          <Square size={14} aria-hidden /> {t('headerBar.focus.stop')}
        </button>
      </div>
    </div>
  )
}

/** Avant de commencer : la méthode, « Commencer », et les durées (bouton réglages). */
export function FocusIdle({ tabs }: { tabs: React.ReactNode }): React.JSX.Element {
  const { t } = useTranslation()
  const focus = useSettingsStore((state) => state.settings.headerBar.focus)
  const [editing, setEditing] = useState(false)

  if (editing) return <FocusSettings onBack={() => setEditing(false)} />

  return (
    <div className={styles.focus}>
      <PanelTitle title={t('headerBar.names.timer')} onSettings={() => setEditing(true)} />
      {tabs}
      <p className={styles.muted}>
        {t('headerBar.focus.intro', {
          work: focus.work,
          shortBreak: focus.shortBreak,
          longBreak: focus.longBreak
        })}
      </p>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.primaryButton} onClick={startFocus}>
          <Play size={14} aria-hidden /> {t('headerBar.focus.start')}
        </button>
      </div>
    </div>
  )
}

function FocusSettings({ onBack }: { onBack: () => void }): React.JSX.Element {
  const { t } = useTranslation()
  const focus = useSettingsStore((state) => state.settings.headerBar.focus)
  const update = useSettingsStore((state) => state.update)
  const set = (patch: Partial<typeof focus>): void =>
    void update({ headerBar: { focus: { ...focus, ...patch } } })

  const field = (
    key: 'work' | 'shortBreak' | 'longBreak' | 'rounds',
    max: number
  ): React.JSX.Element => (
    <label className={styles.numberField}>
      <span>{t(`headerBar.focus.settings.${key}`)}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={focus[key]}
        onChange={(event) => {
          const value = Math.round(Number(event.target.value))
          if (value >= 1 && value <= max) set({ [key]: value })
        }}
      />
    </label>
  )

  return (
    <div className={styles.focus}>
      <PanelTitle title={t('headerBar.names.focus')} settings onSettings={onBack} />
      {field('work', 180)}
      {field('shortBreak', 60)}
      {field('longBreak', 120)}
      {field('rounds', 12)}
      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={focus.doNotDisturb}
          onChange={(event) => set({ doNotDisturb: event.target.checked })}
        />
        {t('headerBar.focus.settings.doNotDisturb')}
      </label>
    </div>
  )
}
