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
import type { MediaTimeline, SpotifyCommand, SpotifyPlayback } from '@shared/spotify'
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
  /** Augmente à chaque commande : le volume est relu (Spotify ouvre son son en jouant). */
  const [commands, setCommands] = useState(0)
  const command = (action: SpotifyCommand): void => {
    setError(null)
    window.tessera.spotify
      .control(action)
      // Spotify change de titre un instant après la commande
      .then(() => window.setTimeout(onChange, 600))
      .catch((failure: unknown) => setError(errorMessage(failure)))
      .finally(() => setCommands((count) => count + 1))
  }

  if (!playback) {
    return (
      <p className={styles.muted}>{playback === undefined ? t('loading') : t('header.nothing')}</p>
    )
  }
  // Volume à la verticale, à droite : il ne se confond pas avec la barre de lecture
  return (
    <div className={styles.now}>
      <div className={styles.main}>
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
        <SpotifyProgress />
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <SpotifyVolume commands={commands} />
    </div>
  )
}

/** Relecture du volume (un réglage fait dans Spotify ou le widget Son apparaît ici). */
/** Relecture de la position (Spotify ne la donne que de temps en temps : elle avance entre-temps). */
const TIMELINE_REFRESH_MS = 1_000
/** Rafraîchissement de la barre pendant la lecture. */
const PROGRESS_TICK_MS = 250

const clock = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Barre de lecture du titre en cours dans l'application Spotify de ce PC (temps écoulé, durée) ;
 * on la fait glisser pour avancer ou reculer, la lecture se déplace au relâchement. Rien si
 * Spotify ne donne pas la durée du titre.
 */
function SpotifyProgress(): React.JSX.Element | null {
  const t = usePluginTranslation()
  const [timeline, setTimeline] = useState<MediaTimeline | null>(null)
  const [now, setNow] = useState(() => Date.now())
  /** Position choisie en faisant glisser la barre (ms), envoyée au relâchement. */
  const [dragging, setDragging] = useState<number | null>(null)

  useEffect(() => {
    const load = (): void =>
      void window.tessera.spotify
        .timeline()
        .then(setTimeline)
        .catch(() => setTimeline(null))
    load()
    const reload = window.setInterval(() => !document.hidden && load(), TIMELINE_REFRESH_MS)
    const tick = window.setInterval(() => setNow(Date.now()), PROGRESS_TICK_MS)
    return () => {
      window.clearInterval(reload)
      window.clearInterval(tick)
    }
  }, [])

  if (!timeline || timeline.duration <= 0) return null
  const elapsed = timeline.playing ? Math.max(0, now - timeline.updatedAt) : 0
  const position = Math.min(timeline.duration, timeline.position + elapsed)
  const shown = dragging ?? position
  const seek = (): void => {
    if (dragging === null) return
    const target = dragging
    setDragging(null)
    // Affichée tout de suite à la nouvelle place, puis relue
    setTimeline({ ...timeline, position: target, updatedAt: Date.now() })
    void window.tessera.spotify
      .seek(target)
      .then(() => window.tessera.spotify.timeline())
      .then((next) => next && setTimeline(next))
      .catch(() => {})
  }

  return (
    <div className={styles.progress}>
      <span className={styles.time}>{clock(shown)}</span>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={Math.round(timeline.duration)}
        step={1000}
        value={Math.round(shown)}
        disabled={!timeline.canSeek}
        aria-label={t('header.position')}
        aria-valuetext={`${clock(shown)} / ${clock(timeline.duration)}`}
        onChange={(event) => setDragging(Number(event.target.value))}
        onPointerUp={seek}
        onKeyUp={seek}
        onBlur={seek}
      />
      <span className={styles.time}>{clock(timeline.duration)}</span>
    </div>
  )
}

const VOLUME_REFRESH_MS = 2_000
/** Relu un instant après une commande (le son de Spotify démarre après elle). */
const VOLUME_AFTER_COMMAND_MS = 500
/** Après un réglage, la valeur lue dans Windows est ignorée un instant (elle arrive en retard). */
const LOCAL_MS = 1_500

/**
 * Volume de l'application Spotify de ce PC (sa session audio, sans toucher au volume général),
 * avec sourdine : barre verticale, toujours là, grisée tant que Spotify n'a pas de session audio
 * (pas lancé sur ce PC, ou pas encore de son joué). Une lecture qui échoue garde la dernière
 * valeur.
 */
function SpotifyVolume({ commands }: { commands: number }): React.JSX.Element {
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
        .catch(() => {})
    load()
    const timer = window.setInterval(() => !document.hidden && load(), VOLUME_REFRESH_MS)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(localTimer.current)
      window.clearTimeout(sendTimer.current)
    }
  }, [])
  // Après lecture, pause, titre suivant… : relu tout de suite
  useEffect(() => {
    if (commands === 0) return
    const timer = window.setTimeout(
      () =>
        void window.tessera.spotify
          .volume()
          .then(setState)
          .catch(() => {}),
      VOLUME_AFTER_COMMAND_MS
    )
    return () => window.clearTimeout(timer)
  }, [commands])

  const shown = local ?? state ?? { volume: 0, muted: false }
  const known = (local ?? state) !== null

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
    <div
      className={styles.volume}
      data-unknown={!known || undefined}
      title={known ? undefined : t('header.volumeUnknown')}
    >
      <span className={styles.volumeValue}>{known ? `${value} %` : '–'}</span>
      <input
        type="range"
        className={styles.volumeSlider}
        min={0}
        max={100}
        value={value}
        disabled={!known}
        aria-label={t('header.volume')}
        aria-orientation="vertical"
        onChange={(event) => setVolume(Number(event.target.value))}
      />
      <button
        type="button"
        className={styles.iconButton}
        data-active={shown.muted}
        title={label}
        aria-label={label}
        disabled={!known}
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
    </div>
  )
}
