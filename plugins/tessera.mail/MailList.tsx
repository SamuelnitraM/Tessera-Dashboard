import { useState } from 'react'
import { Archive, LoaderCircle, Mail, MailOpen, Paperclip, Star, Trash2, X } from 'lucide-react'
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
  /** Envoyés, brouillons : les destinataires remplacent l'expéditeur. */
  showRecipients: boolean
  /** Texte d'une liste vide (dossier vide, aucun non lu, aucun résultat). */
  emptyText: string
  onOpen: (message: MailSummary) => void
  /** Erreur d'une action (affichée par le bloc). */
  onError: (message: string) => void
  /** Boîte commune : nom du compte de chaque mail. */
  accountOf?: (message: MailSummary) => string | null
}

/**
 * Boîte de réception : expéditeur, objet, aperçu, date ; actions au survol et au clic droit.
 * Les cases à cocher choisissent plusieurs mails (Maj + clic : tous ceux entre deux), puis la
 * barre de sélection agit sur tous d'un coup.
 */
export function MailList({
  inbox,
  showRecipients,
  emptyText,
  onOpen,
  onError,
  accountOf
}: MailListProps): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  /** Dernier mail coché : Maj + clic coche tous ceux entre les deux. */
  const [anchor, setAnchor] = useState<string | null>(null)

  const act = (message: MailSummary, action: MailAction): void =>
    void inbox.act(message.id, action).catch((failure) => onError(mailErrorMessage(failure)))

  // Seuls les mails encore dans la liste comptent (dossier changé, mail déplacé…)
  const chosen = inbox.messages.filter((message) => selected.has(message.id))
  const allChosen = chosen.length === inbox.messages.length

  const toggle = (message: MailSummary, range: boolean): void => {
    const ids = inbox.messages.map((entry) => entry.id)
    const from = anchor ? ids.indexOf(anchor) : -1
    const to = ids.indexOf(message.id)
    const span =
      range && from >= 0 ? ids.slice(Math.min(from, to), Math.max(from, to) + 1) : [message.id]
    const on = !selected.has(message.id)
    setSelected((previous) => {
      const next = new Set(previous)
      for (const id of span) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
    setAnchor(message.id)
  }

  const actOnSelection = (action: MailAction): void => {
    const ids = chosen.map((message) => message.id)
    setSelected(new Set())
    void inbox.actMany(ids, action).catch((failure) => onError(mailErrorMessage(failure)))
  }
  /** Lus si au moins un mail choisi est non lu ; sinon, non lus. */
  const readAction: MailAction = chosen.some((message) => message.unread) ? 'read' : 'unread'

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
        <p>{emptyText}</p>
      </div>
    )
  }

  return (
    <>
      {chosen.length > 0 && (
        <div className={styles.selectionBar}>
          <input
            type="checkbox"
            className={styles.check}
            checked={allChosen}
            ref={(box) => {
              if (box) box.indeterminate = !allChosen
            }}
            aria-label={t('select.all')}
            title={t('select.all')}
            onChange={() =>
              setSelected(
                allChosen ? new Set() : new Set(inbox.messages.map((message) => message.id))
              )
            }
          />
          <span className={styles.selectionCount}>
            {t('select.count', { count: chosen.length })}
          </span>
          <button
            type="button"
            className={styles.iconButton}
            title={t(`actions.${readAction}`)}
            aria-label={t(`actions.${readAction}`)}
            onClick={() => actOnSelection(readAction)}
          >
            {readAction === 'read' ? (
              <MailOpen size={15} aria-hidden />
            ) : (
              <Mail size={15} aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('actions.archive')}
            aria-label={t('actions.archive')}
            onClick={() => actOnSelection('archive')}
          >
            <Archive size={15} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            data-danger
            title={t('actions.trash')}
            aria-label={t('actions.trash')}
            onClick={() => actOnSelection('trash')}
          >
            <Trash2 size={15} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('select.clear')}
            aria-label={t('select.clear')}
            onClick={() => setSelected(new Set())}
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      )}
      <ul
        className={styles.list}
        data-selecting={chosen.length > 0}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && chosen.length > 0) setSelected(new Set())
        }}
      >
        {inbox.messages.map((message) => (
          <li
            key={message.id}
            className={styles.item}
            data-unread={message.unread}
            data-selected={selected.has(message.id)}
            onContextMenu={openContextMenu([
              {
                label: message.unread ? t('actions.read') : t('actions.unread'),
                icon: message.unread ? MailOpen : Mail,
                onSelect: () => act(message, message.unread ? 'read' : 'unread')
              },
              {
                label: message.starred ? t('actions.unstar') : t('actions.star'),
                icon: Star,
                onSelect: () => act(message, message.starred ? 'unstar' : 'star')
              },
              {
                label: t('actions.archive'),
                icon: Archive,
                onSelect: () => act(message, 'archive')
              },
              {
                label: t('actions.trash'),
                icon: Trash2,
                danger: true,
                onSelect: () => act(message, 'trash')
              }
            ])}
          >
            <input
              type="checkbox"
              className={styles.check}
              checked={selected.has(message.id)}
              aria-label={t('select.one', { subject: message.subject || t('noSubject') })}
              onChange={(event) =>
                toggle(message, (event.nativeEvent as MouseEvent).shiftKey === true)
              }
            />
            <button
              type="button"
              className={styles.star}
              data-on={message.starred}
              title={message.starred ? t('actions.unstar') : t('actions.star')}
              aria-label={message.starred ? t('actions.unstar') : t('actions.star')}
              aria-pressed={message.starred}
              onClick={() => act(message, message.starred ? 'unstar' : 'star')}
            >
              <Star size={15} aria-hidden />
            </button>
            <button type="button" className={styles.itemButton} onClick={() => onOpen(message)}>
              <span className={styles.itemTop}>
                <span className={styles.itemFrom}>
                  {showRecipients
                    ? `${t('reader.to')} : ${message.to.map(senderName).join(', ') || '—'}`
                    : senderName(message.from) || t('unknownSender')}
                </span>
                {accountOf?.(message) && (
                  <span className={styles.itemAccount}>{accountOf(message)}</span>
                )}
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
                {message.unread ? (
                  <MailOpen size={15} aria-hidden />
                ) : (
                  <Mail size={15} aria-hidden />
                )}
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
    </>
  )
}
