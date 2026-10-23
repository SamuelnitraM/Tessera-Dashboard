import { ListVideo, PanelBottomClose, PanelRightClose, SkipForward, X } from 'lucide-react'
import { usePluginTranslation, type QueueItem } from '@tessera/plugin-sdk'
import styles from './YouTubeWidget.module.css'

interface QueuePanelProps {
  current: string | null
  queue: QueueItem[]
  onNext: () => void
  onRemove: (index: number) => void
  onClear: () => void
  /** Referme le panneau (un bouton de l'en-tête du bloc le rouvre). */
  onCollapse: () => void
  /** Panneau à droite du lecteur (sinon dessous). */
  side: boolean
}

/**
 * File « À suivre », à côté du lecteur (comme sur la page d'une vidéo YouTube). Affichée
 * seulement quand une vidéo attend son tour ; refermable.
 */
export function QueuePanel({
  current,
  queue,
  onNext,
  onRemove,
  onClear,
  onCollapse,
  side
}: QueuePanelProps): React.JSX.Element {
  const t = usePluginTranslation()
  return (
    <aside className={styles.queue} aria-label={t('queue.title')}>
      {current && (
        <div className={styles.nowPlaying}>
          <span className={styles.nowLabel}>{t('queue.now')}</span>
          <span className={styles.nowTitle} title={current}>
            {current}
          </span>
        </div>
      )}
      <div className={styles.queueHeader}>
        <ListVideo size={15} aria-hidden />
        <span className={styles.queueTitle}>
          {t('queue.title')} ({queue.length})
        </span>
        <button
          type="button"
          className={styles.iconButton}
          title={t('queue.next')}
          aria-label={t('queue.next')}
          onClick={onNext}
        >
          <SkipForward size={15} aria-hidden />
        </button>
        <button type="button" className={styles.textButton} onClick={onClear}>
          {t('queue.clear')}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('queue.hide')}
          aria-label={t('queue.hide')}
          onClick={onCollapse}
        >
          {side ? (
            <PanelRightClose size={15} aria-hidden />
          ) : (
            <PanelBottomClose size={15} aria-hidden />
          )}
        </button>
      </div>
      <ol className={styles.queueList}>
        {queue.map((item, index) => (
          <li key={`${item.link}-${index}`} className={styles.queueItem}>
            <img className={styles.queueThumb} src={item.thumbnail} alt="" loading="lazy" />
            <span className={styles.queueText}>
              <span className={styles.queueItemTitle} title={item.title}>
                {item.title}
              </span>
              <span className={styles.rowMeta}>{item.channel}</span>
            </span>
            <button
              type="button"
              className={styles.iconButton}
              title={t('queue.remove')}
              aria-label={t('queue.remove')}
              onClick={() => onRemove(index)}
            >
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}
