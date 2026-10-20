import { useEffect, useState } from 'react'
import { BookOpen, LoaderCircle, Mail, Plus, RefreshCw, Server, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { REPOSITORY_URL } from '@shared/app'
import {
  CHECK_MINUTES,
  IMAP_PRESETS,
  type MailAccount,
  type MailProvider,
  type MailServer
} from '@shared/mail'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Dialog } from '../../../components/ui/Dialog'
import { Select } from '../../../components/ui/Select'
import { mailErrorMessage, useMailStore } from '../../../stores/mail'
import { useSettingsStore } from '../../../stores/settings'
import styles from '../settings.module.css'
import { SettingRow, SettingsCard } from '../SettingRow'

const GUIDE_URL = `${REPOSITORY_URL}/blob/main/docs/mails.md`

/**
 * Comptes mail : ajout (Gmail et Outlook par leur page de connexion, IMAP par formulaire),
 * identifiants de connexion Google et Microsoft fournis par l'utilisateur, vérification.
 */
export function MailSection(): React.JSX.Element {
  const { t } = useTranslation()
  const mail = useSettingsStore((state) => state.settings.mail)
  const update = useSettingsStore((state) => state.update)
  const states = useMailStore((state) => state.states)
  const [googleSecretSet, setGoogleSecretSet] = useState(false)
  const [connecting, setConnecting] = useState<MailProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imapFor, setImapFor] = useState<MailAccount | 'new' | null>(null)
  const [toRemove, setToRemove] = useState<MailAccount | null>(null)

  useEffect(() => {
    void window.tessera.mail
      .getConfig()
      .then((config) => setGoogleSecretSet(config.googleSecretSet))
  }, [])

  const googleReady = !!mail.googleClientId && googleSecretSet
  const microsoftReady = !!mail.microsoftClientId

  /** Connexion dans le navigateur (nouveau compte, ou reconnexion). */
  const connect = async (provider: 'gmail' | 'outlook', reconnectId?: string): Promise<void> => {
    setError(null)
    setConnecting(provider)
    try {
      await window.tessera.mail.connectOAuth(provider, reconnectId)
    } catch (failure) {
      setError(mailErrorMessage(failure))
    } finally {
      setConnecting(null)
    }
  }

  const reconnect = (account: MailAccount): void => {
    if (account.provider === 'imap') setImapFor(account)
    else void connect(account.provider, account.id)
  }

  const rename = (account: MailAccount, name: string): void => {
    const value = name.trim() || account.address
    if (value === account.name) return
    void update({
      mail: {
        accounts: mail.accounts.map((item) =>
          item.id === account.id ? { ...item, name: value } : item
        )
      }
    })
  }

  return (
    <>
      <p className={styles.sectionIntro}>{t('settings.mail.intro')}</p>

      <SettingsCard title={t('settings.mail.accountsTitle')}>
        {mail.accounts.length === 0 ? (
          <p className={styles.cardIntro}>{t('settings.mail.noAccounts')}</p>
        ) : (
          <ul className={styles.appList}>
            {mail.accounts.map((account) => {
              const state = states[account.id]
              return (
                <li key={account.id} className={styles.appRow}>
                  <span className={styles.appIcon}>
                    {account.provider === 'imap' ? (
                      <Server size={18} aria-hidden />
                    ) : (
                      <Mail size={18} aria-hidden />
                    )}
                  </span>
                  <div className={styles.mailAccount}>
                    <input
                      className={styles.input}
                      defaultValue={account.name}
                      aria-label={t('settings.mail.name')}
                      maxLength={60}
                      onBlur={(event) => rename(account, event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                    />
                    <span className={styles.mailAccountInfo}>
                      {t(`mail.providers.${account.provider}`)} · {account.address}
                      {state && !state.error && (
                        <> · {t('settings.mail.unread', { count: state.unread })}</>
                      )}
                    </span>
                    {state?.error && (
                      <span className={styles.extensionError}>
                        {t(`mail.errors.${state.error}`)}
                      </span>
                    )}
                  </div>
                  <div className={styles.appActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={t('settings.mail.reconnect')}
                      aria-label={t('settings.mail.reconnect')}
                      disabled={connecting !== null}
                      onClick={() => reconnect(account)}
                    >
                      <RefreshCw size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      data-danger
                      title={t('settings.mail.remove')}
                      aria-label={t('settings.mail.remove')}
                      onClick={() => setToRemove(account)}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className={styles.mailAdd}>
          <Button
            icon={Plus}
            disabled={!googleReady || connecting !== null}
            onClick={() => void connect('gmail')}
          >
            {t('settings.mail.addGmail')}
          </Button>
          <Button
            icon={Plus}
            disabled={!microsoftReady || connecting !== null}
            onClick={() => void connect('outlook')}
          >
            {t('settings.mail.addOutlook')}
          </Button>
          <Button icon={Plus} disabled={connecting !== null} onClick={() => setImapFor('new')}>
            {t('settings.mail.addImap')}
          </Button>
        </div>
        {connecting && (
          <p className={styles.inline}>
            <LoaderCircle className={styles.spin} size={15} aria-hidden />
            {t('settings.mail.connecting')}
            <Button variant="ghost" onClick={() => void window.tessera.mail.cancelConnect()}>
              {t('settings.mail.cancel')}
            </Button>
          </p>
        )}
        {!googleReady && <p className={styles.cardIntro}>{t('settings.mail.needsGoogle')}</p>}
        {!microsoftReady && <p className={styles.cardIntro}>{t('settings.mail.needsMicrosoft')}</p>}
        {error && <p className={styles.extensionError}>{error}</p>}
        <p className={styles.cardIntro}>{t('settings.mail.notificationsHint')}</p>
      </SettingsCard>

      <SettingsCard title={t('settings.mail.checkTitle')}>
        <SettingRow
          label={t('settings.mail.checkMinutes.label')}
          description={t('settings.mail.checkMinutes.description')}
        >
          {({ labelId }) => (
            <Select
              value={String(mail.checkMinutes)}
              aria-labelledby={labelId}
              options={CHECK_MINUTES.map((minutes) => ({
                value: String(minutes),
                label: t('settings.mail.checkMinutes.option', { count: minutes })
              }))}
              onChange={(value) => void update({ mail: { checkMinutes: Number(value) } })}
            />
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={t('settings.mail.googleTitle')}>
        <p className={styles.cardIntro}>{t('settings.mail.googleIntro')}</p>
        <GuideLink anchor="gmail" />
        <div className={styles.mailFields}>
          <label className={styles.mailField}>
            <span>{t('settings.mail.clientId')}</span>
            <ClientIdInput
              value={mail.googleClientId}
              onSave={(googleClientId) => void update({ mail: { googleClientId } })}
            />
          </label>
          <label className={styles.mailField}>
            <span>{t('settings.mail.clientSecret')}</span>
            <GoogleSecretInput saved={googleSecretSet} onSaved={setGoogleSecretSet} />
          </label>
        </div>
      </SettingsCard>

      <SettingsCard title={t('settings.mail.microsoftTitle')}>
        <p className={styles.cardIntro}>{t('settings.mail.microsoftIntro')}</p>
        <GuideLink anchor="outlook" />
        <div className={styles.mailFields}>
          <label className={styles.mailField}>
            <span>{t('settings.mail.applicationId')}</span>
            <ClientIdInput
              value={mail.microsoftClientId}
              onSave={(microsoftClientId) => void update({ mail: { microsoftClientId } })}
            />
          </label>
        </div>
      </SettingsCard>

      <ImapDialog
        target={imapFor}
        onClose={() => setImapFor(null)}
        key={imapFor === null ? 'closed' : imapFor === 'new' ? 'new' : imapFor.id}
      />

      <ConfirmDialog
        open={toRemove !== null}
        title={t('settings.mail.removeTitle', { name: toRemove?.name ?? '' })}
        message={t('settings.mail.removeMessage')}
        onClose={() => setToRemove(null)}
        actions={[
          { label: t('settings.mail.cancel'), onClick: () => setToRemove(null) },
          {
            label: t('settings.mail.remove'),
            variant: 'danger',
            onClick: () => {
              if (toRemove) void window.tessera.mail.removeAccount(toRemove.id)
              setToRemove(null)
            }
          }
        ]}
      />
    </>
  )
}

function GuideLink({ anchor }: { anchor: string }): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <a
      className={styles.aboutLink}
      href={`${GUIDE_URL}#${anchor}`}
      target="_blank"
      rel="noreferrer"
    >
      <BookOpen size={14} aria-hidden /> {t('settings.mail.guide')}
    </a>
  )
}

/** Identifiant collé par l'utilisateur, enregistré quand le champ perd le focus. */
function ClientIdInput({
  value,
  onSave
}: {
  value: string
  onSave: (value: string) => void
}): React.JSX.Element {
  return (
    <input
      className={styles.input}
      defaultValue={value}
      key={value}
      spellCheck={false}
      maxLength={200}
      onBlur={(event) => event.target.value.trim() !== value && onSave(event.target.value.trim())}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
    />
  )
}

/** Secret du client Google : jamais réaffiché, seulement remplacé ou effacé. */
function GoogleSecretInput({
  saved,
  onSaved
}: {
  saved: boolean
  onSaved: (saved: boolean) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  const save = async (secret: string): Promise<void> => {
    await window.tessera.mail.setGoogleSecret(secret)
    setValue('')
    onSaved(!!secret.trim())
  }

  if (saved) {
    return (
      <span className={styles.inline}>
        {t('settings.mail.secretSaved')}
        <Button variant="ghost" onClick={() => void save('')}>
          {t('settings.mail.clearSecret')}
        </Button>
      </span>
    )
  }
  return (
    <span className={styles.mailSecret}>
      <input
        className={styles.input}
        type="password"
        value={value}
        placeholder={t('settings.mail.secretPlaceholder')}
        autoComplete="off"
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && value.trim() && void save(value)}
      />
      <Button disabled={!value.trim()} onClick={() => void save(value)}>
        {t('settings.mail.save')}
      </Button>
    </span>
  )
}

const CUSTOM = 'custom'

function presetFor(address: string): string | null {
  const domain = address.split('@')[1]?.toLowerCase() ?? ''
  return IMAP_PRESETS.find((preset) => preset.domains.includes(domain))?.id ?? null
}

/** Ajout d'un compte IMAP (ou nouveau mot de passe d'un compte existant). */
function ImapDialog({
  target,
  onClose
}: {
  target: MailAccount | 'new' | null
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const existing = target !== 'new' ? target : null
  const [address, setAddress] = useState(existing?.address ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [username, setUsername] = useState(existing?.username ?? '')
  const [password, setPassword] = useState('')
  const [preset, setPreset] = useState<string>(existing ? CUSTOM : (IMAP_PRESETS[0]?.id ?? CUSTOM))
  const [imap, setImap] = useState<MailServer>(
    existing?.imap ?? { host: '', port: 993, secure: true }
  )
  const [smtp, setSmtp] = useState<MailServer>(
    existing?.smtp ?? { host: '', port: 465, secure: true }
  )
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosen = IMAP_PRESETS.find((item) => item.id === preset)
  const servers = chosen ? { imap: chosen.imap, smtp: chosen.smtp } : { imap, smtp }

  const onAddress = (value: string): void => {
    setAddress(value)
    const detected = presetFor(value)
    if (detected && !existing) setPreset(detected)
  }

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setError(null)
    setChecking(true)
    try {
      await window.tessera.mail.addImap(
        { name, address, username: username || address, password, ...servers },
        existing?.id
      )
      onClose()
    } catch (failure) {
      setError(mailErrorMessage(failure))
    } finally {
      setChecking(false)
    }
  }

  const serverFields = (
    label: string,
    value: MailServer,
    onChange: (value: MailServer) => void
  ): React.JSX.Element => (
    <fieldset className={styles.mailServer}>
      <legend>{label}</legend>
      <input
        className={styles.input}
        value={value.host}
        placeholder={t('settings.mail.imap.host')}
        aria-label={`${label} : ${t('settings.mail.imap.host')}`}
        required
        spellCheck={false}
        onChange={(event) => onChange({ ...value, host: event.target.value })}
      />
      <input
        className={styles.input}
        type="number"
        min={1}
        max={65535}
        value={value.port}
        aria-label={`${label} : ${t('settings.mail.imap.port')}`}
        required
        onChange={(event) => onChange({ ...value, port: Number(event.target.value) })}
      />
      <label className={styles.inline}>
        <input
          type="checkbox"
          checked={value.secure}
          onChange={(event) => onChange({ ...value, secure: event.target.checked })}
        />
        {t('settings.mail.imap.secure')}
      </label>
    </fieldset>
  )

  return (
    <Dialog
      open={target !== null}
      title={
        existing
          ? t('settings.mail.imap.reconnectTitle', { name: existing.name })
          : t('settings.mail.imap.title')
      }
      onClose={onClose}
    >
      <form className={styles.mailForm} onSubmit={(event) => void submit(event)}>
        <label className={styles.mailField}>
          <span>{t('settings.mail.imap.address')}</span>
          <input
            className={styles.input}
            type="email"
            value={address}
            required
            autoFocus
            spellCheck={false}
            onChange={(event) => onAddress(event.target.value)}
          />
        </label>
        <label className={styles.mailField}>
          <span>{t('settings.mail.imap.name')}</span>
          <input
            className={styles.input}
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={styles.mailField}>
          <span>{t('settings.mail.imap.provider')}</span>
          <Select
            value={preset}
            options={[
              ...IMAP_PRESETS.map((item) => ({ value: item.id, label: item.name })),
              { value: CUSTOM, label: t('settings.mail.imap.custom') }
            ]}
            onChange={setPreset}
          />
        </label>
        {preset === CUSTOM && (
          <>
            {serverFields(t('settings.mail.imap.incoming'), imap, setImap)}
            {serverFields(t('settings.mail.imap.outgoing'), smtp, setSmtp)}
          </>
        )}
        <label className={styles.mailField}>
          <span>{t('settings.mail.imap.username')}</span>
          <input
            className={styles.input}
            value={username}
            placeholder={address}
            spellCheck={false}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className={styles.mailField}>
          <span>{t('settings.mail.imap.password')}</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            required
            autoComplete="off"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className={styles.cardIntro}>{t('settings.mail.imap.passwordHint')}</p>
        {error && <p className={styles.extensionError}>{error}</p>}
        <div className={styles.mailFormActions}>
          {checking && (
            <span className={styles.inline}>
              <LoaderCircle className={styles.spin} size={15} aria-hidden />
              {t('settings.mail.imap.checking')}
            </span>
          )}
          <Button variant="primary" type="submit" disabled={checking}>
            {t('settings.mail.imap.add')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
