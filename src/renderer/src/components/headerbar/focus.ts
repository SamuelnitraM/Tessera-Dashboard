import i18n from 'i18next'
import { create } from 'zustand'
import { useSettingsStore } from '../../stores/settings'
import { createCountdown } from './countdown'
import { saveOwnsDoNotDisturb } from './focusDoNotDisturb'

/**
 * Concentration, mode du Minuteur (méthode Pomodoro) : séances de travail entrecoupées de
 * petites pauses, et une grande pause après quelques séances. Pendant le travail, Ne pas
 * déranger est activé (si l'utilisateur le veut) et désactivé à la pause, s'il ne l'était pas
 * déjà avant.
 */

export type FocusPhase = 'work' | 'shortBreak' | 'longBreak'

interface FocusState {
  phase: FocusPhase | null
  /** Séance de travail en cours ou dernière terminée (à partir de 1). */
  round: number
  /** Ne pas déranger activé par la concentration (à désactiver ensuite). */
  ownsDoNotDisturb: boolean
}

export const useFocusStore = create<FocusState>()(() => ({
  phase: null,
  round: 0,
  ownsDoNotDisturb: false
}))

/** Compte à rebours de la séance en cours. */
export const focusCountdown = createCountdown(() => advanceFocus(true))

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

const minutesOf = (phase: FocusPhase): number => settings().headerBar.focus[phase]

function startPhase(phase: FocusPhase, round: number): void {
  useFocusStore.setState({ phase, round })
  focusCountdown.start(minutesOf(phase) * 60_000)
}

/** Séance suivante (fin de la séance, ou « Passer »). */
export function advanceFocus(notify: boolean): void {
  const { phase, round } = useFocusStore.getState()
  if (phase === null) return
  if (phase === 'work') {
    const next: FocusPhase =
      round % settings().headerBar.focus.rounds === 0 ? 'longBreak' : 'shortBreak'
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

export function startFocus(): void {
  setDoNotDisturb(true)
  startPhase('work', 1)
}

export function stopFocus(): void {
  focusCountdown.stop()
  setDoNotDisturb(false)
  useFocusStore.setState({ phase: null, round: 0 })
}
