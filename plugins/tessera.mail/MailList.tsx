import { Archive, LoaderCircle, Mail, MailOpen, Paperclip, Trash2 } from 'lucide-react'
import {
  Button,
  mailErrorMessage,
  openContextMenu,
  useLanguage,
  usePluginTranslation,
  type MailAction,
  type MailSummary
} from '@tessera/plugin-sdk'
import { senderName, shortDate } from './format'
import type { Inbox } from './useInbox'
import styles from './MailWidget.module.css'

interface MailListProps {
  inbox: Inbox
  onOpen: (message: MailSummary) => void
  /** Erreur d'une action (affichée par le bloc). */
  onError: (message: string) => void
}

/** Boîte de réception : expéditeur, objet, aperçu, date ; actions au survol et au clic droit. */
export function MailList({ inbox, onOpen, onError }: MailListProps): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()

  const act = (message: MailSummary, action: MailAction): void =>
    void inbox.act(message.id, action).catch((failure) => onError(mailErrorMessage(failure)))

  if (inbox.error && inbox.messages.length === 0) {
    return (
      <div className={styles.state}>
        <p className={styles.error}>{inbox.error}</p>
        <Button onClick={inbox.reload}>{t('retry')}</Button>
      </div>
    )
  }
  if (inbox.loading && inbox.messages.length === 0) {
    return (
      <div className={styles.state}>
        <LoaderCircle className={styles.spin} size={20} aria-hidden />
      </div>
    )
  }
  if (inbox.messages.length === 0) {
    return (
      <div className={styles.state}>
        <MailOpen size={22} aria-hidden />
        <p>{t('empty')}</p>
      </div>
    )
  }

  return (
    <ul className={styles.list}>
      {inbox.messages.map((message) => (
        <li
          key={message.id}
          className={styles.item}
          data-unread={message.unread}
          onContextMenu={openContextMenu([
            {
              label: message.unread ? t('actions.read') : t('actions.unread'),
              icon: message.unread ? MailOpen : Mail,
              onSelect: () => act(message, message.unread ? 'read' : 'unread')
            },
            { label: t('actions.archive'), icon: Archive, onSelect: () => act(message, 'archive') },
            {
              label: t('actions.trash'),
              icon: Trash2,
              danger: true,
              onSelect: () => act(message, 'trash')
            }
          ])}
        >
          <button type="button" className={styles.itemButton} onClick={() => onOpen(message)}>
            <span className={styles.itemTop}>
              <span className={styles.itemFrom}>
                {senderName(message.from) || t('unknownSender')}
              </span>
              {message.hasAttachments && (
                <Paperclip size={12} className={styles.itemClip} aria-label={t('attachment')} />
              )}
              <span className={styles.itemDate}>{shortDate(message.date, language)}</span>
            </span>
            <span className={styles.itemSubject}>{message.subject || t('noSubject')}</span>
            {message.snippet && <span className={styles.itemSnippet}>{message.snippet}</span>}
          </button>
          <span className={styles.itemActions}>
            <button
              type="button"
              className={styles.iconButton}
              title={message.unread ? t('actions.read') : t('actions.unread')}
              aria-label={message.unread ? t('actions.read') : t('actions.unread')}
              onClick={() => act(message, message.unread ? 'read' : 'unread')}
            >
              {message.unread ? <MailOpen size={15} aria-hidden /> : <Mail size={15} aria-hidden />}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              title={t('actions.archive')}
              aria-label={t('actions.archive')}
              onClick={() => act(message, 'archive')}
            >
              <Archive size={15} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              title={t('actions.trash')}
              aria-label={t('actions.trash')}
              onClick={() => act(message, 'trash')}
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </span>
        </li>
      ))}
      {inbox.hasMore && (
        <li className={styles.more}>
          <Button onClick={inbox.loadMore} disabled={inbox.loading}>
            {inbox.loading && <LoaderCircle className={styles.spin} size={15} aria-hidden />}
            {t('loadMore')}
          </Button>
        </li>
      )}
    </ul>
  )
}
