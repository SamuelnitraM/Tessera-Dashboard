import { useEffect, useRef, useState } from 'react'
import { CornerUpLeft, SkipForward, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isLocalMediaUrl } from '@shared/local-media'
import { SHARED_WEB_PARTITION } from '@shared/web-apps'
import { measure } from '../../lib/visibleRect'
import { useDashboardStore } from '../../stores/dashboard'
import { useMediaStore, type MediaSession } from '../../stores/media'
import { useNavigationStore } from '../../stores/navigation'
import { WebFrame, type WebFrameHandle } from '../web/WebFrame'
import { LocalVideo, type LocalVideoHandle } from './LocalVideo'
import styles from './MediaLayer.module.css'

/**
 * Couche des lecteurs : chaque lecteur est posé sur l'emplacement de son bloc (même position,
 * même partie visible), ou affiché en mini-lecteur. Le lecteur n'est jamais déplacé dans la
 * page (une <webview> déplacée se recharge) : seule sa position change.
 */
export function MediaLayer(): React.JSX.Element {
  const sessions = useMediaStore((state) => state.sessions)
  const editing = useNavigationStore((state) => state.editing)
  const fileDrag = useFileDrag()
  return (
    <div className={styles.layer} data-editing={editing} data-file-drag={fileDrag}>
      {Object.values(sessions).map((session) => (
        <Player key={session.id} session={session} />
      ))}
    </div>
  )
}

/**
 * Un fichier du PC est-il en train d'être glissé sur la fenêtre ? Les lecteurs laissent alors
 * passer la souris : le fichier est déposé sur le bloc en dessous (bloc Vidéo locale).
 */
function useFileDrag(): boolean {
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    let depth = 0
    const enter = (event: DragEvent): void => {
      if (!event.dataTransfer?.types.includes('Files')) return
      depth += 1
      setDragging(true)
    }
    const leave = (): void => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const end = (): void => {
      depth = 0
      setDragging(false)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', end)
    window.addEventListener('dragend', end)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', end)
      window.removeEventListener('dragend', end)
    }
  }, [])
  return dragging
}

function Player({ session }: { session: MediaSession }): React.JSX.Element {
  const { t } = useTranslation()
  const wrapper = useRef<HTMLDivElement>(null)
  const frame = useRef<WebFrameHandle>(null)
  const local = useRef<LocalVideoHandle>(null)
  const setPlaying = useMediaStore((state) => state.setPlaying)
  const close = useMediaStore((state) => state.close)
  // Sans bloc : mini-lecteur s'il joue ; sinon caché, le temps de vérifier
  const mini = session.slot === null && session.playing
  const pending = session.slot === null && !session.playing

  // Bloc quitté : le lecteur reste en mini-lecteur s'il joue (vérifié dans la page elle-même),
  // sinon il est fermé
  useEffect(() => {
    if (session.slot) return
    let active = true
    void (async () => {
      const player = frame.current ?? local.current
      const playing = session.playing || ((await player?.isPlaying()) ?? false)
      if (!active) return
      if (playing) setPlaying(session.id, true)
      else close(session.id)
    })()
    return () => {
      active = false
    }
    // Une vérification par sortie du bloc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.slot])

  // Suit l'emplacement à chaque image (déplacement dans la grille, défilement, fenêtre)
  useEffect(() => {
    const element = wrapper.current
    const slot = session.slot
    if (!element) return
    if (!slot) {
      element.removeAttribute('style')
      return
    }
    let frame = 0
    let last = ''
    const follow = (): void => {
      const rect = measure(slot)
      const style = rect
        ? `left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;` +
          (rect.clip
            ? `clip-path:inset(${rect.clip.y}px ${rect.width - rect.clip.x - rect.clip.width}px ` +
              `${rect.height - rect.clip.y - rect.clip.height}px ${rect.clip.x}px);`
            : '')
        : 'visibility:hidden;'
      if (style !== last) {
        last = style
        element.setAttribute('style', style)
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [session.slot])

  /** Retour à la page du bloc. */
  const goBack = (): void => {
    const page = useDashboardStore
      .getState()
      .dashboard.pages.find((candidate) =>
        candidate.widgets.some((widget) => widget.id === session.id)
      )
    if (page) useNavigationStore.getState().navigate({ type: 'page', pageId: page.id })
    useMediaStore.getState().requestReveal(session.id)
  }

  return (
    <div ref={wrapper} className={styles.player} data-mini={mini} data-pending={pending}>
      {mini && (
        <header className={styles.miniHeader}>
          <span className={styles.miniTitle} title={session.title}>
            {session.title}
          </span>
          <button
            type="button"
            className={styles.miniButton}
            title={t('media.backToBlock')}
            aria-label={t('media.backToBlock')}
            onClick={goBack}
          >
            <CornerUpLeft size={15} aria-hidden />
          </button>
          {session.queue.length > 0 && (
            <button
              type="button"
              className={styles.miniButton}
              title={t('media.next')}
              aria-label={t('media.next')}
              onClick={() => useMediaStore.getState().playNext(session.id)}
            >
              <SkipForward size={15} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className={styles.miniButton}
            title={t('media.closePlayer')}
            aria-label={t('media.closePlayer')}
            onClick={() => close(session.id)}
          >
            <X size={15} aria-hidden />
          </button>
        </header>
      )}
      <div className={styles.screen}>
        {isLocalMediaUrl(session.src) ? (
          <LocalVideo
            ref={local}
            id={session.id}
            src={session.src}
            onMedia={(playing) => setPlaying(session.id, playing)}
            onEnded={() => setPlaying(session.id, false)}
            onError={(code) => useMediaStore.getState().setError(session.id, code)}
          />
        ) : (
          <WebFrame
            ref={frame}
            src={session.src}
            partition={SHARED_WEB_PARTITION}
            referrer={session.referrer}
            onMedia={(playing) => setPlaying(session.id, playing)}
            onTitle={(title) => useMediaStore.getState().setPageTitle(session.id, title)}
            // Fin de la vidéo : la suivante de la file « À suivre » démarre
            onEnded={() => useMediaStore.getState().playNext(session.id)}
          />
        )}
      </div>
    </div>
  )
}
