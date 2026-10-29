import { useEffect, useRef, useState } from 'react'
import {
  ExternalLink,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX
} from 'lucide-react'
import {
  errorMessage,
  HeaderButtonText,
  HeaderPanelTitle,
  HeaderWidgetButton,
  usePluginTranslation
} from '@tessera/plugin-sdk'
import type { SpotifyCommand, SpotifyPlayback } from '@shared/spotify'
import styles from './PlayingButton.module.css'
import { usePlayback } from './usePlayback'

/** Barre des pages : titre en cours sur Spotify ; le panneau a la pochette et les commandes. */
export function PlayingButton(): React.JSX.Element {
  const t = usePluginTranslation()
  const [open, setOpen] = useState(false)
  const { playback, refresh } = usePlayback(open)
  const playing = playback?.playing === true
  return (
    <HeaderWidgetButton
      label={
        playback
          ? t('header.label', { title: playback.title, artist: playback.artist })
          : t('header.name')
      }
      open={open}
      onOpenChange={setOpen}
      button={
        <>
          <Music2 size={16} aria-hidden className={playing ? styles.playingIcon : undefined} />
          {/* En pause : le titre reste, estompé */}
          {playback && (
            <span className={playing ? undefined : styles.paused}>
              <HeaderButtonText text>{playback.title}</HeaderButtonText>
            </span>
          )}
        </>
      }
    >
      {() => (
        <div className={styles.panel}>
          <HeaderPanelTitle title={t('header.name')} />
          <NowPlaying playback={playback} onChange={refresh} />
        </div>
      )}
    </HeaderWidgetButton>
  )
}

/** Titre en cours (pochette, titre, artiste) et commandes : lecture, pause, suivant, précédent. */
export function NowPlaying({
  playback,
  onChange
}: {
  playback: SpotifyPlayback | null | undefined
  onChange: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const [error, setError] = useState<string | null>(null)
  const command = (action: SpotifyCommand): void => {
    setError(null)
    window.tessera.spotify
      .control(action)
      // Spotify change de titre un instant après la commande
      .then(() => window.setTimeout(onChange, 600))
      .catch((failure: unknown) => setError(errorMessage(failure)))
  }

  if (!playback) {
    return (
      <p className={styles.muted}>{playback === undefined ? t('loading') : t('header.nothing')}</p>
    )
  }
  return (
    <div className={styles.now}>
      <div className={styles.track}>
        {playback.image ? (
          <img className={styles.cover} src={playback.image} alt="" />
        ) : (
          <span className={styles.cover}>
            <Music2 size={22} aria-hidden />
          </span>
        )}
        <span className={styles.text}>
          <strong>{playback.title}</strong>
          <span className={styles.muted}>{playback.artist}</span>
        </span>
        {playback.uri && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('header.open')}
            aria-label={t('header.open')}
            onClick={() => void window.tessera.spotify.open(playback.uri!)}
          >
            <ExternalLink size={14} aria-hidden />
          </button>
        )}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          title={t('header.previous')}
          aria-label={t('header.previous')}
          onClick={() => command('previous')}
        >
          <SkipBack size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.control}
          data-main
          title={playback.playing ? t('header.pause') : t('header.play')}
          aria-label={playback.playing ? t('header.pause') : t('header.play')}
          onClick={() => command('play-pause')}
        >
          {playback.playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
        <button
          type="button"
          className={styles.control}
          title={t('header.next')}
          aria-label={t('header.next')}
          onClick={() => command('next')}
        >
          <SkipForward size={16} aria-hidden />
        </button>
      </div>
      <SpotifyVolume />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

/** Relecture du volume (un réglage fait dans Spotify ou le widget Son apparaît ici). */
const VOLUME_REFRESH_MS = 3_000
/** Après un réglage, la valeur lue dans Windows est ignorée un instant (elle arrive en retard). */
const LOCAL_MS = 1_500

/**
 * Volume de l'application Spotify de ce PC (sa session audio, sans toucher au volume général),
 * avec sourdine. Rien quand Spotify n'a pas de session audio (pas lancé sur ce PC).
 */
function SpotifyVolume(): React.JSX.Element | null {
  const t = usePluginTranslation()
  const [state, setState] = useState<{ volume: number; muted: boolean } | null>(null)
  const [local, setLocal] = useState<{ volume: number; muted: boolean } | null>(null)
  const localTimer = useRef(0)
  const sendTimer = useRef(0)
  const pending = useRef<number | null>(null)

  useEffect(() => {
    const load = (): void =>
      void window.tessera.spotify
        .volume()
        .then(setState)
        .catch(() => setState(null))
    load()
    const timer = window.setInterval(() => !document.hidden && load(), VOLUME_REFRESH_MS)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(localTimer.current)
      window.clearTimeout(sendTimer.current)
    }
  }, [])

  const shown = local ?? state
  if (!shown) return null

  const remember = (value: { volume: number; muted: boolean }): void => {
    setLocal(value)
    window.clearTimeout(localTimer.current)
    localTimer.current = window.setTimeout(() => setLocal(null), LOCAL_MS)
  }
  // Au plus toutes les 80 ms pendant qu'on fait glisser le curseur
  const setVolume = (volume: number): void => {
    remember({ volume, muted: false })
    pending.current = volume
    if (sendTimer.current) return
    sendTimer.current = window.setTimeout(() => {
      sendTimer.current = 0
      const next = pending.current
      pending.current = null
      if (next !== null) void window.tessera.spotify.setVolume({ volume: next }).catch(() => {})
    }, 80)
  }
  const toggleMute = (): void => {
    remember({ volume: shown.volume, muted: !shown.muted })
    void window.tessera.spotify.setVolume({ muted: !shown.muted }).catch(() => {})
  }

  const value = shown.muted ? 0 : shown.volume
  const label = shown.muted ? t('header.unmute') : t('header.mute')
  return (
    <div className={styles.volume}>
      <button
        type="button"
        className={styles.iconButton}
        data-active={shown.muted}
        title={label}
        aria-label={label}
        onClick={toggleMute}
      >
        {value === 0 ? (
          <VolumeX size={16} aria-hidden />
        ) : value < 50 ? (
          <Volume1 size={16} aria-hidden />
        ) : (
          <Volume2 size={16} aria-hidden />
        )}
      </button>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={100}
        value={value}
        aria-label={t('header.volume')}
        onChange={(event) => setVolume(Number(event.target.value))}
      />
      <span className={styles.volumeValue}>{value} %</span>
    </div>
  )
}
