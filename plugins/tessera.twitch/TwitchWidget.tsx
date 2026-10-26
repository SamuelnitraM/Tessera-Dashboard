import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  House,
  LogIn,
  MessageSquare,
  MessageSquareOff,
  RefreshCw,
  Search,
  Tv,
  X
} from 'lucide-react'
import {
  Button,
  closeMediaView,
  MediaView,
  mailErrorMessage,
  EDIT_ACTIVE,
  openMediaSettings,
  parseMediaLink,
  playerUrl,
  twitchChatUrl,
  useLanguage,
  useMedia,
  useMediaReveal,
  useMediaStatus,
  useNotificationTarget,
  usePluginTranslation,
  useTwitchLive,
  WebView,
  type TwitchChannel,
  type WidgetProps
} from '@tessera/plugin-sdk'
import styles from './TwitchWidget.module.css'

interface TwitchConfig {
  /** Chaîne ou vidéo regardée (nom ou lien), gardée tant qu'elle n'est pas fermée. */
  channel?: string
  /** Le direct est affiché dans le bloc (sinon : page d'accueil). */
  watching?: boolean
  showChat: boolean
}

const dark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches

/**
 * Bloc Twitch, comme le site : la page d'accueil (chaînes suivies en direct, recherche de
 * chaînes) sert de point de départ ; le direct choisi s'affiche par-dessus, avec son chat.
 * Fermer le direct ramène à l'accueil ; revenir à l'accueil pendant la lecture le garde en
 * mini-lecteur.
 */
export function TwitchWidget({
  instanceId,
  config,
  setConfig
}: WidgetProps<TwitchConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useMedia()
  const status = useMediaStatus().twitch
  const connected = status.connected
  /** Recherche en cours (affichée à la place de l'accueil), ou `null`. */
  const [search, setSearch] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  /** Lecture automatique seulement après un choix de l'utilisateur (pas au démarrage). */
  const [autoplay, setAutoplay] = useState(false)

  // Directs déjà connus du processus principal (vérifiés régulièrement)
  useEffect(() => {
    if (connected) void media.twitchLive().catch(() => {})
  }, [media, connected])

  const watch = (channel: string): void => {
    setAutoplay(true)
    setSearch(null)
    setConfig({ channel, watching: true })
  }
  // Clic sur la notification d'un direct : la chaîne s'ouvre ici
  useNotificationTarget(watch)

  // « Revenir au bloc » depuis le mini-lecteur : le direct s'affiche de nouveau ici
  useMediaReveal(instanceId, () => {
    setSearch(null)
    setConfig({ watching: true })
  })

  const target = config.channel ? parseMediaLink(config.channel, 'twitch') : null
  const login = target?.kind === 'twitch-channel' ? target.login : null
  const watching = !!target && config.watching !== false

  /** Ferme le direct : retour à l'accueil. */
  const closeStream = (): void => {
    closeMediaView(instanceId)
    setConfig({ channel: '', watching: false })
  }

  /** Accueil : le direct continue en mini-lecteur s'il joue. */
  const goHome = (): void => {
    setSearch(null)
    setConfig({ watching: false })
  }

  const submitSearch = (event: React.FormEvent): void => {
    event.preventDefault()
    const text = searchInput.trim()
    if (!text) return
    // Un lien Twitch collé : la chaîne s'ouvre directement ; sans compte, le nom aussi
    if (/twitch\.tv/i.test(text) || !connected) {
      if (parseMediaLink(text, 'twitch')) {
        setSearchInput('')
        return watch(text)
      }
    }
    setSearch(text)
    setConfig({ watching: false })
  }

  return (
    <div className={styles.widget}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          data-active={!watching && search === null}
          title={t('home')}
          aria-label={t('home')}
          onClick={goHome}
        >
          <House size={16} aria-hidden />
        </button>
        {target && !watching && (
          <button
            type="button"
            className={styles.resume}
            title={t('resume')}
            onClick={() => {
              setSearch(null)
              setConfig({ watching: true })
            }}
          >
            <Tv size={14} aria-hidden />
            <span>{login ?? t('resume')}</span>
          </button>
        )}
        <form className={styles.search} role="search" onSubmit={submitSearch}>
          <input
            value={searchInput}
            placeholder={connected ? t('searchPlaceholder') : t('channelPlaceholder')}
            aria-label={t('searchPlaceholder')}
            spellCheck={false}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className={styles.searchClear}
              aria-label={t('clearSearch')}
              onClick={() => setSearchInput('')}
            >
              <X size={14} aria-hidden />
            </button>
          )}
          <button
            type="submit"
            className={styles.searchButton}
            title={t('search')}
            aria-label={t('search')}
          >
            <Search size={15} aria-hidden />
          </button>
        </form>
        {watching && login && (
          <button
            type="button"
            className={styles.iconButton}
            title={config.showChat ? t('hideChat') : t('showChat')}
            aria-label={config.showChat ? t('hideChat') : t('showChat')}
            onClick={() => setConfig({ showChat: !config.showChat })}
          >
            {config.showChat ? (
              <MessageSquareOff size={15} aria-hidden />
            ) : (
              <MessageSquare size={15} aria-hidden />
            )}
          </button>
        )}
        {watching && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('closeStream')}
            aria-label={t('closeStream')}
            onClick={closeStream}
          >
            <X size={16} aria-hidden />
          </button>
        )}
        {connected ? (
          status.name && <span className={styles.account}>{status.name}</span>
        ) : (
          <button
            type="button"
            className={styles.signIn}
            title={t('signInHint')}
            onClick={openMediaSettings}
          >
            <LogIn size={14} aria-hidden />
            {t('signIn')}
          </button>
        )}
      </header>

      <div className={styles.content}>
        {watching && target ? (
          <div className={styles.watch}>
            <div className={styles.player}>
              <MediaView
                id={instanceId}
                src={playerUrl(target, autoplay)}
                title={login ?? 'Twitch'}
                link={config.channel}
              />
            </div>
            {login && config.showChat && (
              <div className={styles.chat}>
                <WebView key={login} src={twitchChatUrl(login, dark())} />
              </div>
            )}
          </div>
        ) : search !== null ? (
          <ChannelResults query={search} onWatch={watch} onBack={() => setSearch(null)} />
        ) : (
          <Home onWatch={watch} />
        )}
      </div>
    </div>
  )
}

/** Accueil : chaînes suivies en direct (ou invitation à se connecter). */
function Home({ onWatch }: { onWatch: (channel: string) => void }): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const media = useMedia()
  const status = useMediaStatus().twitch
  const live = useTwitchLive()
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const now = useNow()

  const refresh = async (): Promise<void> => {
    setRefreshing(true)
    setError(null)
    try {
      await media.twitchRefresh()
    } catch (failure) {
      setError(mailErrorMessage(failure))
    } finally {
      setRefreshing(false)
    }
  }

  if (!status.connected || status.error === 'auth') {
    return (
      <div className={styles.state}>
        <Tv size={26} aria-hidden />
        <p>{status.connected ? t('expired') : t('connect')}</p>
        <Button
          {...EDIT_ACTIVE}
          className="no-drag"
          variant="primary"
          icon={LogIn}
          onClick={openMediaSettings}
        >
          {status.connected ? t('reconnect') : t('signIn')}
        </Button>
        <p className={styles.hint}>{t('orSearch')}</p>
      </div>
    )
  }

  const viewers = new Intl.NumberFormat(language, { notation: 'compact' })
  const uptime = (startedAt: number): string => {
    const minutes = Math.max(0, Math.round((now - startedAt) / 60_000))
    return t('uptime', { h: Math.floor(minutes / 60), mm: String(minutes % 60).padStart(2, '0') })
  }

  return (
    <div className={styles.listArea}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>
          {live.length ? t('liveTitleCount', { count: live.length }) : t('liveTitle')}
        </span>
        <button
          type="button"
          className={styles.iconButton}
          title={t('refresh')}
          aria-label={t('refresh')}
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw size={15} className={refreshing ? styles.spin : undefined} aria-hidden />
        </button>
      </div>
      {error && <p className={styles.errorNote}>{error}</p>}
      {live.length === 0 ? (
        <p className={styles.note}>{t('noLive')}</p>
      ) : (
        <ul className={styles.grid}>
          {live.map((stream) => (
            <li key={stream.login}>
              <button
                type="button"
                className={styles.card}
                title={stream.title}
                onClick={() => onWatch(stream.login)}
              >
                <span className={styles.thumbBox}>
                  <img className={styles.cardThumb} src={stream.thumbnail} alt="" loading="lazy" />
                  <span className={styles.badge}>{uptime(stream.startedAt)}</span>
                </span>
                <span className={styles.cardTitle}>{stream.name}</span>
                <span className={styles.meta}>{stream.title}</span>
                <span className={styles.meta}>
                  {stream.game} · {t('viewers', { count: viewers.format(stream.viewers) })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Chaînes trouvées par la recherche (celles en direct d'abord). */
function ChannelResults({
  query,
  onWatch,
  onBack
}: {
  query: string
  onWatch: (channel: string) => void
  onBack: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useMedia()
  const [result, setResult] = useState<{
    query: string
    channels: TwitchChannel[] | null
    error: string | null
  } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    media.twitchSearch(query).then(
      (channels) => active && setResult({ query, channels, error: null }),
      (failure) => active && setResult({ query, channels: null, error: mailErrorMessage(failure) })
    )
    return () => {
      active = false
    }
  }, [media, query, attempt])

  const current = result?.query === query ? result : null

  return (
    <div className={styles.listArea}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.back} aria-label={t('back')} onClick={onBack}>
          <ArrowLeft size={15} aria-hidden />
        </button>
        <span className={styles.toolbarTitle}>{t('resultsFor', { query })}</span>
      </div>
      {current?.error ? (
        <div className={styles.state}>
          <p className={styles.error}>{current.error}</p>
          <Button onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</Button>
        </div>
      ) : !current?.channels ? (
        <p className={styles.note}>
          <RefreshCw size={16} className={styles.spin} aria-hidden />
        </p>
      ) : current.channels.length === 0 ? (
        <p className={styles.note}>{t('noResults')}</p>
      ) : (
        <ul className={styles.channels}>
          {current.channels.map((channel) => (
            <li key={channel.login}>
              <button
                type="button"
                className={styles.channel}
                onClick={() => onWatch(channel.login)}
              >
                <img className={styles.channelAvatar} src={channel.avatar} alt="" loading="lazy" />
                <span className={styles.channelText}>
                  <span className={styles.channelName}>
                    {channel.name}
                    {channel.live && <span className={styles.liveBadge}>{t('live')}</span>}
                  </span>
                  {channel.live && (
                    <span className={styles.meta}>
                      {channel.game ? `${channel.game} · ${channel.title}` : channel.title}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
