import { useEffect, useState } from 'react'
import { ArrowLeft, LogOut, Music2, Play, RefreshCw, Search } from 'lucide-react'
import {
  Button,
  mailErrorMessage,
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
  const [error, setError] = useState<string | null>(null)
  const tab = config.tab ?? 'playlists'

  useEffect(() => {
    void api.state().then(setState)
  }, [api])

  if (!state) return <p className={styles.empty}>{t('loading')}</p>
  if (!state.configured || !state.user) {
    return <Setup state={state} onState={setState} error={error} onError={setError} />
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

function Setup({
  state,
  onState,
  error,
  onError
}: {
  state: SpotifyState
  onState: (state: SpotifyState) => void
  error: string | null
  onError: (error: string | null) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.spotify
  const [clientId, setClientId] = useState(state.ownClientId)
  const [busy, setBusy] = useState(false)

  const connect = (): void => {
    setBusy(true)
    onError(null)
    api
      .connect()
      .then(onState)
      .catch((failure: unknown) => onError(mailErrorMessage(failure)))
      .finally(() => setBusy(false))
  }

  return (
    <div className={styles.setup}>
      <Music2 size={28} aria-hidden />
      <p>{t('intro')}</p>
      {!state.configured && (
        <>
          <ol className={styles.steps}>
            <li>{t('step1')}</li>
            <li>{t('step2', { uri: state.redirectUri })}</li>
            <li>{t('step3')}</li>
          </ol>
          <form
            className={styles.row}
            onSubmit={(event) => {
              event.preventDefault()
              void api
                .setClientId(clientId)
                .then(onState)
                .catch((failure: Error) => onError(failure.message))
            }}
          >
            <input
              value={clientId}
              placeholder={t('clientId')}
              aria-label={t('clientId')}
              onChange={(event) => setClientId(event.target.value)}
            />
            <Button type="submit">{t('saveClientId')}</Button>
          </form>
        </>
      )}
      {state.configured && (
        <Button variant="primary" disabled={busy} onClick={connect}>
          {busy ? t('waiting') : t('connect')}
        </Button>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.footnote}>{t('freeHint')}</p>
    </div>
  )
}

function Browser({ tab }: { tab: Tab }): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.spotify
  const [items, setItems] = useState<SpotifyItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      .catch((failure: unknown) => !cancelled && setError(mailErrorMessage(failure)))
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
      {error ? (
        <div className={styles.empty}>
          <p className={styles.error}>{error}</p>
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
            <li key={`${item.uri}-${index}`}>
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
                {item.kind === 'playlist' && (
                  <span
                    role="button"
                    tabIndex={0}
                    className={styles.playButton}
                    title={t('playAll')}
                    onClick={(event) => {
                      event.stopPropagation()
                      void api.open(item.uri)
                    }}
                  >
                    <Play size={13} aria-hidden />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
