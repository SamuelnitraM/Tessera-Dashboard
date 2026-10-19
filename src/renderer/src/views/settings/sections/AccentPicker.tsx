import { Check, Pipette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ACCENT_PRESETS, BRAND_ACCENT, isHexColor, type AccentSetting } from '@shared/settings'
import { useSettingsStore } from '../../../stores/settings'
import styles from '../settings.module.css'

interface AccentPickerProps {
  value: AccentSetting
  onChange: (value: AccentSetting) => void
  'aria-labelledby'?: string
}

/** Choix de la couleur d'accent : couleur Windows, couleurs prédéfinies ou couleur libre. */
export function AccentPicker({ value, onChange, ...aria }: AccentPickerProps): React.JSX.Element {
  const { t } = useTranslation()
  const systemAccent = useSettingsStore((state) => state.system.accentColor)

  const isCustom = value !== 'system' && !ACCENT_PRESETS.includes(value)
  const customValue = value === 'system' ? (systemAccent ?? BRAND_ACCENT) : value

  return (
    <div className={styles.accentPicker} role="radiogroup" {...aria}>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'system'}
        className={styles.accentSystem}
        onClick={() => onChange('system')}
      >
        <span
          className={styles.accentDot}
          style={{ background: systemAccent ?? BRAND_ACCENT }}
          aria-hidden
        />
        {t('settings.accent.system')}
      </button>

      <div className={styles.accentSwatches}>
        {ACCENT_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value === color}
            aria-label={t('settings.accent.preset', { color })}
            title={color}
            className={styles.accentSwatch}
            style={{ background: color }}
            onClick={() => onChange(color)}
          >
            {value === color && <Check size={16} strokeWidth={3} aria-hidden />}
          </button>
        ))}

        {/* Couleur libre : le sélecteur natif est caché derrière une pastille */}
        <label
          className={styles.accentSwatch}
          data-custom
          data-checked={isCustom}
          style={isCustom ? { background: value } : undefined}
          title={t('settings.accent.custom')}
        >
          <input
            type="color"
            className={styles.accentInput}
            aria-label={t('settings.accent.custom')}
            value={customValue}
            onChange={(event) => {
              const color = event.target.value.toLowerCase()
              if (isHexColor(color)) onChange(color)
            }}
          />
          {isCustom ? (
            <Check size={16} strokeWidth={3} aria-hidden />
          ) : (
            <Pipette size={16} aria-hidden />
          )}
        </label>
      </div>
    </div>
  )
}
