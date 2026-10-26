import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LogOut, Music2, Play, RefreshCw, Search } from 'lucide-react'
import {
  AccountRequired,
  Button,
  errorMessage,
  mailErrorMessage,
  needsReconnect,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { SpotifyItem, SpotifyKind, SpotifyState } from '@shared/spotify'
import styles from './SpotifyWidget.module.css'

type Tab = 'playlists' | 'liked' | 'recent' | 'search'

interface SpotifyConfig {
  tab?: Tab
}

/**
 * Spotify : playlists, titres likés, écoutes récentes et recherche. Un clic ouvre l'élément
 * dans l'application Spotify (installée, ou dans un bloc), qui le lit.
 */
export function SpotifyWidget({
  config,
  setConfig
}: WidgetProps<SpotifyConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.spotify
  const [state, setState] = useState<SpotifyState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const tab = config.tab ?? 'playlists'

  const load = useCallback(
    () =>
      void api
        .state()
        .then(setState)
        .catch((failure: unknown) => setLoadError(errorMessage(failure))),
    [api]
  )
  useEffect(load, [load])

  if (!state) {
    return <p className={loadError ? styles.error : styles.empty}>{loadError ?? t('loading')}</p>
  }
  // Pas de compte (ou pas d'identifiant d'application : Paramètres → Comptes → Avancé)
  if (!state.configured || !state.user) {
    return (
      <div className={styles.spotify}>
        <AccountRequired service="spotify" onConnected={load}>
          <p className={styles.footnote}>{t('freeHint')}</p>
        </AccountRequired>
      </div>
    )
  }

  return (
    <div className={styles.spotify}>
      <div className={styles.toolbar}>
        {(['playlists', 'liked', 'recent', 'search'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={styles.tab}
            aria-selected={tab === key}
            onClick={() => setConfig({ tab: key })}
          >
            {t(`tab.${key}`)}
          </button>
        ))}
        <span className={styles.spacer} />
        <span className={styles.user} title={state.user.name}>
          {state.user.image && <img src={state.user.image} alt="" />}
        </span>
        <button
          type="button"
          className={styles.iconButton}
          title={t('disconnect')}
          aria-label={t('disconnect')}
          onClick={() => void api.disconnect().then(setState)}
        >
          <LogOut size={14} aria-hidden />
        </button>
      </div>
      <Browser key={tab} tab={tab} />
    </div>
  )
}

function Browser({ tab }: { tab: Tab }): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.spotify
  const [items, setItems] = useState<SpotifyItem[] | null>(null)
  /** Échec du chargement (erreur reçue : un compte à reconnecter s'affiche autrement). */
  const [error, setError] = useState<unknown>(null)
  const [playlist, setPlaylist] = useState<SpotifyItem | null>(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [tick, setTick] = useState(0)

  const kind: SpotifyKind = playlist ? 'playlist' : tab
  const value = playlist ? playlist.id : tab === 'search' ? search : undefined

  useEffect(() => {
    if (kind === 'search' && !value) return
    let cancelled = false
    api
      .data(kind, value)
      .then((list) => {
        if (cancelled) return
        setItems(list)
        setError(null)
      })
      .catch((failure: unknown) => !cancelled && setError(failure ?? 'unknown'))
    return () => {
      cancelled = true
    }
  }, [api, kind, value, tick])

  const minutes = (ms: number | null): string =>
    ms === null
      ? ''
      : `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

  return (
    <div className={styles.browser}>
      {tab === 'search' && !playlist && (
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(query.trim())
          }}
        >
          <Search size={13} aria-hidden />
          <input
            autoFocus
            value={query}
            placeholder={t('search')}
            aria-label={t('search')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      )}
      {playlist && (
        <div className={styles.back}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={t('back')}
            onClick={() => setPlaylist(null)}
          >
            <ArrowLeft size={15} aria-hidden />
          </button>
          <strong>{playlist.name}</strong>
          <Button icon={Play} onClick={() => void api.open(playlist.uri)}>
            {t('playAll')}
          </Button>
        </div>
      )}
      {error && needsReconnect(error) ? (
        // Jeton révoqué, autorisation retirée… : reconnexion sur place
        <AccountRequired
          service="spotify"
          error={error}
          onConnected={() => setTick((n) => n + 1)}
        />
      ) : error ? (
        <div className={styles.empty}>
          <p className={styles.error}>{mailErrorMessage(error)}</p>
          <Button icon={RefreshCw} onClick={() => setTick((n) => n + 1)}>
            {t('retry')}
          </Button>
        </div>
      ) : tab === 'search' && !search && !playlist ? (
        <p className={styles.empty}>{t('searchHint')}</p>
      ) : items === null ? (
        <p className={styles.empty}>{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>{t('nothing')}</p>
      ) : (
        <ul className={styles.items}>
          {items.map((item, index) => (
            <li key={`${item.uri}-${index}`} className={styles.itemRow}>
              <button
                type="button"
                className={styles.item}
                title={item.kind === 'playlist' ? t('openPlaylist') : t('openInSpotify')}
                onClick={() =>
                  item.kind === 'playlist' && tab !== 'search'
                    ? setPlaylist(item)
                    : void api.open(item.uri)
                }
              >
                {item.image ? (
                  <img src={item.image} alt="" loading="lazy" data-round={item.kind === 'artist'} />
                ) : (
                  <span className={styles.noImage}>
                    <Music2 size={16} aria-hidden />
                  </span>
                )}
                <span className={styles.itemText}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.kind !== 'track' && `${t(`kind.${item.kind}`)} · `}
                    {item.subtitle}
                  </span>
                </span>
                <span className={styles.duration}>{minutes(item.durationMs)}</span>
              </button>
              {item.kind === 'playlist' && (
                <button
                  type="button"
                  className={styles.playButton}
                  title={t('playAll')}
                  aria-label={t('playItem', { name: item.name })}
                  onClick={() => void api.open(item.uri)}
                >
                  <Play size={13} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
