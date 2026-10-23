import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IMAP_PRESETS, type MailAccount, type MailServer } from '@shared/mail'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Select } from '../../../components/ui/Select'
import { mailErrorMessage } from '../../../stores/mail'
import styles from '../settings.module.css'

const CUSTOM = 'custom'

function presetFor(address: string): string | null {
  const domain = address.split('@')[1]?.toLowerCase() ?? ''
  return IMAP_PRESETS.find((preset) => preset.domains.includes(domain))?.id ?? null
}

/** Ajout d'un compte IMAP (ou nouveau mot de passe d'un compte existant). */
export function ImapDialog({
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
        placeholder={t('settings.accounts.imap.host')}
        aria-label={`${label} : ${t('settings.accounts.imap.host')}`}
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
        aria-label={`${label} : ${t('settings.accounts.imap.port')}`}
        required
        onChange={(event) => onChange({ ...value, port: Number(event.target.value) })}
      />
      <label className={styles.inline}>
        <input
          type="checkbox"
          checked={value.secure}
          onChange={(event) => onChange({ ...value, secure: event.target.checked })}
        />
        {t('settings.accounts.imap.secure')}
      </label>
    </fieldset>
  )

  return (
    <Dialog
      open={target !== null}
      title={
        existing
          ? t('settings.accounts.imap.reconnectTitle', { name: existing.name })
          : t('settings.accounts.imap.title')
      }
      onClose={onClose}
    >
      <form className={styles.mailForm} onSubmit={(event) => void submit(event)}>
        <label className={styles.mailField}>
          <span>{t('settings.accounts.imap.address')}</span>
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
          <span>{t('settings.accounts.imap.name')}</span>
          <input
            className={styles.input}
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={styles.mailField}>
          <span>{t('settings.accounts.imap.provider')}</span>
          <Select
            value={preset}
            options={[
              ...IMAP_PRESETS.map((item) => ({ value: item.id, label: item.name })),
              { value: CUSTOM, label: t('settings.accounts.imap.custom') }
            ]}
            onChange={setPreset}
          />
        </label>
        {preset === CUSTOM && (
          <>
            {serverFields(t('settings.accounts.imap.incoming'), imap, setImap)}
            {serverFields(t('settings.accounts.imap.outgoing'), smtp, setSmtp)}
          </>
        )}
        <label className={styles.mailField}>
          <span>{t('settings.accounts.imap.username')}</span>
          <input
            className={styles.input}
            value={username}
            placeholder={address}
            spellCheck={false}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className={styles.mailField}>
          <span>{t('settings.accounts.imap.password')}</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            required
            autoComplete="off"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className={styles.cardIntro}>{t('settings.accounts.imap.passwordHint')}</p>
        {error && <p className={styles.extensionError}>{error}</p>}
        <div className={styles.mailFormActions}>
          {checking && (
            <span className={styles.inline}>
              <LoaderCircle className={styles.spin} size={15} aria-hidden />
              {t('settings.accounts.imap.checking')}
            </span>
          )}
          <Button variant="primary" type="submit" disabled={checking}>
            {t('settings.accounts.imap.add')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
