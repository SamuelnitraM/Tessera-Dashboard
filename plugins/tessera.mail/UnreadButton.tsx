import { Mail, RefreshCw } from 'lucide-react'
import {
  HeaderButtonText,
  HeaderPanelTitle,
  HeaderWidgetButton,
  INBOX,
  openMail,
  openMailSettings,
  useLanguage,
  useMail,
  useMailAccounts,
  usePluginTranslation,
  type MailQuery
} from '@tessera/plugin-sdk'
import { senderName, shortDate } from './format'
import { splitMailId, useInbox } from './useInbox'
import styles from './UnreadButton.module.css'

/** Mails non lus affichés dans le panneau (les plus récents). */
const SHOWN = 8
const UNREAD: MailQuery = { folder: INBOX, filter: 'unread', search: '' }

/**
 * Barre des pages : nombre de mails non lus de tous les comptes ; le panneau montre les plus
 * récents, et un clic ouvre le mail dans un bloc Mails.
 */
export function UnreadButton(): React.JSX.Element {
  const t = usePluginTranslation()
  const { accounts, states } = useMailAccounts()
  const unread = accounts.reduce((sum, account) => sum + (states[account.id]?.unread ?? 0), 0)
  return (
    <HeaderWidgetButton
      label={unread > 0 ? t('header.label', { count: unread }) : t('header.name')}
      button={
        <>
          <Mail size={16} aria-hidden />
          {unread > 0 && <HeaderButtonText>{unread}</HeaderButtonText>}
        </>
      }
    >
      {(close) => <UnreadPanel close={close} />}
    </HeaderWidgetButton>
  )
}

function UnreadPanel({ close }: { close: () => void }): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const mail = useMail()
  const { accounts } = useMailAccounts()

  if (accounts.length === 0) {
    return (
      <div className={styles.panel}>
        <HeaderPanelTitle title={t('header.name')} />
        <p className={styles.muted}>{t('header.noAccount')}</p>
        <button
          type="button"
          className={styles.link}
          onClick={() => {
            close()
            openMailSettings()
          }}
        >
          {t('header.addAccount')}
        </button>
      </div>
    )
  }
  return (
    <UnreadList
      accountIds={accounts.map((account) => account.id)}
      accountName={(id) => accounts.find((account) => account.id === id)?.name ?? ''}
      language={language}
      onRefresh={() => void Promise.all(accounts.map((account) => mail.checkNow(account.id)))}
      onOpen={(accountId, id) => {
        close()
        openMail(accountId, id)
      }}
    />
  )
}

function UnreadList({
  accountIds,
  accountName,
  language,
  onRefresh,
  onOpen
}: {
  accountIds: string[]
  accountName: (accountId: string) => string
  language: ReturnType<typeof useLanguage>
  onRefresh: () => void
  onOpen: (accountId: string, messageId: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const inbox = useInbox(accountIds, UNREAD, false)
  const messages = inbox.messages.slice(0, SHOWN)
  return (
    <div className={styles.panel}>
      <HeaderPanelTitle title={t('header.name')}>
        <button
          type="button"
          className={styles.iconButton}
          title={t('refresh')}
          aria-label={t('refresh')}
          onClick={() => {
            onRefresh()
            inbox.reload()
          }}
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </HeaderPanelTitle>
      {inbox.loading && messages.length === 0 ? (
        <p className={styles.muted}>{t('header.loading')}</p>
      ) : inbox.error && messages.length === 0 ? (
        <p className={styles.error}>{inbox.error}</p>
      ) : messages.length === 0 ? (
        <p className={styles.muted}>{t('header.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {messages.map((message) => {
            const { accountId, id } = splitMailId(message.id, accountIds[0])
            return (
              <li key={message.id}>
                <button type="button" className={styles.item} onClick={() => onOpen(accountId, id)}>
                  <span className={styles.top}>
                    <strong>{senderName(message.from) || t('unknownSender')}</strong>
                    <span className={styles.muted}>{shortDate(message.date, language)}</span>
                  </span>
                  <span className={styles.subject}>{message.subject || t('noSubject')}</span>
                  {accountIds.length > 1 && (
                    <span className={styles.account}>{accountName(accountId)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
