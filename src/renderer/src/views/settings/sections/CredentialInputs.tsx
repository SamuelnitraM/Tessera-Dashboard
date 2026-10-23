import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import styles from '../settings.module.css'

/** Identifiant collé par l'utilisateur, enregistré quand le champ perd le focus. */
export function ClientIdInput({
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

/** Secret (client Google) : jamais réaffiché, seulement remplacé ou effacé. */
export function SecretInput({
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
        {t('settings.accounts.secretSaved')}
        <Button variant="ghost" onClick={() => void save('')}>
          {t('settings.accounts.clearSecret')}
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
        placeholder={t('settings.accounts.secretPlaceholder')}
        autoComplete="off"
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && value.trim() && void save(value)}
      />
      <Button disabled={!value.trim()} onClick={() => void save(value)}>
        {t('settings.accounts.save')}
      </Button>
    </span>
  )
}
