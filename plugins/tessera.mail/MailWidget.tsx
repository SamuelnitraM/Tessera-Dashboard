import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Menu, PenSquare, RefreshCw, Search, X } from 'lucide-react'
import {
  BlockSettingsButton,
  AccountRequired,
  Button,
  ConfirmDialog,
  INBOX,
  mailErrorMessage,
  needsReconnect,
  openMailSettings,
  Select,
  useMail,
  useMailAccounts,
  useLingering,
  useMailOpenRequest,
  usePluginTranslation,
  type MailAccount,
  type MailFilter,
  type MailQuery,
  type WidgetProps
} from '@tessera/plugin-sdk'
import { MailFolders } from './MailFolders'
import { useFolderName, useFolders } from './useFolders'
import { MailComposer, type ComposeRequest } from './MailComposer'
import { MailList } from './MailList'
import { MailReader } from './MailReader'
import { joinMailId, splitMailId, useInbox } from './useInbox'
import styles from './MailWidget.module.css'

interface MailConfig {
  /** Compte affiché (`all` : boîte commune à tous les comptes) ; absent : le premier compte. */
  accountId?: string
  remoteImages: boolean
  /** Dossier ou libellé affiché. */
  folder?: string
  filter?: MailFilter
  /** Menu des dossiers ouvert (bloc assez large). */
  sidebar?: boolean
}

/** En dessous de cette largeur, le menu des dossiers passe par-dessus la liste. */
const NARROW_WIDTH = 620

/** Choix « Tous les comptes » : boîte de réception commune. */
const ALL_ACCOUNTS = 'all'

type View =
  | { kind: 'list' }
  | { kind: 'read'; id: string }
  /** `accountId` : compte d'envoi (réponse : celui du mail d'origine). */
  | { kind: 'compose'; request: ComposeRequest; accountId?: string }

/** Bloc Mails : boîte de réception d'un compte (ou de tous), lecture et écriture. */
export function MailWidget({ config, setConfig }: WidgetProps<MailConfig>): React.JSX.Element {
  const { accounts } = useMailAccounts()
  const unified = config.accountId === ALL_ACCOUNTS && accounts.length > 1
  const account = accounts.find((item) => item.id === config.accountId) ?? accounts[0]

  if (!account) {
    return (
      <div className={styles.widget}>
        <AccountRequired service="gmail" />
      </div>
    )
  }
  return (
    <AccountInbox
      // Autre compte : la vue repart de la liste
      key={unified ? ALL_ACCOUNTS : account.id}
      account={account}
      scope={unified ? accounts : [account]}
      accounts={accounts}
      remoteImages={config.remoteImages}
      config={config}
      setConfig={setConfig}
      onAccountChange={(accountId) => setConfig({ accountId, folder: INBOX })}
    />
  )
}

function AccountInbox({
  account,
  scope,
  accounts,
  remoteImages,
  config,
  setConfig,
  onAccountChange
}: {
  /** Compte affiché (boîte commune : le premier, pour écrire un mail). */
  account: MailAccount
  /** Comptes dont les mails sont listés : un seul, ou tous (boîte commune). */
  scope: MailAccount[]
  accounts: MailAccount[]
  remoteImages: boolean
  config: MailConfig
  setConfig: (patch: Partial<MailConfig>) => void
  onAccountChange: (accountId: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const mail = useMail()
  const { states } = useMailAccounts()
  // Boîte commune : les boîtes de réception seulement, chaque mail avec le nom de son compte
  const unified = scope.length > 1
  const scopeIds = scope.map((item) => item.id)
  const accountOf = (id: string): MailAccount =>
    scope.find((item) => item.id === splitMailId(id, account.id).accountId) ?? account
  // Compte en erreur (boîte commune : le premier)
  const failing = scope.find((item) => states[item.id]?.error)
  const state = failing ? states[failing.id] : undefined
  const folders = useFolders(account.id)
  const folderName = useFolderName()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const query: MailQuery = {
    folder: unified ? INBOX : (config.folder ?? INBOX),
    filter: config.filter ?? 'all',
    search
  }
  const folder = folders?.find(
    (item) => item.id === query.folder || (query.folder === INBOX && item.kind === 'inbox')
  )
  const inbox = useInbox(scopeIds, query, !unified && folder?.kind === 'starred')

  // Largeur du bloc : menu des dossiers à côté de la liste, ou par-dessus (bloc étroit)
  const root = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setNarrow(entry.contentRect.width < NARROW_WIDTH)
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const sidebarVisible = !unified && (narrow ? menuOpen : config.sidebar !== false)
  const toggleSidebar = (): void =>
    narrow ? setMenuOpen((open) => !open) : setConfig({ sidebar: config.sidebar === false })
  const [view, setView] = useState<View>({ kind: 'list' })
  /** Message passager (« Mail envoyé »…) ; `at` relance le délai pour un même texte. */
  const [notice, setNoticeState] = useState<{ text: string; at: number } | null>(null)
  const setNotice = (text: string): void => setNoticeState({ text, at: Date.now() })
  const [refreshing, setRefreshing] = useState(false)
  /** Le mail en cours d'écriture a-t-il du contenu (fourni par MailComposer). */
  const composerContent = useRef<(() => boolean) | null>(null)
  /** Action en attente de confirmation : elle fermerait un mail en cours d'écriture. */
  const [leaving, setLeaving] = useState<(() => void) | null>(null)
  /** Quitte l'écriture d'un mail (autre dossier, recherche…) sans perdre un brouillon en silence. */
  const leaveComposer = (action: () => void): void => {
    if (view.kind === 'compose' && composerContent.current?.()) setLeaving(() => action)
    else action()
  }

  // Clic sur la notification d'un mail de ce compte (ou de l'un d'eux) : il s'ouvre ici
  useMailOpenRequest(scopeIds, (messageId, accountId) =>
    leaveComposer(() =>
      setView({ kind: 'read', id: unified ? joinMailId(accountId, messageId) : messageId })
    )
  )

  // Les messages passagers (« Mail envoyé »…) disparaissent d'eux-mêmes, en s'animant
  const toast = useLingering(notice)
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNoticeState(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const refresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await Promise.all(scope.map((item) => mail.checkNow(item.id)))
      inbox.reload()
    } finally {
      setRefreshing(false)
    }
  }

  const openFolder = (id: string): void =>
    leaveComposer(() => {
      setConfig({ folder: id })
      setView({ kind: 'list' })
      if (narrow) setMenuOpen(false)
    })

  const submitSearch = (event: React.FormEvent): void => {
    event.preventDefault()
    const text = searchInput.trim()
    leaveComposer(() => {
      setSearch(text)
      setView({ kind: 'list' })
    })
  }

  return (
    <div ref={root} className={styles.widget}>
      <header className={styles.header}>
        {!unified && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('folders.toggle')}
            aria-label={t('folders.toggle')}
            aria-expanded={sidebarVisible}
            onClick={toggleSidebar}
          >
            <Menu size={16} aria-hidden />
          </button>
        )}
        {accounts.length > 1 ? (
          <Select
            value={unified ? ALL_ACCOUNTS : account.id}
            aria-label={t('account')}
            options={[
              { value: ALL_ACCOUNTS, label: t('allAccounts') },
              ...accounts.map((item) => ({ value: item.id, label: item.name }))
            ]}
            onChange={(accountId) => leaveComposer(() => onAccountChange(accountId))}
          />
        ) : (
          <span className={styles.accountName} title={account.address}>
            {account.name}
          </span>
        )}
        <form className={styles.search} role="search" onSubmit={submitSearch}>
          <Search size={15} aria-hidden />
          <input
            value={searchInput}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {(searchInput || search) && (
            <button
              type="button"
              className={styles.searchClear}
              aria-label={t('clearSearch')}
              onClick={() => {
                setSearchInput('')
                setSearch('')
              }}
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </form>
        <button
          type="button"
          className={styles.iconButton}
          title={t('compose')}
          aria-label={t('compose')}
          onClick={() => setView({ kind: 'compose', request: { mode: 'new' } })}
        >
          <PenSquare size={15} aria-hidden />
        </button>
        <BlockSettingsButton className={styles.iconButton} />
      </header>

      {failing &&
        state?.error &&
        (failing.provider === 'gmail' && needsReconnect(state.error) ? (
          // Connexion Google à refaire : sur place, la page s'ouvre sur ce compte
          <AccountRequired
            compact
            service="gmail"
            error={state.error}
            account={failing.address}
            signIn={() => mail.reconnect(failing.id)}
            onConnected={inbox.reload}
          />
        ) : (
          <div className={styles.banner}>
            <AlertTriangle size={15} aria-hidden />
            <span>
              {unified && `${failing.name} : `}
              {mailErrorMessage(new Error(`mail-error:${state.error}`))}
            </span>
            {/* Compte IMAP : mot de passe à saisir de nouveau dans Paramètres → Comptes */}
            {state.error === 'auth' && <Button onClick={openMailSettings}>{t('reconnect')}</Button>}
          </div>
        ))}
      {toast.shown && (
        <p className={styles.toast} data-closing={toast.closing || undefined}>
          {toast.shown.text}
        </p>
      )}

      <div className={styles.layout}>
        {sidebarVisible && (
          <>
            {narrow && (
              <button
                type="button"
                className={styles.backdrop}
                aria-label={t('folders.toggle')}
                onClick={() => setMenuOpen(false)}
              />
            )}
            <div className={styles.sidebar} data-overlay={narrow}>
              <MailFolders
                folders={folders}
                current={folder?.id ?? query.folder}
                onSelect={(item) => openFolder(item.id)}
                onCompose={() => {
                  setView({ kind: 'compose', request: { mode: 'new' } })
                  if (narrow) setMenuOpen(false)
                }}
              />
            </div>
          </>
        )}
        <div className={styles.content}>
          {view.kind === 'list' && (
            <>
              <div className={styles.listBar}>
                <span className={styles.listTitle}>
                  {search
                    ? t('searchResults', { query: search })
                    : unified
                      ? t('allInboxes')
                      : folderName(folder)}
                </span>
                <span className={styles.chips} role="radiogroup" aria-label={t('filters.label')}>
                  {(['all', 'unread', 'read'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      role="radio"
                      aria-checked={query.filter === filter}
                      className={styles.chip}
                      onClick={() => setConfig({ filter })}
                    >
                      {t(`filters.${filter}`)}
                    </button>
                  ))}
                </span>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('refresh')}
                  aria-label={t('refresh')}
                  disabled={refreshing}
                  onClick={() => void refresh()}
                >
                  <RefreshCw
                    size={15}
                    className={refreshing ? styles.spin : undefined}
                    aria-hidden
                  />
                </button>
              </div>
              <MailList
                inbox={inbox}
                showRecipients={!unified && (folder?.kind === 'sent' || folder?.kind === 'drafts')}
                emptyText={
                  search
                    ? t('emptySearch')
                    : query.filter === 'unread'
                      ? t('emptyUnread')
                      : t('emptyFolder')
                }
                onOpen={(message) => setView({ kind: 'read', id: message.id })}
                onError={setNotice}
                accountOf={unified ? (message) => accountOf(message.id).name : undefined}
              />
            </>
          )}
          {view.kind === 'read' && (
            <MailReader
              key={view.id}
              accountId={accountOf(view.id).id}
              id={splitMailId(view.id, account.id).id}
              remoteImages={remoteImages}
              onBack={() => setView({ kind: 'list' })}
              onAct={(action) => inbox.act(view.id, action)}
              onCompose={(mode, message) =>
                setView({
                  kind: 'compose',
                  request: { mode, message },
                  accountId: accountOf(view.id).id
                })
              }
            />
          )}
          {view.kind === 'compose' && (
            <MailComposer
              account={scope.find((item) => item.id === view.accountId) ?? account}
              accounts={unified ? scope : undefined}
              request={view.request}
              hasContentRef={composerContent}
              onClose={(sent) => {
                setView({ kind: 'list' })
                if (sent) setNotice(t('composer.sent'))
              }}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={leaving !== null}
        title={t('composer.leaveTitle')}
        message={t('composer.leaveMessage')}
        onClose={() => setLeaving(null)}
        actions={[
          { label: t('composer.keepWriting'), onClick: () => setLeaving(null) },
          {
            label: t('composer.discard'),
            variant: 'danger',
            onClick: () => {
              leaving?.()
              setLeaving(null)
            }
          }
        ]}
      />
    </div>
  )
}
