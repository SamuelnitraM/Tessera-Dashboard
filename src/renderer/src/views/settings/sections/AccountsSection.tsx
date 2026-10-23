import { useEffect, useState } from 'react'
import { BookOpen, LoaderCircle, LogOut, Plus, RefreshCw, Server, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { REPOSITORY_URL } from '@shared/app'
import type { AccountProviders, GoogleService } from '@shared/accounts'
import { CHECK_MINUTES, type MailAccount } from '@shared/mail'
import { LIVE_CHECK_MINUTES } from '@shared/media'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Select } from '../../../components/ui/Select'
import { mailErrorMessage, useMailStore } from '../../../stores/mail'
import { useMediaStatusStore } from '../../../stores/mediaStatus'
import { useSettingsStore } from '../../../stores/settings'
import styles from '../settings.module.css'
import { SettingRow, SettingsCard } from '../SettingRow'
import { ClientIdInput, SecretInput } from './CredentialInputs'
import { ImapDialog } from './ImapDialog'
import { BrandButton } from './BrandButton'

const ADVANCED_GUIDE = `${REPOSITORY_URL}/blob/main/docs/applications-oauth.md`

type Connecting = 'google' | 'twitch' | null

/**
 * Comptes connectés : « Se connecter avec Google / Twitch » (page officielle dans
 * le navigateur, où l'on est souvent déjà connecté) et comptes de messagerie IMAP.
 */
export function AccountsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const mailStates = useMailStore((state) => state.states)
  const media = useMediaStatusStore((state) => state.status)
  const [providers, setProviders] = useState<AccountProviders | null>(null)
  const [connecting, setConnecting] = useState<Connecting>(null)
  const [error, setError] = useState<{ provider: Connecting; text: string } | null>(null)
  const [services, setServices] = useState<GoogleService[]>(['gmail', 'youtube'])
  const [imapFor, setImapFor] = useState<MailAccount | 'new' | null>(null)
  const [toRemove, setToRemove] = useState<{ label: string; run: () => void } | null>(null)

  const refreshProviders = (): void => void window.tessera.accounts.providers().then(setProviders)
  useEffect(refreshProviders, [settings.mail.googleClientId, settings.media.twitchClientId])

  const run = async (
    provider: Exclude<Connecting, null>,
    action: () => Promise<unknown>
  ): Promise<void> => {
    setError(null)
    setConnecting(provider)
    try {
      await action()
    } catch (failure) {
      setError({ provider, text: mailErrorMessage(failure) })
    } finally {
      setConnecting(null)
    }
  }

  const accounts = settings.mail.accounts
  const youtubeAccounts = settings.media.youtubeAccounts
  // Comptes Google : adresses Gmail et adresse du compte YouTube
  const googleEmails = [
    ...new Set([
      ...accounts
        .filter((item) => item.provider === 'gmail')
        .map((item) => item.address.toLowerCase()),
      ...youtubeAccounts.filter((item) => item.email).map((item) => item.email.toLowerCase())
    ])
  ]
  const gmailFor = (email: string): MailAccount | undefined =>
    accounts.find((item) => item.provider === 'gmail' && item.address.toLowerCase() === email)
  const youtubeAccountFor = (email: string) =>
    youtubeAccounts.find((item) => item.email.toLowerCase() === email)
  const youtubeFor = (email: string): boolean => !!youtubeAccountFor(email)

  const disconnectGoogle = (email: string): void => {
    const gmail = gmailFor(email)
    if (gmail) void window.tessera.mail.removeAccount(gmail.id)
    const youtube = youtubeAccountFor(email)
    if (youtube) void window.tessera.media.disconnect('youtube', youtube.id)
  }

  const progress = (provider: Exclude<Connecting, null>): React.JSX.Element | null =>
    connecting === provider ? (
      <p className={styles.inline}>
        <LoaderCircle className={styles.spin} size={15} aria-hidden />
        {provider === 'twitch'
          ? t('settings.accounts.twitchWaiting')
          : t('settings.accounts.waiting')}
        <Button variant="ghost" onClick={() => void window.tessera.accounts.cancel()}>
          {t('settings.accounts.cancel')}
        </Button>
      </p>
    ) : error?.provider === provider ? (
      <p className={styles.extensionError}>{error.text}</p>
    ) : null

  const unavailable = (provider: Exclude<Connecting, null>): React.JSX.Element | null =>
    providers && !providers.available[provider] ? (
      <p className={styles.cardIntro}>{t('settings.accounts.unavailable')}</p>
    ) : null

  const mailState = (account: MailAccount): React.JSX.Element | null => {
    const state = mailStates[account.id]
    if (!state) return null
    return state.error ? (
      <span className={styles.extensionError}>
        {mailErrorMessage(new Error(`mail-error:${state.error}`))}
      </span>
    ) : (
      <span className={styles.mailAccountInfo}>
        {t('settings.accounts.unread', { count: state.unread })}
      </span>
    )
  }

  return (
    <>
      <p className={styles.sectionIntro}>{t('settings.accounts.intro')}</p>

      {/* ---------- Google ---------- */}
      <SettingsCard title="Google">
        <p className={styles.cardIntro}>{t('settings.accounts.googleIntro')}</p>
        {googleEmails.length > 0 && (
          <ul className={styles.appList}>
            {googleEmails.map((email) => {
              const gmail = gmailFor(email)
              const hasYouTube = youtubeFor(email)
              const youtube = youtubeAccountFor(email)
              const youtubeError = youtube ? media.youtube.errors[youtube.id] : undefined
              return (
                <li key={email} className={styles.appRow}>
                  <div className={styles.mailAccount}>
                    <strong>{gmail?.address ?? youtube?.email ?? email}</strong>
                    <span className={styles.chips}>
                      <span className={styles.chip} data-on={!!gmail}>
                        Gmail
                      </span>
                      <span className={styles.chip} data-on={hasYouTube}>
                        YouTube{hasYouTube && youtube?.name ? ` · ${youtube.name}` : ''}
                      </span>
                    </span>
                    {gmail && mailState(gmail)}
                    {youtubeError && (
                      <span className={styles.extensionError}>
                        {mailErrorMessage(new Error(`mail-error:${youtubeError}`))}
                      </span>
                    )}
                  </div>
                  <div className={styles.appActions}>
                    <Button
                      icon={gmail && hasYouTube ? RefreshCw : Plus}
                      disabled={connecting !== null}
                      onClick={() =>
                        void run('google', () =>
                          window.tessera.accounts.connectGoogle(['gmail', 'youtube'])
                        )
                      }
                    >
                      {gmail && hasYouTube
                        ? t('settings.accounts.reconnect')
                        : gmail
                          ? t('settings.accounts.addYouTube')
                          : t('settings.accounts.addGmail')}
                    </Button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      data-danger
                      title={t('settings.accounts.disconnect')}
                      aria-label={t('settings.accounts.disconnect')}
                      onClick={() =>
                        setToRemove({ label: email, run: () => disconnectGoogle(email) })
                      }
                    >
                      <LogOut size={16} aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className={styles.connectBox}>
          <span className={styles.connectServices}>
            {t('settings.accounts.googleServices')}
            {(['gmail', 'youtube'] as const).map((service) => (
              <label key={service} className={styles.inline}>
                <input
                  type="checkbox"
                  checked={services.includes(service)}
                  onChange={(event) =>
                    setServices((current) =>
                      event.target.checked
                        ? [...current, service]
                        : current.filter((item) => item !== service)
                    )
                  }
                />
                {service === 'gmail' ? 'Gmail' : 'YouTube'}
              </label>
            ))}
          </span>
          <BrandButton
            brand="google"
            disabled={
              connecting !== null || services.length === 0 || providers?.available.google === false
            }
            onClick={() =>
              void run('google', () => window.tessera.accounts.connectGoogle(services))
            }
          >
            {t('settings.accounts.withGoogle')}
          </BrandButton>
        </div>
        {unavailable('google')}
        {progress('google')}
      </SettingsCard>

      {/* ---------- Twitch ---------- */}
      <SettingsCard title="Twitch">
        <p className={styles.cardIntro}>{t('settings.accounts.twitchIntro')}</p>
        {media.twitch.connected && (
          <ul className={styles.appList}>
            <li className={styles.appRow}>
              <div className={styles.mailAccount}>
                <strong>{media.twitch.name}</strong>
                {media.twitch.error && (
                  <span className={styles.extensionError}>
                    {mailErrorMessage(new Error(`mail-error:${media.twitch.error}`))}
                  </span>
                )}
              </div>
              <div className={styles.appActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  data-danger
                  title={t('settings.accounts.disconnect')}
                  aria-label={t('settings.accounts.disconnect')}
                  onClick={() =>
                    setToRemove({
                      label: media.twitch.name ?? 'Twitch',
                      run: () => void window.tessera.media.disconnect('twitch')
                    })
                  }
                >
                  <LogOut size={16} aria-hidden />
                </button>
              </div>
            </li>
          </ul>
        )}
        <div className={styles.connectBox}>
          <BrandButton
            brand="twitch"
            disabled={connecting !== null || providers?.available.twitch === false}
            onClick={() => void run('twitch', () => window.tessera.accounts.connectTwitch())}
          >
            {media.twitch.connected
              ? t('settings.accounts.reconnectTwitch')
              : t('settings.accounts.withTwitch')}
          </BrandButton>
        </div>
        {unavailable('twitch')}
        {progress('twitch')}
      </SettingsCard>

      {/* ---------- Autres messageries ---------- */}
      <SettingsCard title={t('settings.accounts.imapTitle')}>
        <p className={styles.cardIntro}>{t('settings.accounts.imapIntro')}</p>
        <MailRows
          accounts={accounts.filter((item) => item.provider === 'imap')}
          state={mailState}
          onEdit={setImapFor}
          onRemove={(account) =>
            setToRemove({
              label: account.name,
              run: () => void window.tessera.mail.removeAccount(account.id)
            })
          }
        />
        <div className={styles.connectBox}>
          <Button icon={Server} onClick={() => setImapFor('new')}>
            {t('settings.accounts.addImap')}
          </Button>
        </div>
      </SettingsCard>

      {/* ---------- Vérification ---------- */}
      <SettingsCard title={t('settings.accounts.checkTitle')}>
        <SettingRow
          label={t('settings.accounts.mailCheck.label')}
          description={t('settings.accounts.mailCheck.description')}
        >
          {({ labelId }) => (
            <Select
              value={String(settings.mail.checkMinutes)}
              aria-labelledby={labelId}
              options={CHECK_MINUTES.map((minutes) => ({
                value: String(minutes),
                label: t('settings.accounts.every', { count: minutes })
              }))}
              onChange={(value) => void update({ mail: { checkMinutes: Number(value) } })}
            />
          )}
        </SettingRow>
        <SettingRow
          label={t('settings.accounts.liveCheck.label')}
          description={t('settings.accounts.liveCheck.description')}
        >
          {({ labelId }) => (
            <Select
              value={String(settings.media.liveCheckMinutes)}
              aria-labelledby={labelId}
              options={LIVE_CHECK_MINUTES.map((minutes) => ({
                value: String(minutes),
                label: t('settings.accounts.every', { count: minutes })
              }))}
              onChange={(value) => void update({ media: { liveCheckMinutes: Number(value) } })}
            />
          )}
        </SettingRow>
        <p className={styles.cardIntro}>{t('settings.accounts.notificationsHint')}</p>
      </SettingsCard>

      {/* ---------- Avancé : identifiants personnels ---------- */}
      <details className={styles.advanced}>
        <summary>{t('settings.accounts.advanced')}</summary>
        <p className={styles.cardIntro}>{t('settings.accounts.advancedIntro')}</p>
        <a className={styles.aboutLink} href={ADVANCED_GUIDE} target="_blank" rel="noreferrer">
          <BookOpen size={14} aria-hidden /> {t('settings.accounts.guide')}
        </a>
        <div className={styles.mailFields}>
          <label className={styles.mailField}>
            <span>{t('settings.accounts.googleClientId')}</span>
            <ClientIdInput
              value={settings.mail.googleClientId}
              onSave={(googleClientId) => void update({ mail: { googleClientId } })}
            />
          </label>
          <label className={styles.mailField}>
            <span>{t('settings.accounts.googleClientSecret')}</span>
            <GoogleSecret onSaved={refreshProviders} />
          </label>
          <label className={styles.mailField}>
            <span>{t('settings.accounts.twitchClientId')}</span>
            <ClientIdInput
              value={settings.media.twitchClientId}
              onSave={(twitchClientId) => void update({ media: { twitchClientId } })}
            />
          </label>
        </div>
      </details>

      <ImapDialog
        target={imapFor}
        onClose={() => setImapFor(null)}
        key={imapFor === null ? 'closed' : imapFor === 'new' ? 'new' : imapFor.id}
      />
      <ConfirmDialog
        open={toRemove !== null}
        title={t('settings.accounts.disconnectTitle', { name: toRemove?.label ?? '' })}
        message={t('settings.accounts.disconnectMessage')}
        onClose={() => setToRemove(null)}
        actions={[
          { label: t('settings.accounts.cancel'), onClick: () => setToRemove(null) },
          {
            label: t('settings.accounts.disconnect'),
            variant: 'danger',
            onClick: () => {
              toRemove?.run()
              setToRemove(null)
            }
          }
        ]}
      />
    </>
  )
}

/** Comptes de messagerie IMAP : adresse, état, actions. */
function MailRows({
  accounts,
  state,
  onEdit,
  onRemove
}: {
  accounts: MailAccount[]
  state: (account: MailAccount) => React.JSX.Element | null
  onEdit?: (account: MailAccount) => void
  onRemove: (account: MailAccount) => void
}): React.JSX.Element | null {
  const { t } = useTranslation()
  if (accounts.length === 0) return null
  return (
    <ul className={styles.appList}>
      {accounts.map((account) => (
        <li key={account.id} className={styles.appRow}>
          <div className={styles.mailAccount}>
            <strong>{account.name}</strong>
            {account.name !== account.address && (
              <span className={styles.mailAccountInfo}>{account.address}</span>
            )}
            {state(account)}
          </div>
          <div className={styles.appActions}>
            {onEdit && (
              <button
                type="button"
                className={styles.iconButton}
                title={t('settings.accounts.reconnect')}
                aria-label={t('settings.accounts.reconnect')}
                onClick={() => onEdit(account)}
              >
                <RefreshCw size={16} aria-hidden />
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              data-danger
              title={t('settings.accounts.disconnect')}
              aria-label={t('settings.accounts.disconnect')}
              onClick={() => onRemove(account)}
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Secret du client Google personnel (jamais réaffiché). */
function GoogleSecret({ onSaved }: { onSaved: () => void }): React.JSX.Element {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    void window.tessera.mail.getConfig().then((config) => setSaved(config.googleSecretSet))
  }, [])
  return (
    <SecretInput
      saved={saved}
      onSaved={(value) => {
        setSaved(value)
        onSaved()
      }}
    />
  )
}
