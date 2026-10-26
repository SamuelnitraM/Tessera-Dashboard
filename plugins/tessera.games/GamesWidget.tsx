import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExternalLink,
  FolderOpen,
  Gamepad2,
  LayoutGrid,
  PictureInPicture2,
  Play,
  RefreshCw,
  Search,
  Volume2,
  VolumeX
} from 'lucide-react'
import {
  growBlockToFit,
  InstalledAppView,
  openContextMenu,
  takeOutInstalledApp,
  useInstalledApps,
  useLanguage,
  usePluginTranslation,
  type PanOffset,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { Game, GameLauncher, GameStatus } from '@shared/games'
import styles from './GamesWidget.module.css'

interface GamesConfig {
  tab?: 'recent' | 'all'
  launcher?: GameLauncher | 'any'
  /** Fenêtre d'un jeu en cours affichée dans le bloc (application installée de Tessera). */
  embeddedAppId?: string | null
  embeddedGameId?: string | null
  offset?: PanOffset
}

const STATUS_MS = 3000

/**
 * Bibliothèque de jeux (Steam, Epic Games). Un clic lance le jeu par son lanceur, hors de
 * Tessera ; un jeu en cours se règle ici (volume du jeu, pas de Windows).
 */
export function GamesWidget({
  instanceId,
  config,
  setConfig
}: WidgetProps<GamesConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const api = window.tessera.games
  const [games, setGames] = useState<Game[] | null>(null)
  const [statuses, setStatuses] = useState<GameStatus[] | null>(null)
  const [query, setQuery] = useState('')
  const [launching, setLaunching] = useState<string | null>(null)
  const [capturing, setCapturing] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const header = useRef<HTMLDivElement>(null)
  const windowArea = useRef<HTMLDivElement>(null)
  const installed = useInstalledApps()
  const tab = config.tab ?? 'recent'
  const launcher = config.launcher ?? 'any'

  const load = (force = false): void =>
    void api
      .list(force)
      .then(setGames)
      .catch(() => setGames([]))
  useEffect(() => {
    void api
      .list()
      .then(setGames)
      .catch(() => setGames([]))
  }, [api])

  // Jeux en cours : vérifiés toutes les 3 secondes (pas quand la fenêtre est masquée)
  useEffect(() => {
    let cancelled = false
    let timer = 0
    const run = (): void => {
      const next = (): void => {
        if (!cancelled) timer = window.setTimeout(run, STATUS_MS)
      }
      if (document.hidden) return next()
      api
        .status()
        .then((list) => !cancelled && setStatuses(list))
        .catch(() => undefined)
        .finally(next)
    }
    run()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [api])

  useEffect(() => {
    if (!launching) return
    const timer = window.setTimeout(() => setLaunching(null), 4000)
    return () => window.clearTimeout(timer)
  }, [launching])

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const list = (games ?? []).filter(
      (game) =>
        (launcher === 'any' || game.launcher === launcher) &&
        words.every((word) => game.name.toLowerCase().includes(word))
    )
    if (tab === 'recent') {
      return [...list]
        .filter((game) => game.lastPlayed)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
    }
    return list
  }, [games, query, launcher, tab])

  const running = (statuses ?? [])
    .map((status) => ({ status, game: games?.find((game) => game.id === status.id) }))
    .filter((item): item is { status: GameStatus; game: Game } => !!item.game)

  const launch = (game: Game): void => {
    setLaunching(game.id)
    void api.launch(game.id)
  }

  const flash = (text: string): void => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 4000)
  }

  /** « Afficher dans le bloc » : la fenêtre du jeu vient ici. */
  const capture = (game: Game): void => {
    setCapturing(game.id)
    void api
      .capture(game.id)
      .then((appId) => {
        if (appId)
          setConfig({ embeddedAppId: appId, embeddedGameId: game.id, offset: { x: 0, y: 0 } })
        else flash(t('noWindow'))
      })
      .finally(() => setCapturing(null))
  }

  /** Rend la fenêtre du jeu au bureau, et revient à la bibliothèque. */
  const release = (): void => {
    if (config.embeddedAppId) void takeOutInstalledApp(config.embeddedAppId)
    setConfig({ embeddedAppId: null, embeddedGameId: null })
  }

  // Jeu affiché dans le bloc puis quitté : retour à la bibliothèque
  const embedded = config.embeddedAppId && config.embeddedGameId ? config.embeddedGameId : null
  const embeddedStatus = statuses?.find((status) => status.id === embedded)
  useEffect(() => {
    if (embedded && statuses && !embeddedStatus)
      setConfig({ embeddedAppId: null, embeddedGameId: null })
  }, [embedded, statuses, embeddedStatus, setConfig])
  const embeddedGame = games?.find((game) => game.id === embedded)

  // Fenêtre du jeu affichée : le bloc s'agrandit à sa taille (le jeu garde la sienne)
  const embeddedApp = installed.find((item) => item.id === config.embeddedAppId)
  const minWidth = embeddedApp?.minWidth ?? 0
  const minHeight = embeddedApp?.minHeight ?? 0
  useEffect(() => {
    if (!embedded || minWidth <= 0 || minHeight <= 0) return
    growBlockToFit(windowArea.current, { width: minWidth, height: minHeight })
  }, [embedded, minWidth, minHeight])

  if (config.embeddedAppId && embedded) {
    return (
      <div className={styles.games}>
        <div ref={header} className={styles.embeddedBar}>
          <span className={styles.runningDot} aria-hidden />
          <strong title={embeddedGame?.name}>{embeddedGame?.name}</strong>
          {embeddedStatus && <GameVolume status={embeddedStatus} name={embeddedGame?.name ?? ''} />}
          <button
            type="button"
            className={styles.iconButton}
            title={t('release')}
            aria-label={t('release')}
            onClick={release}
          >
            <ExternalLink size={14} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('library')}
            aria-label={t('library')}
            onClick={release}
          >
            <LayoutGrid size={14} aria-hidden />
          </button>
        </div>
        <div ref={windowArea} className={styles.embeddedWindow}>
          <InstalledAppView
            appId={config.embeddedAppId}
            hostId={instanceId}
            offset={config.offset}
            onOffsetChange={(offset) => setConfig({ offset })}
            panHandle={header}
          />
        </div>
      </div>
    )
  }

  const playtime = (minutes: number | null): string | null => {
    if (!minutes) return null
    return minutes < 60
      ? t('minutes', { count: minutes })
      : t('hours', { count: Math.round(minutes / 60).toLocaleString(language) })
  }

  return (
    <div className={styles.games}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          {(['recent', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={styles.tab}
              onClick={() => setConfig({ tab: key })}
            >
              {t(`tab.${key}`)}
            </button>
          ))}
        </div>
        <select
          className={styles.select}
          value={launcher}
          aria-label={t('launcher')}
          onChange={(event) =>
            setConfig({ launcher: event.target.value as GamesConfig['launcher'] })
          }
        >
          <option value="any">{t('allLaunchers')}</option>
          <option value="steam">Steam</option>
          <option value="epic">Epic Games</option>
        </select>
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
          title={t('refresh')}
          aria-label={t('refresh')}
          onClick={() => load(true)}
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </div>

      {running.length > 0 && (
        <section className={styles.running} aria-label={t('running')}>
          {running.map(({ status, game }) => (
            <div key={status.id} className={styles.runningGame}>
              <span className={styles.runningDot} aria-hidden />
              <strong title={game.name}>{game.name}</strong>
              <GameVolume status={status} name={game.name} />
              <button
                type="button"
                className={styles.captureButton}
                title={t('captureHint')}
                disabled={capturing === game.id}
                onClick={() => capture(game)}
              >
                <PictureInPicture2 size={14} aria-hidden />
                <span>{t('capture')}</span>
              </button>
            </div>
          ))}
        </section>
      )}

      {games === null ? (
        <p className={styles.empty}>{t('loading')}</p>
      ) : games.length === 0 ? (
        <div className={styles.empty}>
          <Gamepad2 size={28} aria-hidden />
          <p>{t('noGames')}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>
          {tab === 'recent' && !query ? t('noRecent') : t('noResults')}
        </p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((game) => {
            const isRunning = (statuses ?? []).some((status) => status.id === game.id)
            const time = playtime(game.playtimeMinutes)
            return (
              <li key={game.id}>
                <button
                  type="button"
                  className={styles.tile}
                  data-running={isRunning}
                  title={t('launch', { name: game.name })}
                  onClick={() => launch(game)}
                  onContextMenu={openContextMenu([
                    { label: t('launchShort'), icon: Play, onSelect: () => launch(game) },
                    {
                      label: t('openFolder'),
                      icon: FolderOpen,
                      onSelect: () => void window.tessera.files.show(game.installDir)
                    }
                  ])}
                >
                  <Cover game={game} />
                  <span className={styles.caption}>
                    <strong>{game.name}</strong>
                    <span>
                      {game.launcher === 'steam' ? 'Steam' : 'Epic'}
                      {time ? ` · ${time}` : ''}
                    </span>
                  </span>
                  {isRunning && <span className={styles.badge}>{t('runningBadge')}</span>}
                  {launching === game.id && !isRunning && (
                    <span className={styles.badge}>{t('launching')}</span>
                  )}
                  <span className={styles.play} aria-hidden>
                    <Play size={20} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className={styles.footnote}>{message ?? t('outside')}</p>
    </div>
  )
}

/**
 * Volume d'un jeu en cours. Pendant qu'on glisse le curseur, une seule demande part à la fois
 * (la dernière valeur l'emporte) : le curseur suit la souris sans à-coups, et la valeur
 * affichée ne revient pas en arrière quand une ancienne réponse arrive.
 */
function GameVolume({ status, name }: { status: GameStatus; name: string }): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.games
  /** Valeur choisie, gardée jusqu'à ce que le jeu l'ait reçue. */
  const [local, setLocal] = useState<number | null>(null)
  const [muted, setMuted] = useState<boolean | null>(null)
  const queue = useRef<{ sending: boolean; next: { volume?: number; muted?: boolean } | null }>({
    sending: false,
    next: null
  })

  const send = (change: { volume?: number; muted?: boolean }): void => {
    const state = queue.current
    if (state.sending) {
      state.next = { ...state.next, ...change }
      return
    }
    state.sending = true
    void api
      .setVolume(status.id, change)
      .catch(() => undefined)
      .finally(() => {
        state.sending = false
        const next = state.next
        state.next = null
        if (next) send(next)
        else {
          setLocal(null)
          setMuted(null)
        }
      })
  }

  // Le jeu a la valeur demandée : on reprend celle qu'il rapporte
  const isMuted = muted ?? status.muted
  const volume = local ?? status.volume
  if (!status.hasAudio) return <span className={styles.muted}>{t('noAudio')}</span>
  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        data-active={isMuted}
        title={isMuted ? t('unmute') : t('mute')}
        aria-label={isMuted ? t('unmute') : t('mute')}
        onClick={() => {
          setMuted(!isMuted)
          send({ muted: !isMuted })
        }}
      >
        {isMuted ? <VolumeX size={15} aria-hidden /> : <Volume2 size={15} aria-hidden />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={isMuted ? 0 : volume}
        className={styles.slider}
        aria-label={t('volume', { name })}
        onChange={(event) => {
          const value = Number(event.target.value)
          setLocal(value)
          setMuted(false)
          send({ volume: value })
        }}
      />
      <span className={styles.volumeValue}>{isMuted ? 0 : volume} %</span>
    </>
  )
}

/** Jaquette Steam (image de secours si absente), sinon icône du programme. */
function Cover({ game }: { game: Game }): React.JSX.Element {
  const [source, setSource] = useState(game.cover ?? game.icon)
  if (!source) {
    return (
      <span className={styles.noCover}>
        <Gamepad2 size={28} aria-hidden />
      </span>
    )
  }
  return (
    <img
      className={source === game.icon ? styles.icon : styles.cover}
      data-header={source === game.fallbackCover}
      src={source}
      alt=""
      loading="lazy"
      onError={() =>
        setSource(source === game.cover && game.fallbackCover ? game.fallbackCover : game.icon)
      }
    />
  )
}
