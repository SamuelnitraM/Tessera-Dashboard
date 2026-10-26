import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MediaCommand, MediaSession } from '@shared/header-bar'
import { HeaderPopover } from './HeaderPopover'
import { usePolling } from './helpers'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

const REFRESH_MS = 2000

/**
 * Média en cours : ce que joue Windows (Spotify, une vidéo dans Brave…), d'après ses
 * contrôles multimédias. Titre dans la barre, pochette et lecture dans le panneau.
 */
function useMedia(): { session: MediaSession | null; send: (action: MediaCommand) => void } {
  const { data: session, refresh } = usePolling(() => window.tessera.headerBar.media(), REFRESH_MS)
  const send = (action: MediaCommand): void =>
    void window.tessera.headerBar
      .mediaCommand(action)
      .catch(() => undefined)
      .finally(() => window.setTimeout(refresh, 250))
  return { session, send }
}

export function MediaItem(): React.JSX.Element {
  const { t } = useTranslation()
  const { session, send } = useMedia()

  const summary = session ? [session.title, session.artist].filter(Boolean).join(' – ') : ''
  return (
    <HeaderPopover
      label={summary ? `${t('headerBar.names.media')} · ${summary}` : t('headerBar.names.media')}
      highlighted={session?.playing === true}
      button={
        <>
          <Music size={16} aria-hidden />
          {summary && <span className={styles.chipText}>{summary}</span>}
        </>
      }
    >
      {() => <MediaPanel session={session} onCommand={send} />}
    </HeaderPopover>
  )
}

function MediaPanel({
  session,
  onCommand
}: {
  session: MediaSession | null
  onCommand: (action: MediaCommand) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  if (!session) {
    return (
      <div className={styles.media}>
        <PanelTitle title={t('headerBar.names.media')} />
        <p className={styles.muted}>{t('headerBar.media.nothing')}</p>
      </div>
    )
  }
  return (
    <div className={styles.media}>
      <div className={styles.mediaNow}>
        {session.thumbnail ? (
          <img className={styles.mediaCover} src={session.thumbnail} alt="" />
        ) : (
          <span className={styles.mediaCover}>
            <Music size={28} aria-hidden />
          </span>
        )}
        <span className={styles.mediaText}>
          <strong title={session.title}>{session.title}</strong>
          {session.artist && <span title={session.artist}>{session.artist}</span>}
          <span className={styles.muted}>{t('headerBar.media.from', { app: session.app })}</span>
        </span>
      </div>
      <div className={styles.mediaControls}>
        <button
          type="button"
          className={styles.roundButton}
          disabled={!session.canPrevious}
          title={t('headerBar.media.previous')}
          aria-label={t('headerBar.media.previous')}
          onClick={() => onCommand('previous')}
        >
          <SkipBack size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.roundButton}
          data-primary
          title={session.playing ? t('headerBar.media.pause') : t('headerBar.media.play')}
          aria-label={session.playing ? t('headerBar.media.pause') : t('headerBar.media.play')}
          onClick={() => onCommand('play-pause')}
        >
          {session.playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
        <button
          type="button"
          className={styles.roundButton}
          disabled={!session.canNext}
          title={t('headerBar.media.next')}
          aria-label={t('headerBar.media.next')}
          onClick={() => onCommand('next')}
        >
          <SkipForward size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function MediaBlock(): React.JSX.Element {
  const { session, send } = useMedia()
  return <MediaPanel session={session} onCommand={send} />
}
