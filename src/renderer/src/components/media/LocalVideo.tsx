import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Music } from 'lucide-react'
import { localMediaIdFromUrl } from '@shared/local-media'
import { registerMediaControls } from '../../stores/media'
import styles from './MediaLayer.module.css'

export interface LocalVideoHandle {
  isPlaying: () => Promise<boolean>
}

interface LocalVideoProps {
  /** Lecteur (bloc) auquel appartient la vidéo. */
  id: string
  /** Adresse `tessera-file://…` (avec `?autoplay=1`, `#t=<secondes>`). */
  src: string
  onMedia: (playing: boolean) => void
  onEnded: () => void
  /** Format illisible ou fichier introuvable (code `MediaError`). */
  onError: (code: number) => void
}

/** La position est enregistrée au plus toutes les 5 secondes pendant la lecture. */
const SAVE_EVERY_MS = 5000

/**
 * Vidéo ou musique du PC, lue par Chromium (mp4, webm, mkv, mov, mp3…). La position est
 * gardée par le processus principal : la lecture reprend au même endroit la fois suivante.
 */
export const LocalVideo = forwardRef<LocalVideoHandle, LocalVideoProps>(function LocalVideo(
  { id, src, onMedia, onEnded, onError },
  ref
) {
  const video = useRef<HTMLVideoElement>(null)
  const lastSave = useRef(0)
  const [audioOnly, setAudioOnly] = useState(false)
  const fileId = localMediaIdFromUrl(src)

  useImperativeHandle(ref, () => ({
    isPlaying: async () => !!video.current && !video.current.paused && !video.current.ended
  }))

  // Commandes pour l'extension (position pour « Ouvrir dans VLC », pause)
  useEffect(
    () =>
      registerMediaControls(id, {
        time: () => video.current?.currentTime ?? 0,
        pause: () => video.current?.pause()
      }),
    [id]
  )

  const save = (): void => {
    const element = video.current
    if (!element || !fileId || !Number.isFinite(element.duration)) return
    lastSave.current = Date.now()
    window.tessera.localMedia.savePosition(fileId, element.currentTime, element.duration)
  }

  return (
    <div className={styles.local}>
      {audioOnly && <Music className={styles.audioIcon} size={48} aria-hidden />}
      <video
        ref={video}
        className={styles.video}
        src={src}
        controls
        autoPlay={/[?&]autoplay=1/.test(src)}
        onLoadedMetadata={(event) => setAudioOnly(event.currentTarget.videoWidth === 0)}
        onPlay={() => onMedia(true)}
        onPause={() => {
          onMedia(false)
          save()
        }}
        onSeeked={save}
        onTimeUpdate={() => {
          if (Date.now() - lastSave.current > SAVE_EVERY_MS) save()
        }}
        onEnded={() => {
          save()
          onEnded()
        }}
        onError={(event) => onError(event.currentTarget.error?.code ?? 0)}
      />
    </div>
  )
})
