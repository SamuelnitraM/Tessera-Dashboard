import { app, nativeTheme, systemPreferences } from 'electron'
import type { SystemPreferences } from '@shared/ipc'
import { isHexColor, type HexColor, type ThemeSetting } from '@shared/settings'

/** Fond de la fenêtre avant chargement de l'interface (évite un flash de mauvaise couleur). */
const WINDOW_BACKGROUND = { light: '#f5f6fa', dark: '#0f1117' }

export function getSystemPreferences(): SystemPreferences {
  return {
    languages: app.getPreferredSystemLanguages(),
    accentColor: readSystemAccentColor()
  }
}

/** Prévient quand l'utilisateur change une préférence dans Windows. */
export function watchSystemPreferences(onChange: (preferences: SystemPreferences) => void): void {
  systemPreferences.on('accent-color-changed', () => onChange(getSystemPreferences()))
}

/**
 * Applique le thème à toute l'app : Electron transmet ce choix à l'interface
 * (media query CSS `prefers-color-scheme`) et à la barre de titre Windows.
 */
export function applyTheme(theme: ThemeSetting): void {
  nativeTheme.themeSource = theme
}

export function getWindowBackground(): string {
  return nativeTheme.shouldUseDarkColors ? WINDOW_BACKGROUND.dark : WINDOW_BACKGROUND.light
}

/** Windows renvoie la couleur au format `RRGGBBAA` : on garde `#rrggbb`. */
function readSystemAccentColor(): HexColor | null {
  try {
    const raw: unknown = systemPreferences.getAccentColor()
    if (typeof raw !== 'string') return null
    const color = `#${raw.slice(0, 6)}`.toLowerCase()
    return isHexColor(color) ? color : null
  } catch {
    return null
  }
}
