import { useEffect, useState } from 'react'
import { Check, ClipboardList, Pin, PinOff, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ClipboardEntry } from '@shared/header-bar'
import { matchesSearch } from '../../lib/catalog'
import { HeaderPopover } from './HeaderPopover'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

/** Historique tenu par le processus principal, mis à jour à chaque copie. */
function useClipboardEntries(): ClipboardEntry[] {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  useEffect(() => {
    let cancelled = false
    void window.tessera.headerBar.clipboard.list().then((list) => !cancelled && setEntries(list))
    const unsubscribe = window.tessera.headerBar.clipboard.onChange(setEntries)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
  return entries
}

/**
 * Presse-papiers : les derniers textes et images copiés (en mémoire seulement, sauf les
 * éléments épinglés). Un clic recopie l'élément.
 */
export function ClipboardHistoryItem(): React.JSX.Element {
  const { t } = useTranslation()
  const entries = useClipboardEntries()
  return (
    <HeaderPopover
      label={t('headerBar.names.clipboard')}
      button={<ClipboardList size={16} aria-hidden />}
    >
      {() => <ClipboardPanel entries={entries} />}
    </HeaderPopover>
  )
}

function ClipboardPanel({ entries }: { entries: ClipboardEntry[] }): React.JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [limit, setLimit] = useState(false)
  const api = window.tessera.headerBar.clipboard

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])

  const visible = entries.filter(
    (entry) => !query.trim() || (entry.kind === 'text' && matchesSearch(query, [entry.text]))
  )
  const pinned = visible.filter((entry) => entry.pinned)
  const recent = visible.filter((entry) => !entry.pinned)

  const list = (items: ClipboardEntry[]): React.JSX.Element => (
    <ul className={styles.clipboardList}>
      {items.map((entry) => (
        <li key={entry.id} className={styles.clipboardEntry}>
          <button
            type="button"
            className={styles.clipboardContent}
            title={t('headerBar.clipboard.copy')}
            onClick={() => {
              void api.copy(entry.id)
              setCopied(entry.id)
            }}
          >
            {entry.kind === 'image' && entry.preview ? (
              <>
                <img src={entry.preview} alt="" />
                {entry.size && (
                  <span className={styles.muted}>{t('headerBar.clipboard.image', entry.size)}</span>
                )}
              </>
            ) : (
              <span className={styles.clipboardText}>{entry.text}</span>
            )}
            {copied === entry.id && (
              <span className={styles.copiedBadge}>
                <Check size={12} aria-hidden /> {t('headerBar.copied')}
              </span>
            )}
          </button>
          <span className={styles.clipboardActions}>
            <button
              type="button"
              className={styles.iconButton}
              data-active={entry.pinned}
              title={entry.pinned ? t('headerBar.clipboard.unpin') : t('headerBar.clipboard.pin')}
              aria-label={
                entry.pinned ? t('headerBar.clipboard.unpin') : t('headerBar.clipboard.pin')
              }
              onClick={() => void api.pin(entry.id, !entry.pinned).then((done) => setLimit(!done))}
            >
              {entry.pinned ? <PinOff size={14} aria-hidden /> : <Pin size={14} aria-hidden />}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              title={t('headerBar.clipboard.remove')}
              aria-label={t('headerBar.clipboard.remove')}
              onClick={() => void api.remove(entry.id)}
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className={styles.clipboard}>
      <PanelTitle title={t('headerBar.names.clipboard')}>
        {recent.length > 0 && (
          <button type="button" className={styles.linkButton} onClick={() => void api.clear()}>
            {t('headerBar.clipboard.clear')}
          </button>
        )}
      </PanelTitle>
      {entries.length > 0 && (
        <input
          className={styles.textInput}
          type="search"
          value={query}
          placeholder={t('headerBar.clipboard.search')}
          aria-label={t('headerBar.clipboard.search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      {limit && <p className={styles.error}>{t('headerBar.clipboard.pinLimit')}</p>}
      {entries.length === 0 ? (
        <p className={styles.muted}>{t('headerBar.clipboard.empty')}</p>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>{t('headerBar.noResults')}</p>
      ) : (
        <div className={styles.clipboardScroll}>
          {pinned.length > 0 && (
            <>
              <h3 className={styles.groupTitle}>{t('headerBar.clipboard.pinned')}</h3>
              {list(pinned)}
            </>
          )}
          {recent.length > 0 && (
            <>
              {pinned.length > 0 && (
                <h3 className={styles.groupTitle}>{t('headerBar.clipboard.recent')}</h3>
              )}
              {list(recent)}
            </>
          )}
        </div>
      )}
      <p className={styles.footnote}>{t('headerBar.clipboard.privacy')}</p>
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function ClipboardHistoryBlock(): React.JSX.Element {
  const entries = useClipboardEntries()
  return <ClipboardPanel entries={entries} />
}
