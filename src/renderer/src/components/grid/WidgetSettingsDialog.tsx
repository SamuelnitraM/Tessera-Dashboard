import { useId, useState } from 'react'
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
        <NumberInput id={`${id}-input`} field={field} value={value} onChange={onChange} />
      )}
    </div>
  )
}

/**
 * Champ nombre : le texte tapé reste affiché tel quel (« 3 » en route vers « 30 », champ
 * vidé) ; une valeur valide s'applique tout de suite, le reste est ramené dans les limites à la
 * sortie du champ.
 */
function NumberInput({
  id,
  field,
  value,
  onChange
}: {
  id: string
  field: Extract<WidgetSettingField, { type: 'number' }>
  value: unknown
  onChange: (value: unknown) => void
}): React.JSX.Element {
  const [text, setText] = useState(String(Number(value)))
  // Valeur changée ailleurs : le champ la reprend
  const [shownValue, setShownValue] = useState(value)
  if (shownValue !== value) {
    setShownValue(value)
    if (Number(text) !== Number(value) || text.trim() === '') setText(String(Number(value)))
  }
  const valid = (number: number): boolean =>
    Number.isFinite(number) && number >= field.min && number <= field.max

  return (
    <input
      id={id}
      className={styles.input}
      type="number"
      value={text}
      min={Number.isFinite(field.min) ? field.min : undefined}
      max={Number.isFinite(field.max) ? field.max : undefined}
      step={field.step}
      onChange={(event) => {
        setText(event.target.value)
        const number = event.target.valueAsNumber
        if (valid(number)) onChange(number)
      }}
      onBlur={(event) => {
        const number = event.target.valueAsNumber
        // Vide ou illisible : dernière valeur valide ; hors limites : ramenée à la limite
        const next = Number.isFinite(number)
          ? Math.min(field.max, Math.max(field.min, number))
          : Number(value)
        setText(String(next))
        if (next !== Number(value)) onChange(next)
      }}
    />
  )
}
