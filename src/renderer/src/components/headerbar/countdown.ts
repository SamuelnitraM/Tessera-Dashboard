import { useEffect, useState } from 'react'
import { create, type StoreApi, type UseBoundStore } from 'zustand'

/**
 * Compte à rebours partagé par les deux modes du Minuteur (compte à rebours et Concentration).
 * Il continue de tourner quand on change de page ou qu'on ouvre les paramètres, et le même
 * état sert à la barre et aux blocs.
 */
export interface CountdownState {
  /** Durée choisie (ms). */
  duration: number
  /** Fin prévue (horodatage), si le compte à rebours tourne. */
  endsAt: number | null
  /** Temps restant (ms), si le compte à rebours est en pause. */
  pausedLeft: number | null
  /** Dernier démarrage ou reprise (horodatage). */
  startedAt: number
}

export interface Countdown {
  store: UseBoundStore<StoreApi<CountdownState>>
  start: (duration: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  /** Temps restant (ms), `null` à l'arrêt ; rafraîchi plusieurs fois par seconde. */
  useTimeLeft: () => number | null
  useRunning: () => boolean
}

/** `onEnd` est appelé à la fin, une fois le compte à rebours remis à l'arrêt. */
export function createCountdown(onEnd: () => void): Countdown {
  const store = create<CountdownState>()(() => ({
    duration: 0,
    endsAt: null,
    pausedLeft: null,
    startedAt: 0
  }))
  let endTimer = 0

  const schedule = (endsAt: number): void => {
    window.clearTimeout(endTimer)
    endTimer = window.setTimeout(
      () => {
        store.setState({ endsAt: null, pausedLeft: null })
        onEnd()
      },
      Math.max(0, endsAt - Date.now())
    )
  }

  const start = (duration: number): void => {
    const startedAt = Date.now()
    const endsAt = startedAt + duration
    store.setState({ duration, endsAt, pausedLeft: null, startedAt })
    schedule(endsAt)
  }

  const pause = (): void => {
    const { endsAt } = store.getState()
    if (endsAt === null) return
    window.clearTimeout(endTimer)
    store.setState({ endsAt: null, pausedLeft: Math.max(0, endsAt - Date.now()) })
  }

  const resume = (): void => {
    const { pausedLeft } = store.getState()
    if (pausedLeft === null) return
    const startedAt = Date.now()
    const endsAt = startedAt + pausedLeft
    store.setState({ endsAt, pausedLeft: null, startedAt })
    schedule(endsAt)
  }

  const stop = (): void => {
    window.clearTimeout(endTimer)
    store.setState({ endsAt: null, pausedLeft: null })
  }

  const useTimeLeft = (): number | null => {
    const endsAt = store((state) => state.endsAt)
    const pausedLeft = store((state) => state.pausedLeft)
    const startedAt = store((state) => state.startedAt)
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

  const useRunning = (): boolean => store((state) => state.endsAt !== null)

  return { store, start, pause, resume, stop, useTimeLeft, useRunning }
}

/** 4:05, ou 1:02:30 au-delà d'une heure. */
export function formatLeft(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`
}
