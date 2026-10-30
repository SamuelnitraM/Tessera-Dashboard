import { useCallback, useEffect, useRef, useState } from 'react'
import { NowPlaying } from './PlayingButton'
import { usePlayback } from './usePlayback'
import {
  AppWindow,
  ArrowLeft,
  Download,
  ExternalLink,
  ListMusic,
  LogOut,
  Music2,
  Play,
  RefreshCw,
  RotateCw,
  Search
} from 'lucide-react'
import {
  AccountRequired,
  Button,
  errorMessage,
  InstalledAppView,
  mailErrorMessage,
  needsReconnect,
  openWebPage,
  refreshInstalledApp,
  takeOutInstalledApp,
  useInstalledApps,
  usePluginTranslation,
  type PanOffset,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { SpotifyItem, SpotifyKind, SpotifyState } from '@shared/spotify'
import styles from './SpotifyWidget.module.css'

type Tab = 'playlists' | 'liked' | 'recent' | 'search'

interface SpotifyConfig {
  tab?: Tab
  /** Contenu du bloc : la vraie application Spotify (par défaut), ou le lecteur de Tessera. */
  view?: 'app' | 'player'
  /**
   * Application installée qui affiche Spotify. Elle reste ouverte (cachée) en mode lecteur : la
   * musique continue.
   */
  embeddedAppId?: string | null
  /** Partie affichée quand la fenêtre de Spotify est plus grande que le bloc. */
  offset?: PanOffset
}

/** Page de téléchargement de Spotify pour Windows. */
const DOWNLOAD_URL = 'https://www.spotify.com/download/windows/'

/**
 * Spotify : la vraie application Spotify du PC dans le bloc (compte gratuit compris), ou le
 * lecteur de Tessera (lecture en cours, et avec un compte playlists, titres likés, écoutes
 * récentes et recherche).
 */
export function SpotifyWidget(props: WidgetProps<SpotifyConfig>): React.JSX.Element {
  const { instanceId, config, setConfig } = props
  const t = usePluginTranslation()
  const view = config.view ?? 'app'
  // La barre du bloc sert aussi de poignée pour déplacer une fenêtre plus grande que le bloc
  const header = useRef<HTMLDivElement>(null)
  const appId = config.embeddedAppId ?? null
  const shown = useInstalledApps().some((app) => app.id === appId)

  return (
    <div className={styles.block}>
      <div ref={header} className={styles.viewBar}>
        <div className={styles.views} role="group" aria-label={t('view.label')}>
          {(['app', 'player'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.view} no-drag`}
              aria-pressed={view === key}
              title={t(`view.${key}Title`)}
              onClick={() => setConfig({ view: key })}
            >
              {key === 'app' ? (
                <AppWindow size={14} aria-hidden />
              ) : (
                <ListMusic size={14} aria-hidden />
              )}
              <span>{t(`view.${key}`)}</span>
            </button>
          ))}
        </div>
        <span className={styles.spacer} />
        {view === 'app' && appId && shown && (
          <>
            <button
              type="button"
              className={`${styles.iconButton} no-drag`}
              title={t('app.refresh')}
              aria-label={t('app.refresh')}
              onClick={() => void refreshInstalledApp(appId)}
            >
              <RotateCw size={14} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} no-drag`}
              title={t('app.takeOut')}
              aria-label={t('app.takeOut')}
              onClick={() => void takeOutInstalledApp(appId)}
            >
              <ExternalLink size={14} aria-hidden />
            </button>
          </>
        )}
      </div>
      {view === 'app' ? (
        <SpotifyApp
          hostId={instanceId}
          appId={appId}
          offset={config.offset}
          header={header}
          setConfig={setConfig}
        />
      ) : (
        <TesseraPlayer {...props} />
      )}
    </div>
  )
}

/**
 * La fenêtre de l'application Spotify de ce PC, comme une application installée : Spotify est
 * ajouté aux applications de Tessera au premier affichage (lancé s'il ne tourne pas, repris s'il
 * est déjà ouvert).
 */
function SpotifyApp({
  hostId,
  appId,
  offset,
  header,
  setConfig
}: {
  hostId: string
  appId: string | null
  offset?: PanOffset
  header: React.RefObject<HTMLDivElement | null>
  setConfig: (patch: Partial<SpotifyConfig>) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const app = useInstalledApps().find((candidate) => candidate.id === appId)
  const [missing, setMissing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Une demande à la fois : l'application ajoutée arrive dans les réglages un instant après
  const asked = useRef(-1)

  // Demandée à chaque ouverture du bloc, même si elle est déjà là : Spotify a pu être réinstallé
  // autrement (Microsoft Store ↔ site), son lancement est alors mis à jour
  useEffect(() => {
    if (asked.current === attempt) return
    asked.current = attempt
    window.tessera.spotify
      .app()
      .then((id) => {
        if (!id) setMissing(!app)
        else if (id !== appId) setConfig({ embeddedAppId: id, offset: { x: 0, y: 0 } })
      })
      .catch(() => setMissing(!app))
  }, [app, appId, attempt, setConfig])

  if (app) {
    return (
      <div className={styles.window}>
        <InstalledAppView
          appId={app.id}
          hostId={hostId}
          offset={offset}
          onOffsetChange={(next) => setConfig({ offset: next })}
          panHandle={header}
        />
      </div>
    )
  }
  if (!missing) return <p className={styles.empty}>{t('app.opening')}</p>
  return (
    <div className={styles.notInstalled}>
      <Music2 size={28} aria-hidden />
      <strong>{t('app.missingTitle')}</strong>
      <p>{t('app.missingText')}</p>
      <div className={styles.actions}>
        <Button variant="primary" icon={Download} onClick={() => void openWebPage(DOWNLOAD_URL)}>
          {t('app.download')}
        </Button>
        <Button
          icon={RefreshCw}
          onClick={() => {
            setMissing(false)
            setAttempt((n) => n + 1)
          }}
        >
          {t('app.retry')}
        </Button>
        <Button icon={ListMusic} onClick={() => setConfig({ view: 'player' })}>
          {t('app.usePlayer')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Lecteur de Tessera : playlists, titres likés, écoutes récentes et recherche (avec un compte).
 * Un clic ouvre l'élément dans l'application Spotify, qui le lit.
 */
function TesseraPlayer({ config, setConfig }: WidgetProps<SpotifyConfig>): React.JSX.Element {
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
        <WithoutAccount />
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

/**
 * Sans compte (ou API refusée par Spotify) : la lecture en cours de l'application Spotify et ses
 * commandes, et une recherche qui s'ouvre dans l'application.
 */
function WithoutAccount(): React.JSX.Element {
  const t = usePluginTranslation()
  const { playback, refresh } = usePlayback(true)
  const [query, setQuery] = useState('')
  return (
    <section className={styles.free}>
      <strong>{t('free.title')}</strong>
      <NowPlaying playback={playback} onChange={refresh} />
      <form
        className={styles.searchRow}
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          const text = query.trim()
          if (text) void window.tessera.spotify.open(`spotify:search:${encodeURIComponent(text)}`)
        }}
      >
        <input
          value={query}
          placeholder={t('free.search')}
          aria-label={t('free.search')}
          maxLength={200}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" icon={Search} disabled={!query.trim()}>
          {t('free.searchButton')}
        </Button>
      </form>
    </section>
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
