import { useSettingsStore } from '../stores/settings'

/** Couleurs d'origine du logo (indigo, violet, bleu ciel). */
const BRAND_COLORS = ['#4f46e5', '#8b5cf6', '#38bdf8']
/** Aux couleurs de l'accent : l'accent, puis deux teintes plus claires. */
const ACCENT_COLORS = [
  'var(--color-accent)',
  'color-mix(in oklab, var(--color-accent) 70%, white)',
  'color-mix(in oklab, var(--color-accent) 45%, white)'
]

/** Logo de Tessera : trois tuiles en mosaïque. Même dessin que resources/icon.png. */
export function Logo({ size = 26 }: { size?: number }): React.JSX.Element {
  const accentIcon = useSettingsStore((state) => state.settings.appearance.accentIcon)
  const [first, second, third] = accentIcon ? ACCENT_COLORS : BRAND_COLORS
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden>
      <rect x="16" y="16" width="104" height="224" rx="26" style={{ fill: first }} />
      <rect x="136" y="16" width="104" height="104" rx="26" style={{ fill: second }} />
      <rect x="136" y="136" width="104" height="104" rx="26" style={{ fill: third }} />
    </svg>
  )
}
