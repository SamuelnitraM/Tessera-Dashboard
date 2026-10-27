import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  House,
  ListVideo,
  LogIn,
  Play,
  RefreshCw,
  Search,
  Settings,
  SquarePlay,
  UserPlus,
  X
} from 'lucide-react'
import {
  AccountRequired,
  Button,
  closeMediaView,
  MEDIA_REFERRER,
  MediaView,
  mailErrorMessage,
  needsReconnect,
  openContextMenu,
  openMediaSettings,
  parseMediaLink,
  playerUrl,
  SegmentedControl,
  useMedia,
  useMediaPlaying,
  useMediaQueue,
  useLingering,
  useMediaReveal,
  usePluginTranslation,
  useYouTubeAccounts,
  type QueueItem,
  type WidgetProps,
  type YouTubeAccount,
  type YouTubePlaylist,
  type YouTubeVideo
} from '@tessera/plugin-sdk'
import { QueuePanel } from './QueuePanel'
import { VideoGrid } from './VideoGrid'
import styles from './YouTubeWidget.module.css'

type Tab = 'home' | 'playlists'

interface YouTubeConfig {
  /** Compte YouTube du bloc ; absent : le premier compte. */
  account?: string
  /** Vidéo en cours (gardée tant qu'elle n'est pas fermée). */
  link?: string
  /** Titre affiché par le mini-lecteur. */
  title?: string
  /** La vidéo est affichée dans le bloc (sinon : page d'accueil ou playlists). */
  watching?: boolean
  tab?: Tab
  /** File « À suivre » refermée par l'utilisateur. */
  queueHidden?: boolean
}

/** Bloc assez large : la file « À suivre » à côté du lecteur (sinon dessous). */
const WIDE_WIDTH = 760

const watchLink = (video: YouTubeVideo): string => `https://www.youtube.com/watch?v=${video.id}`

const toQueueItem = (video: YouTubeVideo): QueueItem => ({
  link: watchLink(video),
  title: video.title,
  channel: video.channelTitle,
  thumbnail: video.thumbnail
})

type GridHandlers = {
  onPick: (video: YouTubeVideo) => void
  onPlayNow: (video: YouTubeVideo) => void
  onEnqueue: (video: YouTubeVideo) => void
}

type Account = YouTubeAccount & { error: string | null }

/**
 * Bloc YouTube, comme le site : la page d'accueil (dernières vidéos des abonnements) sert de
 * point de départ ; une vidéo choisie s'affiche par-dessus, avec la file « À suivre ». Fermer
 * la vidéo ramène à l'accueil ; revenir à l'accueil pendant la lecture la garde en
 * mini-lecteur. En haut à droite : le compte YouTube, à changer d'un clic.
 */
export function YouTubeWidget({
  instanceId,
  config,
  setConfig
}: WidgetProps<YouTubeConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const accounts = useYouTubeAccounts()
  const account = accounts.find((item) => item.id === config.account) ?? accounts[0] ?? null
  const playing = useMediaPlaying(instanceId)
  const queue = useMediaQueue(instanceId)
  const tab = config.tab ?? 'home'
  /** Recherche en cours (affichée à la place de l'accueil), ou `null`. */
  const [search, setSearch] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  /** Lecture automatique seulement après un choix de l'utilisateur (pas au démarrage). */
  const [autoplay, setAutoplay] = useState(false)
  const [notice, setNotice] = useState<{
    text: string
    action?: { label: string; run: () => void }
    at: number
  } | null>(null)

  // Les messages passagers (« Ajoutée à la suite »…) disparaissent d'eux-mêmes, en s'animant
  const toast = useLingering(notice)
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  // La file a avancé (fin de vidéo, même en mini-lecteur) : le bloc retient la vidéo en cours
  const currentLink = queue.current?.link
  const currentTitle = queue.current?.title
  // Seul un changement de la file compte : « Lire maintenant » change la vidéo du bloc sans
  // passer par la file, et l'ancienne vidéo de la file ne doit pas la remplacer de nouveau
  const lastLink = useRef(currentLink)
  useEffect(() => {
    if (currentLink === lastLink.current) return
    lastLink.current = currentLink
    if (currentLink && currentLink !== config.link) {
      setConfig({ link: currentLink, title: currentTitle })
    }
  }, [currentLink, currentTitle, config.link, setConfig])

  // « Revenir au bloc » depuis le mini-lecteur : la vidéo s'affiche de nouveau ici
  useMediaReveal(instanceId, () => {
    setSearch(null)
    setConfig({ watching: true })
  })

  // Largeur du bloc : file « À suivre » à côté du lecteur, ou dessous
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= WIDE_WIDTH))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const target = config.link ? parseMediaLink(config.link, 'youtube') : null
  const watching = !!target && config.watching !== false

  const playNow = (link: string, title: string): void => {
    setAutoplay(true)
    setSearch(null)
    setConfig({ link, title, watching: true })
  }

  /** Ferme la vidéo (et sa file) : retour à l'accueil. */
  const closeVideo = (): void => {
    queue.clear()
    closeMediaView(instanceId)
    setConfig({ link: '', title: '', watching: false })
  }

  /** Accueil ou playlists : la vidéo continue en mini-lecteur si elle joue. */
  const openTab = (next: Tab): void => {
    setSearch(null)
    setConfig({ tab: next, watching: false })
  }

  const enqueue = (video: YouTubeVideo): void => {
    // Rien en lecture : la vidéo démarre tout de suite
    if (!target) return playNow(watchLink(video), video.title)
    const position = queue.queue.length
    queue.enqueue(toQueueItem(video))
    setNotice({
      text: t('queued', { title: video.title }),
      action: {
        label: t('playNow'),
        run: () => {
          queue.unqueue(position)
          playNow(watchLink(video), video.title)
        }
      },
      at: Date.now()
    })
  }

  const grid: GridHandlers = {
    // Clic sur une vidéo : lecture, ou ajout à la suite si une vidéo joue déjà
    onPick: (video) => (playing ? enqueue(video) : playNow(watchLink(video), video.title)),
    onPlayNow: (video) => playNow(watchLink(video), video.title),
    onEnqueue: enqueue
  }

  const submitSearch = (event: React.FormEvent): void => {
    event.preventDefault()
    const text = searchInput.trim()
    if (!text) return
    // Un lien YouTube collé dans la recherche : il est lu directement
    if (/youtu/i.test(text) && parseMediaLink(text, 'youtube')) {
      setSearchInput('')
      return playNow(text, 'YouTube')
    }
    setSearch(text)
    setConfig({ watching: false })
  }

  /** Menu du compte (photo en haut à droite) : changer de compte, en ajouter un. */
  const accountMenu = openContextMenu(() => [
    ...accounts.map((item) => ({
      label: item.email ? `${item.name || item.email} · ${item.email}` : item.name,
      icon: item.id === account?.id ? Check : undefined,
      onSelect: () => setConfig({ account: item.id })
    })),
    'separator' as const,
    { label: t('account.add'), icon: UserPlus, onSelect: openMediaSettings },
    { label: t('account.manage'), icon: Settings, onSelect: openMediaSettings }
  ])

  return (
    <div ref={root} className={styles.widget}>
      <header className={styles.header}>
        <SegmentedControl
          value={watching || search !== null ? ('none' as Tab) : tab}
          aria-label="YouTube"
          options={[
            { value: 'home', label: wide ? t('tabs.home') : '', icon: House },
            { value: 'playlists', label: wide ? t('tabs.playlists') : '', icon: ListVideo }
          ]}
          onChange={openTab}
        />
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
            <SquarePlay size={14} aria-hidden />
            <span>{config.title || t('resume')}</span>
          </button>
        )}
        <form className={styles.search} role="search" onSubmit={submitSearch}>
          <input
            value={searchInput}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
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
        {watching && queue.queue.length > 0 && config.queueHidden && (
          <button
            type="button"
            className={styles.queueToggle}
            title={t('queue.show')}
            aria-label={t('queue.show')}
            onClick={() => setConfig({ queueHidden: false })}
          >
            <ListVideo size={15} aria-hidden />
            {queue.queue.length}
          </button>
        )}
        {watching && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('closeVideo')}
            aria-label={t('closeVideo')}
            onClick={closeVideo}
          >
            <X size={16} aria-hidden />
          </button>
        )}
        {account ? (
          <button
            type="button"
            className={styles.avatarButton}
            title={account.email || account.name}
            aria-label={t('account.switch')}
            onClick={accountMenu}
          >
            <Avatar account={account} />
          </button>
        ) : (
          // Retour à l'accueil, où se trouve la connexion
          <button
            type="button"
            className={styles.signIn}
            title={t('signInHint')}
            onClick={() => openTab('home')}
          >
            <LogIn size={14} aria-hidden />
            {t('signIn')}
          </button>
        )}
      </header>

      {toast.shown && (
        <p className={styles.toast} data-closing={toast.closing || undefined}>
          <span>{toast.shown.text}</span>
          {toast.shown.action && (
            <button
              type="button"
              className={styles.textButton}
              disabled={toast.closing}
              onClick={() => {
                toast.shown?.action?.run()
                setNotice(null)
              }}
            >
              {toast.shown.action.label}
            </button>
          )}
        </p>
      )}

      <div className={styles.content}>
        {watching && target ? (
          <div className={styles.watch} data-wide={wide}>
            <div className={styles.player}>
              <MediaView
                id={instanceId}
                src={playerUrl(target, autoplay)}
                title={config.title ?? 'YouTube'}
                referrer={MEDIA_REFERRER}
                link={config.link}
              />
            </div>
            {queue.queue.length > 0 && !config.queueHidden && (
              <QueuePanel
                current={queue.current?.title ?? config.title ?? null}
                queue={queue.queue}
                onNext={() => queue.next()}
                onRemove={queue.unqueue}
                onClear={queue.clear}
                onCollapse={() => setConfig({ queueHidden: true })}
                side={wide}
              />
            )}
          </div>
        ) : search !== null ? (
          <AccountGate account={account}>
            <SearchResults
              key={`${account?.id ?? ''}:${search}`}
              account={account?.id ?? ''}
              query={search}
              grid={grid}
              onBack={() => setSearch(null)}
            />
          </AccountGate>
        ) : tab === 'playlists' ? (
          <AccountGate account={account}>
            <PlaylistBrowser account={account?.id ?? ''} grid={grid} onPlayAll={playNow} />
          </AccountGate>
        ) : account ? (
          <AccountGate account={account}>
            <Home account={account.id} grid={grid} />
          </AccountGate>
        ) : (
          <Welcome onPlay={playNow} />
        )}
      </div>
    </div>
  )
}

/** Photo du compte, ou son initiale. */
function Avatar({ account }: { account: Account }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  if (account.avatar && !failed) {
    return (
      <img
        className={styles.avatar}
        src={account.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span className={styles.avatar} data-letter>
      {(account.name || account.email || '?').charAt(0).toUpperCase()}
    </span>
  )
}

/** Pas de compte : se connecter, ou coller un lien. */
function Welcome({ onPlay }: { onPlay: (link: string, title: string) => void }): React.JSX.Element {
  const t = usePluginTranslation()
  const [input, setInput] = useState('')
  const [invalid, setInvalid] = useState(false)
  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    if (!parseMediaLink(input, 'youtube')) return setInvalid(true)
    onPlay(input.trim(), 'YouTube')
  }
  return (
    <AccountRequired service="youtube">
      <p className={styles.or}>{t('orPasteLink')}</p>
      <form className={styles.linkRow} onSubmit={submit}>
        <input
          className={styles.input}
          value={input}
          placeholder={t('linkPlaceholder')}
          data-invalid={invalid}
          spellCheck={false}
          onChange={(event) => {
            setInput(event.target.value)
            setInvalid(false)
          }}
        />
        <Button type="submit" icon={Play} disabled={!input.trim()}>
          {t('play')}
        </Button>
      </form>
      {invalid && <p className={styles.error}>{t('invalidLink')}</p>}
    </AccountRequired>
  )
}

/** Compte non connecté (ou connexion à refaire) : message et accès à la connexion. */
function AccountGate({
  account,
  children
}: {
  account: Account | null
  children: React.ReactNode
}): React.JSX.Element {
  if (account && !needsReconnect(account.error)) return <>{children}</>
  return (
    <AccountRequired
      service="youtube"
      error={account?.error ?? undefined}
      account={account?.email || account?.name}
    />
  )
}

/** Chargement d'une liste avec erreur et nouvel essai. */
function useLoad<T>(
  load: () => Promise<T>,
  deps: unknown[]
): {
  data: T | null
  error: string | null
  reload: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    load().then(
      (result) => {
        if (!active) return
        setData(result)
        setError(null)
      },
      (failure) => active && setError(mailErrorMessage(failure))
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dépendances données par l'appelant
  }, [...deps, attempt])
  return { data, error, reload: () => setAttempt((value) => value + 1) }
}

/** Accueil : dernières vidéos des chaînes abonnées. */
function Home({ account, grid }: { account: string; grid: GridHandlers }): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useMedia()
  const [refresh, setRefresh] = useState(0)
  const { data, error, reload } = useLoad(
    () => media.youtubeFeed(account, refresh > 0),
    [media, account, refresh]
  )
  return (
    <VideoGrid
      videos={data}
      error={error}
      onRetry={reload}
      {...grid}
      emptyText={t('noVideos')}
      toolbar={
        <>
          <span className={styles.toolbarTitle}>{t('homeTitle')}</span>
          <button
            type="button"
            className={styles.iconButton}
            title={t('refresh')}
            aria-label={t('refresh')}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={15} aria-hidden />
          </button>
        </>
      }
    />
  )
}

function SearchResults({
  account,
  query,
  grid,
  onBack
}: {
  account: string
  query: string
  grid: GridHandlers
  onBack: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useMedia()
  const { data, error, reload } = useLoad(
    () => media.youtubeSearch(account, query),
    [media, account, query]
  )
  const [more, setMore] = useState<{ videos: YouTubeVideo[]; next: string | null } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const videos = data ? [...data.videos, ...(more?.videos ?? [])] : null
  const next = more ? more.next : (data?.next ?? null)

  const loadMore = async (): Promise<void> => {
    if (!next) return
    setLoadingMore(true)
    try {
      const page = await media.youtubeSearch(account, query, next)
      setMore((previous) => ({
        videos: [...(previous?.videos ?? []), ...page.videos],
        next: page.next
      }))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <VideoGrid
      videos={videos}
      error={error}
      onRetry={reload}
      {...grid}
      emptyText={t('noResults')}
      onMore={next ? () => void loadMore() : undefined}
      loadingMore={loadingMore}
      toolbar={
        <>
          <button type="button" className={styles.back} aria-label={t('backHome')} onClick={onBack}>
            <ArrowLeft size={15} aria-hidden />
          </button>
          <span className={styles.toolbarTitle}>{t('resultsFor', { query })}</span>
        </>
      }
    />
  )
}

const LIKED = 'liked'

function PlaylistBrowser({
  account,
  grid,
  onPlayAll
}: {
  account: string
  grid: GridHandlers
  onPlayAll: (link: string, title: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useMedia()
  const [open, setOpen] = useState<YouTubePlaylist | null>(null)
  const { data, error, reload } = useLoad(() => media.youtubePlaylists(account), [media, account])

  if (open) {
    return (
      <PlaylistVideos
        account={account}
        playlist={open}
        grid={grid}
        onBack={() => setOpen(null)}
        onPlayAll={onPlayAll}
      />
    )
  }
  if (error) {
    return (
      <div className={styles.state}>
        <p className={styles.error}>{error}</p>
        <Button onClick={reload}>{t('retry')}</Button>
      </div>
    )
  }
  const liked: YouTubePlaylist = { id: LIKED, title: t('liked'), thumbnail: '', count: -1 }
  return (
    <ul className={styles.list}>
      {[liked, ...(data ?? [])].map((playlist) => (
        <li key={playlist.id}>
          <button type="button" className={styles.row} onClick={() => setOpen(playlist)}>
            {playlist.thumbnail ? (
              <img className={styles.thumb} src={playlist.thumbnail} alt="" loading="lazy" />
            ) : (
              <span className={styles.thumbIcon}>
                <ListVideo size={20} aria-hidden />
              </span>
            )}
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{playlist.title}</span>
              {playlist.count >= 0 && (
                <span className={styles.rowMeta}>{t('videos', { count: playlist.count })}</span>
              )}
            </span>
          </button>
        </li>
      ))}
      {data && data.length === 0 && <li className={styles.note}>{t('noPlaylists')}</li>}
    </ul>
  )
}

function PlaylistVideos({
  account,
  playlist,
  grid,
  onBack,
  onPlayAll
}: {
  account: string
  playlist: YouTubePlaylist
  grid: GridHandlers
  onBack: () => void
  onPlayAll: (link: string, title: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useMedia()
  const { data, error, reload } = useLoad(
    () => media.youtubePlaylist(account, playlist.id),
    [media, account, playlist.id]
  )
  return (
    <VideoGrid
      videos={data}
      error={error}
      onRetry={reload}
      {...grid}
      emptyText={t('noVideos')}
      toolbar={
        <>
          <button type="button" className={styles.back} onClick={onBack}>
            <ArrowLeft size={15} aria-hidden />
            {t('back')}
          </button>
          <span className={styles.toolbarTitle}>{playlist.title}</span>
          {playlist.id !== LIKED && (
            <Button
              icon={Play}
              onClick={() =>
                onPlayAll(`https://www.youtube.com/playlist?list=${playlist.id}`, playlist.title)
              }
            >
              {t('playAll')}
            </Button>
          )}
        </>
      }
    />
  )
}
