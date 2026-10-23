import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, Film, FolderOpen, Music, X } from 'lucide-react'
import {
  Button,
  closeMediaView,
  getMediaPosition,
  localMediaUrl,
  MediaView,
  pauseMedia,
  useLocalMedia,
  useMediaError,
  usePluginTranslation,
  type LocalMediaFile,
  type WidgetProps
} from '@tessera/plugin-sdk'
import { formatTime } from './time'
import styles from './VideoWidget.module.css'

interface VideoConfig {
  /** Fichier ouvert (identifiant donné par Tessera), absent : page des fichiers récents. */
  file?: string
  /** Titre affiché par le mini-lecteur. */
  title?: string
  /** Fichier que Tessera n'a pas pu lire (proposition d'ouverture dans VLC). */
  failed?: string
}

/** Reprise seulement après les premières secondes. */
const resumeAt = (file: LocalMediaFile): number => (file.position > 5 ? file.position : 0)

/**
 * Bloc « Vidéo locale » : une vidéo ou une musique du PC, choisie dans la fenêtre de Windows
 * ou déposée sur le bloc. La lecture reprend où elle s'était arrêtée, continue en mini-lecteur
 * en changeant de page, et peut passer dans VLC au même moment (formats non lus compris).
 */
export function VideoWidget({
  instanceId,
  config,
  setConfig
}: WidgetProps<VideoConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useLocalMedia()
  const [info, setInfo] = useState<LocalMediaFile | null>(null)
  /** Lecture automatique seulement après un choix de l'utilisateur (pas au démarrage). */
  const [autoplay, setAutoplay] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [vlc, setVlc] = useState<boolean | null>(null)

  useEffect(() => {
    void media.hasVlc().then(setVlc, () => setVlc(false))
  }, [media])

  // Fichier ouvert : nom, dossier, position de reprise
  useEffect(() => {
    if (!config.file) return
    let active = true
    void media.get(config.file).then((file) => active && setInfo(file))
    return () => {
      active = false
    }
  }, [media, config.file])

  // Messages passagers (« Ouvert dans VLC »…)
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  // Format non lu par Tessera : on propose VLC
  useMediaError(instanceId, () => {
    if (config.file) setConfig({ failed: config.file })
  })

  const current = info && info.id === config.file ? info : null
  const failed = !!config.file && config.failed === config.file

  const play = (file: LocalMediaFile): void => {
    if (file.missing) return setNotice({ text: t('missing'), error: true })
    setAutoplay(true)
    setInfo(file)
    setConfig({ file: file.id, title: file.name, failed: '' })
  }

  const pick = async (): Promise<void> => {
    try {
      const file = await media.open()
      if (file) play(file)
    } catch {
      setNotice({ text: t('unsupportedFile'), error: true })
    }
  }

  const close = (): void => {
    closeMediaView(instanceId)
    setInfo(null)
    setConfig({ file: '', title: '', failed: '' })
  }

  const openInVlc = async (): Promise<void> => {
    if (!config.file) return
    const position = failed ? 0 : getMediaPosition(instanceId)
    pauseMedia(instanceId)
    try {
      const player = await media.openExternally(config.file, position)
      setNotice({ text: player === 'vlc' ? t('openedInVlc') : t('openedDefault') })
    } catch {
      setNotice({ text: t('missing'), error: true })
    }
  }

  // Glisser-déposer d'un fichier du PC sur le bloc
  const dropHandlers = {
    onDragOver: (event: React.DragEvent): void => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setDragging(true)
    },
    onDragLeave: (event: React.DragEvent): void => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
    },
    onDrop: (event: React.DragEvent): void => {
      event.preventDefault()
      setDragging(false)
      const file = event.dataTransfer.files[0]
      if (!file) return
      media
        .addDropped(file)
        .then(play, () => setNotice({ text: t('unsupportedFile'), error: true }))
    }
  }

  const vlcLabel = vlc === false ? t('openDefault') : t('openInVlc')

  return (
    <div className={styles.widget} data-dragging={dragging} {...dropHandlers}>
      {config.file && (
        <header className={styles.header}>
          {current?.audio ? <Music size={15} aria-hidden /> : <Film size={15} aria-hidden />}
          <span className={styles.title} title={current?.name ?? config.title}>
            {current?.name ?? config.title}
          </span>
          <button
            type="button"
            className={styles.textButton}
            title={vlc === false ? t('openDefaultHint') : t('openInVlcHint')}
            onClick={() => void openInVlc()}
          >
            <ExternalLink size={14} aria-hidden />
            {vlcLabel}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('openOther')}
            aria-label={t('openOther')}
            onClick={() => void pick()}
          >
            <FolderOpen size={15} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('close')}
            aria-label={t('close')}
            onClick={close}
          >
            <X size={16} aria-hidden />
          </button>
        </header>
      )}

      {notice && (
        <p className={styles.notice} data-error={notice.error === true}>
          {notice.text}
        </p>
      )}

      <div className={styles.content}>
        {!config.file ? (
          <Home onPick={() => void pick()} onPlay={play} />
        ) : current?.missing ? (
          <div className={styles.state}>
            <AlertTriangle size={26} aria-hidden />
            <p>{t('missing')}</p>
            <Button icon={FolderOpen} onClick={() => void pick()}>
              {t('openOther')}
            </Button>
          </div>
        ) : failed ? (
          <div className={styles.state}>
            <AlertTriangle size={26} aria-hidden />
            <p>{t('unsupported')}</p>
            <Button variant="primary" icon={ExternalLink} onClick={() => void openInVlc()}>
              {vlcLabel}
            </Button>
            {vlc === false && <p className={styles.hint}>{t('installVlc')}</p>}
          </div>
        ) : current ? (
          <MediaView
            id={instanceId}
            src={localMediaUrl(current.id, { start: resumeAt(current), autoplay })}
            title={current.name}
          />
        ) : null}
      </div>

      {dragging && (
        <div className={styles.dropOverlay}>
          <Film size={28} aria-hidden />
          {t('dropHere')}
        </div>
      )}
    </div>
  )
}

/** Sans fichier ouvert : choisir un fichier, ou reprendre un fichier récent. */
function Home({
  onPick,
  onPlay
}: {
  onPick: () => void
  onPlay: (file: LocalMediaFile) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const media = useLocalMedia()
  const [files, setFiles] = useState<LocalMediaFile[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    void media.recent().then((list) => active && setFiles(list))
    return () => {
      active = false
    }
  }, [media, version])

  const forget = (file: LocalMediaFile): void => {
    void media.forget(file.id).then(() => setVersion((value) => value + 1))
  }

  return (
    <div className={styles.home}>
      <div className={styles.drop}>
        <Film size={28} aria-hidden />
        <p>{t('intro')}</p>
        <Button variant="primary" icon={FolderOpen} onClick={onPick}>
          {t('pick')}
        </Button>
        <p className={styles.hint}>{t('orDrop')}</p>
      </div>
      {files && files.length > 0 && (
        <section className={styles.recent} aria-label={t('recent')}>
          <h3 className={styles.recentTitle}>{t('recent')}</h3>
          <ul className={styles.list}>
            {files.map((file) => (
              <li key={file.id} className={styles.item} data-missing={file.missing}>
                <button
                  type="button"
                  className={styles.row}
                  title={`${file.folder}\\${file.name}`}
                  onClick={() => onPlay(file)}
                >
                  {file.audio ? <Music size={18} aria-hidden /> : <Film size={18} aria-hidden />}
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{file.name}</span>
                    <span className={styles.rowMeta}>
                      {file.missing
                        ? t('missingShort')
                        : resumeAt(file) && file.duration
                          ? t('resumeAt', {
                              time: formatTime(file.position),
                              total: formatTime(file.duration)
                            })
                          : file.folder}
                    </span>
                    {!file.missing && resumeAt(file) > 0 && file.duration > 0 && (
                      <span className={styles.progress}>
                        <span style={{ width: `${(file.position / file.duration) * 100}%` }} />
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('forget')}
                  aria-label={t('forget')}
                  onClick={() => forget(file)}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
