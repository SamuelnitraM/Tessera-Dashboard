import { useState } from 'react'
import { Check, Copy, Pipette, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'
import { HeaderPopover } from './HeaderPopover'
import { useCopied } from './helpers'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

const STORAGE_KEY = 'tessera.eyedropper'
const MAX_COLORS = 16

function loadColors(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter(
          (item): item is string => typeof item === 'string' && /^#[0-9a-f]{6}$/i.test(item)
        )
      : []
  } catch {
    return []
  }
}

/** Couleurs choisies (gardées sur ce PC, la plus récente d'abord). */
const useColorsStore = create<{ colors: string[] }>()(() => ({ colors: loadColors() }))

function saveColors(colors: string[]): void {
  useColorsStore.setState({ colors })
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
  } catch {
    // Stockage indisponible : gardées jusqu'à la fermeture
  }
}

function formats(hex: string): { key: string; value: string }[] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const lightness = (max + min) / 2
  const delta = max - min
  let hue = 0
  if (delta !== 0) {
    const [red, green, blue] = [r / 255, g / 255, b / 255]
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  return [
    { key: 'hex', value: hex.toUpperCase() },
    { key: 'rgb', value: `rgb(${r}, ${g}, ${b})` },
    {
      key: 'hsl',
      value: `hsl(${Math.round((hue * 60 + 360) % 360)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`
    }
  ]
}

/**
 * Pipette : une couleur prise n'importe où à l'écran (applications installées comprises),
 * en HEX, RGB et HSL. Le panneau se referme pendant le choix.
 */
/** Couleur prise à l'écran, ajoutée en tête des couleurs récentes ; `true` si tout s'est bien passé. */
function pickColor(): Promise<boolean> {
  return window.tessera.headerBar
    .pickColor()
    .then((hex) => {
      const { colors } = useColorsStore.getState()
      if (hex) saveColors([hex, ...colors.filter((color) => color !== hex)].slice(0, MAX_COLORS))
      return true
    })
    .catch(() => false)
}

export function EyedropperItem(): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const colors = useColorsStore((state) => state.colors)

  const pick = (): void => {
    setOpen(false)
    void pickColor().then((done) => {
      setUnsupported(!done)
      setOpen(true)
    })
  }

  return (
    <HeaderPopover
      label={t('headerBar.names.eyedropper')}
      open={open}
      onOpenChange={setOpen}
      button={
        <>
          <Pipette size={16} aria-hidden />
          {colors[0] && <span className={styles.colorDot} style={{ background: colors[0] }} />}
        </>
      }
    >
      {() => <EyedropperPanel colors={colors} unsupported={unsupported} onPick={pick} />}
    </HeaderPopover>
  )
}

function EyedropperPanel({
  colors,
  unsupported,
  onPick
}: {
  colors: string[]
  unsupported: boolean
  onPick: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, copy] = useCopied()
  const color = selected && colors.includes(selected) ? selected : colors[0]

  return (
    <div className={styles.eyedropper}>
      <PanelTitle title={t('headerBar.names.eyedropper')}>
        {colors.length > 0 && (
          <button
            type="button"
            className={styles.iconButton}
            title={t('headerBar.eyedropper.clear')}
            aria-label={t('headerBar.eyedropper.clear')}
            onClick={() => saveColors([])}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        )}
      </PanelTitle>
      <button type="button" className={styles.primaryButton} onClick={onPick}>
        <Pipette size={14} aria-hidden /> {t('headerBar.eyedropper.pick')}
      </button>
      {unsupported && <p className={styles.error}>{t('headerBar.eyedropper.unsupported')}</p>}
      {color ? (
        <>
          <div className={styles.colorPreview} style={{ background: color }} />
          <ul className={styles.colorFormats}>
            {formats(color).map((format) => (
              <li key={format.key}>
                <code>{format.value}</code>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('headerBar.eyedropper.copy', { value: format.value })}
                  aria-label={t('headerBar.eyedropper.copy', { value: format.value })}
                  onClick={() => copy(format.key, format.value)}
                >
                  {copied === format.key ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    <Copy size={14} aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {colors.length > 1 && (
            <>
              <h3 className={styles.groupTitle}>{t('headerBar.eyedropper.recent')}</h3>
              <div className={styles.swatches}>
                {colors.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={styles.swatch}
                    data-selected={item === color}
                    style={{ background: item }}
                    title={item.toUpperCase()}
                    aria-label={item.toUpperCase()}
                    onClick={() => setSelected(item)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p className={styles.muted}>{t('headerBar.eyedropper.empty')}</p>
      )}
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function EyedropperBlock(): React.JSX.Element {
  const [unsupported, setUnsupported] = useState(false)
  const colors = useColorsStore((state) => state.colors)
  return (
    <EyedropperPanel
      colors={colors}
      unsupported={unsupported}
      onPick={() => void pickColor().then((done) => setUnsupported(!done))}
    />
  )
}
