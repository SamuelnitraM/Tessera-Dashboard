import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BellOff,
  CheckCheck,
  ExternalLink,
  Plus,
  RefreshCw,
  Rss,
  Search,
  Trash2
} from 'lucide-react'
import {
  ConfirmDialog,
  errorMessage,
  openContextMenu,
  useLanguage,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { NewsFeed, NewsItem, NewsState } from '@shared/news'
import styles from './NewsWidget.module.css'

interface NewsConfig {
  /** Flux affiché, ou tous. */
  feedId?: string
  unreadOnly?: boolean
}

const REFRESH_MS = 60_000

/** Actualités : les articles de tes flux RSS dans une seule liste, lus et non lus. */
export function NewsWidget({ config, setConfig }: WidgetProps<NewsConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const api = window.tessera.news
  const [state, setState] = useState<NewsState | null>(null)
  const [query, setQuery] = useState('')
  const [address, setAddress] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Échec du chargement (affiché tant que les articles n'ont pas pu être lus). */
  const [loadError, setLoadError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<NewsFeed | null>(null)
  const [wide, setWide] = useState(true)
  /** Heure de référence des dates relatives (mise à jour avec la liste). */
  const [now, setNow] = useState(() => Date.now())
  const rootRef = useRef<HTMLDivElement>(null)
  const feedId = config.feedId ?? 'all'
  const unreadOnly = config.unreadOnly ?? false

  // L'état est tenu par le processus principal (lecture toutes les 15 minutes)
  useEffect(() => {
    const load = (): void =>
      void api
        .state()
        .then((next) => {
          setState(next)
          setNow(Date.now())
          setLoadError(null)
        })
        .catch((failure: unknown) => setLoadError(errorMessage(failure)))
    load()
    const timer = window.setInterval(() => !document.hidden && load(), REFRESH_MS)
    // Changement fait dans un autre bloc, ou nouvelle lecture des flux
    const off = api.onChange((next) => {
      setState(next)
      setNow(Date.now())
    })
    return () => {
      window.clearInterval(timer)
      off()
    }
  }, [api])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 560))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const run = (action: Promise<NewsState>): void => {
    setBusy(true)
    setError(null)
    action
      .then(setState)
      .catch((failure: unknown) => setError(errorMessage(failure)))
      .finally(() => setBusy(false))
  }

  const items = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (state?.items ?? []).filter(
      (item) =>
        (feedId === 'all' || item.feedId === feedId) &&
        (!unreadOnly || !item.read) &&
        words.every((word) => `${item.title} ${item.summary}`.toLowerCase().includes(word))
    )
  }, [state, feedId, unreadOnly, query])

  const unread = (id: string): number =>
    (state?.items ?? []).filter((item) => !item.read && (id === 'all' || item.feedId === id)).length
  const feedTitle = (id: string): string => state?.feeds.find((feed) => feed.id === id)?.title ?? ''

  const open = (item: NewsItem): void => {
    if (!item.read) run(api.markRead([item.id], true))
    if (item.link) window.open(item.link, '_blank')
  }

  const relative = (date: number): string => {
    if (!date) return ''
    const minutes = Math.round((date - now) / 60_000)
    const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
    if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
    if (Math.abs(minutes) < 1440) return format.format(Math.round(minutes / 60), 'hour')
    return format.format(Math.round(minutes / 1440), 'day')
  }

  return (
    <div ref={rootRef} className={styles.news}>
      <div className={styles.toolbar}>
        {!wide && (
          <select
            className={styles.select}
            value={feedId}
            aria-label={t('feed')}
            onChange={(event) => setConfig({ feedId: event.target.value })}
          >
            <option value="all">{t('allFeeds', { count: unread('all') })}</option>
            {state?.feeds.map((feed) => (
              <option key={feed.id} value={feed.id}>
                {feed.title} ({unread(feed.id)})
              </option>
            ))}
          </select>
        )}
        <label className={styles.search}>
          <Search size={13} aria-hidden />
          <input
            value={query}
            placeholder={t('search')}
            aria-label={t('search')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.iconButton}
          data-active={unreadOnly}
          title={t('unreadOnly')}
          aria-label={t('unreadOnly')}
          onClick={() => setConfig({ unreadOnly: !unreadOnly })}
        >
          <Rss size={14} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('markAllRead')}
          aria-label={t('markAllRead')}
          disabled={items.every((item) => item.read)}
          onClick={() =>
            run(
              api.markRead(
                items.filter((item) => !item.read).map((item) => item.id),
                true
              )
            )
          }
        >
          <CheckCheck size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('refresh')}
          aria-label={t('refresh')}
          onClick={() => run(api.refresh())}
        >
          <RefreshCw size={14} className={busy ? styles.spin : undefined} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('addFeed')}
          aria-label={t('addFeed')}
          onClick={() => setAdding(!adding)}
        >
          <Plus size={15} aria-hidden />
        </button>
      </div>

      {adding && (
        <form
          className={styles.addForm}
          onSubmit={(event) => {
            event.preventDefault()
            if (!address.trim()) return
            run(
              api.addFeed(address.trim()).then((next) => {
                setAddress('')
                setAdding(false)
                return next
              })
            )
          }}
        >
          <input
            autoFocus
            value={address}
            placeholder={t('feedAddress')}
            aria-label={t('feedAddress')}
            onChange={(event) => setAddress(event.target.value)}
          />
          <button type="submit" className={styles.primary} disabled={busy}>
            {t('follow')}
          </button>
        </form>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.body}>
        {wide && (
          <nav className={styles.feeds} aria-label={t('feeds')}>
            <button
              type="button"
              className={styles.feed}
              data-active={feedId === 'all'}
              onClick={() => setConfig({ feedId: 'all' })}
            >
              <span>{t('all')}</span>
              {unread('all') > 0 && <span className={styles.count}>{unread('all')}</span>}
            </button>
            {state?.feeds.map((feed) => (
              <button
                key={feed.id}
                type="button"
                className={styles.feed}
                data-active={feedId === feed.id}
                data-error={!!feed.error}
                title={feed.error ?? feed.url}
                onClick={() => setConfig({ feedId: feed.id })}
                onContextMenu={openContextMenu([
                  {
                    label: feed.notify ? t('notifyOff') : t('notifyOn'),
                    icon: feed.notify ? BellOff : Bell,
                    onSelect: () => run(api.updateFeed(feed.id, { notify: !feed.notify }))
                  },
                  ...(feed.siteUrl
                    ? [
                        {
                          label: t('openSite'),
                          icon: ExternalLink,
                          onSelect: () => void window.open(feed.siteUrl!, '_blank')
                        }
                      ]
                    : []),
                  'separator' as const,
                  {
                    label: t('unfollow'),
                    icon: Trash2,
                    danger: true,
                    onSelect: () => setRemoving(feed)
                  }
                ])}
              >
                {feed.notify && <Bell size={11} aria-hidden />}
                <span>{feed.title}</span>
                {unread(feed.id) > 0 && <span className={styles.count}>{unread(feed.id)}</span>}
              </button>
            ))}
            <p className={styles.hint}>{t('feedsHint')}</p>
          </nav>
        )}
        <div className={styles.items}>
          {state === null ? (
            <p className={loadError ? styles.error : styles.empty}>{loadError ?? t('loading')}</p>
          ) : state.feeds.length === 0 ? (
            <div className={styles.empty}>
              <Rss size={26} aria-hidden />
              <p>{t('noFeeds')}</p>
            </div>
          ) : items.length === 0 ? (
            <p className={styles.empty}>{unreadOnly ? t('allRead') : t('noItems')}</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} data-read={item.read}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => open(item)}
                    onContextMenu={openContextMenu([
                      {
                        label: item.read ? t('markUnread') : t('markRead'),
                        onSelect: () => run(api.markRead([item.id], !item.read))
                      }
                    ])}
                  >
                    {item.image && <img src={item.image} alt="" loading="lazy" />}
                    <span className={styles.itemText}>
                      <strong>{item.title}</strong>
                      {item.summary && <span className={styles.summary}>{item.summary}</span>}
                      <span className={styles.meta}>
                        {feedTitle(item.feedId)} · {relative(item.date)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={t('unfollowTitle')}
        message={t('unfollowMessage', { title: removing?.title ?? '' })}
        onClose={() => setRemoving(null)}
        actions={[
          { label: t('cancel'), onClick: () => setRemoving(null) },
          {
            label: t('unfollow'),
            variant: 'danger',
            onClick: () => {
              if (removing) {
                run(api.removeFeed(removing.id))
                if (feedId === removing.id) setConfig({ feedId: 'all' })
              }
              setRemoving(null)
            }
          }
        ]}
      />
    </div>
  )
}
