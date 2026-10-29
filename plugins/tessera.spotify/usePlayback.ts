import { useCallback, useEffect, useState } from 'react'
import type { SpotifyPlayback } from '@shared/spotify'

/** Lecture en cours relue toutes les 15 s (toutes les 3 s quand elle est affichée en grand). */
const REFRESH_MS = 15_000
const OPEN_REFRESH_MS = 3_000

/**
 * Lecture en cours : celle de l'application Spotify de ce PC (sans compte), sinon celle du compte
 * connecté. `null` : rien en cours ; `undefined` : pas encore lue.
 */
export function usePlayback(open: boolean): {
  playback: SpotifyPlayback | null | undefined
  refresh: () => void
} {
  const [playback, setPlayback] = useState<SpotifyPlayback | null | undefined>(undefined)
  const refresh = useCallback(
    () =>
      void window.tessera.spotify
        .playback()
        .then(setPlayback)
        .catch(() => setPlayback(null)),
    []
  )
  useEffect(() => {
    refresh()
    const timer = window.setInterval(
      () => !document.hidden && refresh(),
      open ? OPEN_REFRESH_MS : REFRESH_MS
    )
    return () => window.clearInterval(timer)
  }, [open, refresh])
  return { playback, refresh }
}
