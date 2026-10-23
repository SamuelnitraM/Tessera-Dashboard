import { useEffect, useState } from 'react'
import { ListPlus, LoaderCircle, Play } from 'lucide-react'
import { Button, useLanguage, usePluginTranslation, type YouTubeVideo } from '@tessera/plugin-sdk'
import styles from './YouTubeWidget.module.css'

interface VideoGridProps {
  videos: YouTubeVideo[] | null
  error: string | null
  onRetry: () => void
  /** Clic sur une vidéo (lecture, ou ajout à la suite si une vidéo joue déjà). */
  onPick: (video: YouTubeVideo) => void
  onPlayNow: (video: YouTubeVideo) => void
  onEnqueue: (video: YouTubeVideo) => void
  /** Barre au-dessus de la grille (titre, retour, actualiser…). */
  toolbar?: React.ReactNode
  /** Résultats suivants (recherche). */
  onMore?: () => void
  loadingMore?: boolean
  emptyText: string
}

/** Grille de vidéos, comme sur YouTube : miniature, durée, titre, chaîne, vues, date. */
export function VideoGrid({
  videos,
  error,
  onRetry,
  onPick,
  onPlayNow,
  onEnqueue,
  toolbar,
  onMore,
  loadingMore = false,
  emptyText
}: VideoGridProps): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const now = useNow()
  const ago = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  const since = (time: number): string => {
    const minutes = Math.round((time - now) / 60_000)
    if (Math.abs(minutes) < 60) return ago.format(minutes, 'minute')
    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return ago.format(hours, 'hour')
    const days = Math.round(hours / 24)
    if (Math.abs(days) < 30) return ago.format(days, 'day')
    const months = Math.round(days / 30)
    if (Math.abs(months) < 12) return ago.format(months, 'month')
    return ago.format(Math.round(days / 365), 'year')
  }
  const views = new Intl.NumberFormat(language, { notation: 'compact' })

  return (
    <div className={styles.listArea}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      {error && (
        <div className={styles.state}>
          <p className={styles.error}>{error}</p>
          <Button onClick={onRetry}>{t('retry')}</Button>
        </div>
      )}
      {!error && !videos && (
        <div className={styles.state}>
          <LoaderCircle className={styles.spin} size={20} aria-hidden />
        </div>
      )}
      {!error && videos && videos.length === 0 && <p className={styles.note}>{emptyText}</p>}
      {!error && videos && videos.length > 0 && (
        <div className={styles.scroll}>
          <ul className={styles.grid}>
            {videos.map((video) => (
              <li key={video.id} className={styles.cardItem}>
                <button
                  type="button"
                  className={styles.card}
                  title={video.title}
                  onClick={() => onPick(video)}
                >
                  <span className={styles.thumbBox}>
                    <img className={styles.cardThumb} src={video.thumbnail} alt="" loading="lazy" />
                    {video.duration ? (
                      <span className={styles.duration}>{formatDuration(video.duration)}</span>
                    ) : null}
                  </span>
                  <span className={styles.cardTitle}>{video.title}</span>
                  <span className={styles.rowMeta}>{video.channelTitle}</span>
                  <span className={styles.rowMeta}>
                    {[
                      video.views !== null && t('views', { count: views.format(video.views) }),
                      video.published !== null && since(video.published)
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                {/* Actions au survol de la miniature, comme sur YouTube */}
                <span className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.cardAction}
                    title={t('playNow')}
                    aria-label={t('playNow')}
                    onClick={() => onPlayNow(video)}
                  >
                    <Play size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={styles.cardAction}
                    title={t('addToQueue')}
                    aria-label={t('addToQueue')}
                    onClick={() => onEnqueue(video)}
                  >
                    <ListPlus size={15} aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {onMore && (
            <div className={styles.more}>
              <Button onClick={onMore} disabled={loadingMore}>
                {loadingMore && <LoaderCircle className={styles.spin} size={15} aria-hidden />}
                {t('moreResults')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Durée « 1:02:03 » ou « 4:05 ». */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Heure courante, rafraîchie chaque minute (durées « il y a… »). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}
