import { useId } from 'react'
import { localize, type WidgetSettingField } from '@shared/plugins'
import { useResolvedLanguage } from '../../stores/settings'
import { Dialog } from '../ui/Dialog'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import styles from './WidgetSettingsDialog.module.css'

interface WidgetSettingsDialogProps {
  title: string
  fields: readonly WidgetSettingField[]
  config: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  open: boolean
  onClose: () => void
}

/**
 * Réglages d'un widget, générés à partir de son manifeste.
 * Chaque modification s'applique immédiatement (pas de bouton « Enregistrer »).
 */
export function WidgetSettingsDialog({
  title,
  fields,
  config,
  onChange,
  open,
  onClose
}: WidgetSettingsDialogProps): React.JSX.Element {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      <div className={styles.fields}>
        {fields.map((field) => (
          <SettingField
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(value) => onChange({ [field.key]: value })}
          />
        ))}
      </div>
    </Dialog>
  )
}

interface SettingFieldProps {
  field: WidgetSettingField
  value: unknown
  onChange: (value: unknown) => void
}

function SettingField({ field, value, onChange }: SettingFieldProps): React.JSX.Element {
  const language = useResolvedLanguage()
  const id = useId()
  const label = localize(field.label, language)

  // Interrupteur : libellé et contrôle sur la même ligne
  if (field.type === 'boolean') {
    return (
      <div className={styles.field} data-inline>
        <span id={id}>{label}</span>
        <Switch aria-labelledby={id} checked={value === true} onChange={onChange} />
      </div>
    )
  }

  return (
    <div className={styles.field}>
      <label id={id} htmlFor={`${id}-input`}>
        {label}
      </label>
      {field.type === 'select' && (
        <Select
          aria-labelledby={id}
          value={String(value)}
          onChange={onChange}
          options={field.options.map((option) => ({
            value: option.value,
            label: localize(option.label, language)
          }))}
        />
      )}
      {field.type === 'text' && (
        <input
          id={`${id}-input`}
          className={styles.input}
          value={String(value ?? '')}
          maxLength={field.maxLength}
          placeholder={localize(field.placeholder, language)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.type === 'number' && (
        <input
          id={`${id}-input`}
          className={styles.input}
          type="number"
          value={Number(value)}
          min={Number.isFinite(field.min) ? field.min : undefined}
          max={Number.isFinite(field.max) ? field.max : undefined}
          step={field.step}
          onChange={(event) => {
            const number = event.target.valueAsNumber
            // Valeur hors limites ou vide : ignorée, le champ reste sur la dernière valeur valide
            if (Number.isFinite(number) && number >= field.min && number <= field.max) {
              onChange(number)
            }
          }}
        />
      )}
    </div>
  )
}
