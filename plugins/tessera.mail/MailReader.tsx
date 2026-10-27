import { useEffect, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Forward,
  ImageOff,
  LoaderCircle,
  MailOpen,
  Paperclip,
  Reply,
  ReplyAll,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import {
  Button,
  mailErrorMessage,
  useLanguage,
  useMail,
  usePluginTranslation,
  type MailAction,
  type MailMessage
} from '@tessera/plugin-sdk'
import { addressList, formatSize, longDate, senderName } from './format'
import { MailBody } from './MailBody'
import { hasRemoteContent } from './sanitize'
import styles from './MailWidget.module.css'

export type ComposeMode = 'reply' | 'replyAll' | 'forward'

interface MailReaderProps {
  accountId: string
  id: string
  /** Réglage du bloc : images distantes toujours affichées. */
  remoteImages: boolean
  onBack: () => void
  onAct: (action: MailAction) => Promise<void>
  onCompose: (mode: ComposeMode, message: MailMessage) => void
}

/** Lecture d'un mail : en-têtes, actions, pièces jointes et contenu. */
export function MailReader({
  accountId,
  id,
  remoteImages,
  onBack,
  onAct,
  onCompose
}: MailReaderProps): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const mail = useMail()
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showImages, setShowImages] = useState(remoteImages)
  const [notice, setNotice] = useState<string | null>(null)
  // En-tête réduit (objet et expéditeur sur une ligne) dès que l'on fait défiler le mail
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // Un lecteur par mail (clé) : rien à remettre à zéro ici
    let cancelled = false
    mail.get(accountId, id).then(
      (loaded) => {
        if (cancelled) return
        setMessage(loaded)
        // Ouvert = lu
        if (loaded.unread) void onAct('read').catch(() => {})
      },
      (failure) => !cancelled && setError(mailErrorMessage(failure))
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargé une fois par mail
  }, [mail, accountId, id])

  const act = async (action: MailAction): Promise<void> => {
    try {
      await onAct(action)
      if (action === 'archive' || action === 'trash' || action === 'unread') onBack()
    } catch (failure) {
      setNotice(mailErrorMessage(failure))
    }
  }

  const save = async (index: number): Promise<void> => {
    try {
      if (await mail.saveAttachment(accountId, id, index)) setNotice(t('reader.saved'))
    } catch (failure) {
      setNotice(mailErrorMessage(failure))
    }
  }

  const tool = (icon: LucideIcon, label: string, onClick: () => void, disabled = false) => {
    const Icon = icon
    return (
      <button
        type="button"
        className={styles.iconButton}
        title={label}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        <Icon size={16} aria-hidden />
      </button>
    )
  }

  return (
    <div className={styles.reader}>
      <div className={styles.toolbar}>
        {tool(ArrowLeft, t('actions.back'), onBack)}
        <span className={styles.toolbarSpacer} />
        {tool(Reply, t('actions.reply'), () => message && onCompose('reply', message), !message)}
        {tool(
          ReplyAll,
          t('actions.replyAll'),
          () => message && onCompose('replyAll', message),
          !message
        )}
        {tool(
          Forward,
          t('actions.forward'),
          () => message && onCompose('forward', message),
          !message
        )}
        {tool(MailOpen, t('actions.unread'), () => void act('unread'), !message)}
        {tool(Archive, t('actions.archive'), () => void act('archive'))}
        {tool(Trash2, t('actions.trash'), () => void act('trash'))}
      </div>

      {error && (
        <div className={styles.state}>
          <p className={styles.error}>{error}</p>
          <Button onClick={onBack}>{t('actions.back')}</Button>
        </div>
      )}
      {!error && !message && (
        <div className={styles.state}>
          <LoaderCircle className={styles.spin} size={20} aria-hidden />
        </div>
      )}

      {message && (
        <>
          <header
            className={styles.readerHeader}
            data-collapsed={collapsed}
            onClick={collapsed ? () => setCollapsed(false) : undefined}
          >
            <h3 className={styles.readerSubject}>{message.subject || t('noSubject')}</h3>
            <p className={styles.readerFrom}>
              <strong>{senderName(message.from) || t('unknownSender')}</strong>
              {message.from.name && <span> &lt;{message.from.address}&gt;</span>}
            </p>
            <p className={styles.readerMeta}>
              {t('reader.to')} : {addressList(message.to)}
              {message.cc.length > 0 && (
                <>
                  {' '}
                  · {t('reader.cc')} : {addressList(message.cc)}
                </>
              )}
            </p>
            <p className={styles.readerMeta}>{longDate(message.date, language)}</p>
            {message.attachments.length > 0 && (
              <div className={styles.attachments}>
                {message.attachments.map((attachment) => (
                  <button
                    key={attachment.index}
                    type="button"
                    className={styles.attachment}
                    title={t('reader.save', { name: attachment.filename })}
                    onClick={() => void save(attachment.index)}
                  >
                    <Paperclip size={13} aria-hidden />
                    <span className={styles.attachmentName}>{attachment.filename}</span>
                    <span className={styles.attachmentSize}>
                      {formatSize(attachment.size, language)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!showImages && hasRemoteContent(message.html) && (
              <p className={styles.remoteNotice}>
                <ImageOff size={14} aria-hidden />
                {t('reader.remoteBlocked')}
                <button type="button" className={styles.link} onClick={() => setShowImages(true)}>
                  {t('reader.showImages')}
                </button>
              </p>
            )}
            {notice && <p className={styles.notice}>{notice}</p>}
          </header>
          <MailBody
            className={styles.body}
            html={message.html}
            text={message.text}
            remote={showImages}
            onLink={(url) => void mail.openLink(url)}
            onScroll={(top) => {
              // Écart entre les deux seuils : l'en-tête ne bascule pas sans cesse
              if (top > 48) setCollapsed(true)
              else if (top === 0) setCollapsed(false)
            }}
          />
        </>
      )}
    </div>
  )
}
