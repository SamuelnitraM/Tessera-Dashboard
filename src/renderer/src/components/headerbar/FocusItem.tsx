import { useEffect, useState } from 'react'
import { BellOff, Brain, Coffee, Pause, Play, SkipForward, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { create } from 'zustand'
import { useSettingsStore } from '../../stores/settings'
import { saveOwnsDoNotDisturb } from './focusDoNotDisturb'
import { HeaderPopover } from './HeaderPopover'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

/**
 * Concentration (méthode Pomodoro) : séances de travail entrecoupées de petites pauses, et
 * une grande pause après quelques séances. Pendant le travail, Ne pas déranger est activé
 * (si l'utilisateur le veut) et désactivé à la pause, s'il ne l'était pas déjà avant.
 */

type Phase = 'work' | 'shortBreak' | 'longBreak'

interface FocusState {
  phase: Phase | null
  /** Fin prévue (horodatage), si la séance tourne. */
  endsAt: number | null
  /** Temps restant (ms), en pause. */
  pausedLeft: number | null
  startedAt: number
  /** Séance de travail en cours ou dernière terminée (à partir de 1). */
  round: number
  /** Ne pas déranger activé par la concentration (à désactiver ensuite). */
  ownsDoNotDisturb: boolean
}

const useFocusStore = create<FocusState>()(() => ({
  phase: null,
  endsAt: null,
  pausedLeft: null,
  startedAt: 0,
  round: 0,
  ownsDoNotDisturb: false
}))

const settings = (): ReturnType<typeof useSettingsStore.getState>['settings'] =>
  useSettingsStore.getState().settings

function setDoNotDisturb(on: boolean): void {
  const { notifications, headerBar } = settings()
  const { ownsDoNotDisturb } = useFocusStore.getState()
  if (on && headerBar.focus.doNotDisturb && !notifications.doNotDisturb) {
    useFocusStore.setState({ ownsDoNotDisturb: true })
    saveOwnsDoNotDisturb(true)
    void useSettingsStore.getState().update({ notifications: { doNotDisturb: true } })
  } else if (!on && ownsDoNotDisturb) {
    useFocusStore.setState({ ownsDoNotDisturb: false })
    saveOwnsDoNotDisturb(false)
    if (notifications.doNotDisturb) {
      void useSettingsStore.getState().update({ notifications: { doNotDisturb: false } })
    }
  }
}

const minutesOf = (phase: Phase): number => settings().headerBar.focus[phase]

let endTimer = 0

function schedule(endsAt: number): void {
  window.clearTimeout(endTimer)
  endTimer = window.setTimeout(() => advance(true), Math.max(0, endsAt - Date.now()))
}

function startPhase(phase: Phase, round: number): void {
  const startedAt = Date.now()
  const endsAt = startedAt + minutesOf(phase) * 60_000
  useFocusStore.setState({ phase, round, endsAt, pausedLeft: null, startedAt })
  schedule(endsAt)
}

/** Séance suivante (fin de la séance, ou « Passer »). */
function advance(notify: boolean): void {
  const { phase, round } = useFocusStore.getState()
  if (phase === null) return
  if (phase === 'work') {
    const next: Phase = round % settings().headerBar.focus.rounds === 0 ? 'longBreak' : 'shortBreak'
    // Ne pas déranger levé avant la notification, pour qu'elle s'affiche
    setDoNotDisturb(false)
    if (notify) {
      void window.tessera.notifications.notifyTessera({
        title: i18n.t('headerBar.focus.breakTitle'),
        body: i18n.t('headerBar.focus.breakBody', { minutes: minutesOf(next) }),
        tag: 'focus'
      })
    }
    startPhase(next, round)
  } else {
    if (notify) {
      void window.tessera.notifications.notifyTessera({
        title: i18n.t('headerBar.focus.workTitle'),
        body: i18n.t('headerBar.focus.workBody', { minutes: minutesOf('work') }),
        tag: 'focus'
      })
    }
    setDoNotDisturb(true)
    startPhase('work', round + 1)
  }
}

function start(): void {
  setDoNotDisturb(true)
  startPhase('work', 1)
}

function pause(): void {
  const { endsAt } = useFocusStore.getState()
  if (endsAt === null) return
  window.clearTimeout(endTimer)
  useFocusStore.setState({ endsAt: null, pausedLeft: Math.max(0, endsAt - Date.now()) })
}

function resume(): void {
  const { pausedLeft } = useFocusStore.getState()
  if (pausedLeft === null) return
  const startedAt = Date.now()
  const endsAt = startedAt + pausedLeft
  useFocusStore.setState({ endsAt, pausedLeft: null, startedAt })
  schedule(endsAt)
}

function stop(): void {
  window.clearTimeout(endTimer)
  setDoNotDisturb(false)
  useFocusStore.setState({ phase: null, endsAt: null, pausedLeft: null, round: 0 })
}

function useTimeLeft(): number | null {
  const endsAt = useFocusStore((state) => state.endsAt)
  const pausedLeft = useFocusStore((state) => state.pausedLeft)
  const startedAt = useFocusStore((state) => state.startedAt)
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (endsAt === null) return
    const interval = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(interval)
  }, [endsAt])
  if (endsAt !== null) return Math.max(0, endsAt - Math.max(now, startedAt))
  return pausedLeft
}

function formatLeft(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function FocusItem(): React.JSX.Element {
  const { t } = useTranslation()
  const phase = useFocusStore((state) => state.phase)
  const running = useFocusStore((state) => state.endsAt !== null)
  const left = useTimeLeft()
  const Icon = phase === 'shortBreak' || phase === 'longBreak' ? Coffee : Brain
  return (
    <HeaderPopover
      label={
        phase
          ? `${t('headerBar.names.focus')} · ${t(`headerBar.focus.${phase}`)}`
          : t('headerBar.names.focus')
      }
      highlighted={phase !== null}
      button={
        <>
          <Icon size={16} aria-hidden />
          {phase && left !== null && (
            <span className={styles.chipValue} data-paused={!running} data-phase={phase}>
              {formatLeft(left)}
            </span>
          )}
        </>
      }
    >
      {() => <FocusPanel left={left} running={running} />}
    </HeaderPopover>
  )
}

function FocusPanel({
  left,
  running
}: {
  left: number | null
  running: boolean
}): React.JSX.Element {
  const { t } = useTranslation()
  const phase = useFocusStore((state) => state.phase)
  const round = useFocusStore((state) => state.round)
  const focus = useSettingsStore((state) => state.settings.headerBar.focus)
  const doNotDisturb = useSettingsStore((state) => state.settings.notifications.doNotDisturb)
  const [editing, setEditing] = useState(false)

  if (editing) return <FocusSettings onBack={() => setEditing(false)} />

  return (
    <div className={styles.focus}>
      <PanelTitle
        title={phase ? t(`headerBar.focus.${phase}`) : t('headerBar.names.focus')}
        onSettings={() => setEditing(true)}
      />
      {phase === null ? (
        <>
          <p className={styles.muted}>
            {t('headerBar.focus.intro', {
              work: focus.work,
              shortBreak: focus.shortBreak,
              longBreak: focus.longBreak
            })}
          </p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={start}>
              <Play size={14} aria-hidden /> {t('headerBar.focus.start')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.bigTime} data-paused={!running} data-phase={phase}>
            {left !== null ? formatLeft(left) : ''}
          </p>
          <div
            className={styles.rounds}
            aria-label={t('headerBar.focus.round', {
              current: ((round - 1) % focus.rounds) + 1,
              total: focus.rounds
            })}
          >
            {Array.from({ length: focus.rounds }, (_value, index) => {
              const position = ((round - 1) % focus.rounds) + 1
              const done = index + 1 < position || (index + 1 === position && phase !== 'work')
              return (
                <span
                  key={index}
                  data-done={done}
                  data-current={index + 1 === position && phase === 'work'}
                />
              )
            })}
          </div>
          {phase === 'work' && doNotDisturb && (
            <p className={styles.focusHint}>
              <BellOff size={13} aria-hidden /> {t('headerBar.focus.dndOn')}
            </p>
          )}
          <div className={styles.buttonRow}>
            {running ? (
              <button type="button" className={styles.textButton} onClick={pause}>
                <Pause size={14} aria-hidden /> {t('headerBar.focus.pause')}
              </button>
            ) : (
              <button type="button" className={styles.textButton} onClick={resume}>
                <Play size={14} aria-hidden /> {t('headerBar.focus.resume')}
              </button>
            )}
            <button type="button" className={styles.textButton} onClick={() => advance(false)}>
              <SkipForward size={14} aria-hidden /> {t('headerBar.focus.skip')}
            </button>
            <button type="button" className={styles.textButton} onClick={stop}>
              <Square size={14} aria-hidden /> {t('headerBar.focus.stop')}
            </button>
          </div>
        </>
      )}
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

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function FocusBlock(): React.JSX.Element {
  const running = useFocusStore((state) => state.endsAt !== null)
  const left = useTimeLeft()
  return <FocusPanel left={left} running={running} />
}
