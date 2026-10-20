import { useEffect, useState } from 'react'
import { AlertTriangle, Mail, PenSquare, RefreshCw, Settings } from 'lucide-react'
import {
  Button,
  mailErrorMessage,
  openMailSettings,
  Select,
  useMail,
  useMailAccounts,
  useMailOpenRequest,
  usePluginTranslation,
  type MailAccount,
  type WidgetProps
} from '@tessera/plugin-sdk'
import { MailComposer, type ComposeRequest } from './MailComposer'
import { MailList } from './MailList'
import { MailReader } from './MailReader'
import { useInbox } from './useInbox'
import styles from './MailWidget.module.css'

interface MailConfig {
  /** Compte affiché ; absent : le premier compte. */
  accountId?: string
  remoteImages: boolean
}

type View =
  { kind: 'list' } | { kind: 'read'; id: string } | { kind: 'compose'; request: ComposeRequest }

/** Bloc Mails : boîte de réception d'un compte, lecture et écriture. */
export function MailWidget({ config, setConfig }: WidgetProps<MailConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const { accounts } = useMailAccounts()
  const account = accounts.find((item) => item.id === config.accountId) ?? accounts[0]

  if (!account) {
    return (
      <div className={styles.widget}>
        <div className={styles.state}>
          <Mail size={24} aria-hidden />
          <p className={styles.stateTitle}>{t('noAccount')}</p>
          <p>{t('noAccountText')}</p>
          <Button variant="primary" onClick={openMailSettings}>
            {t('addAccount')}
          </Button>
        </div>
      </div>
    )
  }
  return (
    <AccountInbox
      // Autre compte : la vue repart de la liste
      key={account.id}
      account={account}
      accounts={accounts}
      remoteImages={config.remoteImages}
      onAccountChange={(accountId) => setConfig({ accountId })}
    />
  )
}

function AccountInbox({
  account,
  accounts,
  remoteImages,
  onAccountChange
}: {
  account: MailAccount
  accounts: MailAccount[]
  remoteImages: boolean
  onAccountChange: (accountId: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const mail = useMail()
  const { states } = useMailAccounts()
  const state = states[account.id]
  const inbox = useInbox(account.id)
  const [view, setView] = useState<View>({ kind: 'list' })
  /** Message passager (« Mail envoyé »…) ; `at` relance le délai pour un même texte. */
  const [notice, setNoticeState] = useState<{ text: string; at: number } | null>(null)
  const setNotice = (text: string): void => setNoticeState({ text, at: Date.now() })
  const [refreshing, setRefreshing] = useState(false)

  // Clic sur la notification d'un mail de ce compte : il s'ouvre ici
  useMailOpenRequest(account.id, (messageId) => setView({ kind: 'read', id: messageId }))

  // Les messages passagers (« Mail envoyé »…) disparaissent d'eux-mêmes
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNoticeState(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const refresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await mail.checkNow(account.id)
      inbox.reload()
    } finally {
      setRefreshing(false)
    }
  }

  const reconnect = (): void => {
    if (account.provider === 'imap') openMailSettings()
    else
      void mail
        .reconnect(account.id)
        .then(inbox.reload, (failure) => setNotice(mailErrorMessage(failure)))
  }

  return (
    <div className={styles.widget}>
      <header className={styles.header}>
        {accounts.length > 1 ? (
          <Select
            value={account.id}
            aria-label={t('account')}
            options={accounts.map((item) => ({ value: item.id, label: item.name }))}
            onChange={onAccountChange}
          />
        ) : (
          <span className={styles.accountName} title={account.address}>
            {account.name}
          </span>
        )}
        {state && state.unread > 0 && (
          <span className={styles.badge}>{t('unread', { count: state.unread })}</span>
        )}
        <span className={styles.toolbarSpacer} />
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
        <button
          type="button"
          className={styles.iconButton}
          title={t('compose')}
          aria-label={t('compose')}
          onClick={() => setView({ kind: 'compose', request: { mode: 'new' } })}
        >
          <PenSquare size={15} aria-hidden />
        </button>
      </header>

      {state?.error && (
        <div className={styles.banner}>
          <AlertTriangle size={15} aria-hidden />
          <span>{mailErrorMessage(new Error(`mail-error:${state.error}`))}</span>
          {state.error === 'auth' && <Button onClick={reconnect}>{t('reconnect')}</Button>}
          {state.error === 'not-configured' && (
            <Button icon={Settings} onClick={openMailSettings}>
              {t('openSettings')}
            </Button>
          )}
        </div>
      )}
      {notice && <p className={styles.toast}>{notice.text}</p>}

      <div className={styles.content}>
        {view.kind === 'list' && (
          <MailList
            inbox={inbox}
            onOpen={(message) => setView({ kind: 'read', id: message.id })}
            onError={setNotice}
          />
        )}
        {view.kind === 'read' && (
          <MailReader
            key={view.id}
            accountId={account.id}
            id={view.id}
            remoteImages={remoteImages}
            onBack={() => setView({ kind: 'list' })}
            onAct={(action) => inbox.act(view.id, action)}
            onCompose={(mode, message) => setView({ kind: 'compose', request: { mode, message } })}
          />
        )}
        {view.kind === 'compose' && (
          <MailComposer
            account={account}
            request={view.request}
            onClose={(sent) => {
              setView({ kind: 'list' })
              if (sent) setNotice(t('composer.sent'))
            }}
          />
        )}
      </div>
    </div>
  )
}
