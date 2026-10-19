import type { HexColor } from '@shared/settings'

/**
 * Applique la couleur d'accent à toute l'interface via des variables CSS.
 * Les variantes (survol, fond léger) sont calculées en CSS à partir de `--color-accent`.
 */
export function applyAccentColor(color: HexColor): void {
  const root = document.documentElement.style
  root.setProperty('--color-accent', color)
  root.setProperty('--color-on-accent', getReadableTextColor(color))
}

/** Texte blanc ou noir selon la couleur de fond, pour rester lisible sur n'importe quel accent. */
function getReadableTextColor(background: HexColor): string {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(background.slice(start, start + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.179 ? '#111318' : '#ffffff'
}
