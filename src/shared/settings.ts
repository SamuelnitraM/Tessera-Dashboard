/**
 * Schéma des réglages de l'application, partagé entre main (stockage) et renderer (affichage).
 * Toute valeur lue sur le disque passe par `sanitizeSettings` : un fichier abîmé ou d'une
 * ancienne version ne peut donc jamais casser l'app, les valeurs invalides reprennent leur défaut.
 */

import { sanitizeUserApps, type UserApp } from './user-apps'

export const LANGUAGES = ['fr', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
export type LanguageSetting = Language | 'system'

export const THEMES = ['system', 'light', 'dark'] as const
export type ThemeSetting = (typeof THEMES)[number]

export type HexColor = `#${string}`
/** `system` = couleur d'accent de Windows. */
export type AccentSetting = 'system' | HexColor

export const SIDEBAR_MODES = ['expanded', 'collapsed'] as const
export type SidebarMode = (typeof SIDEBAR_MODES)[number]

export const STARTUP_MODES = ['maximized', 'last'] as const
export type StartupMode = (typeof STARTUP_MODES)[number]

export interface Settings {
  schemaVersion: 1
  general: {
    language: LanguageSetting
  }
  appearance: {
    theme: ThemeSetting
    accentColor: AccentSetting
    /** Logo et icônes (barre des tâches, zone de notification) aux couleurs de l'accent. */
    accentIcon: boolean
    /** Menu latéral déplié, ou rabattu (onglets en haut de la fenêtre). */
    sidebar: SidebarMode
  }
  window: {
    /** `maximized` : toujours agrandie au lancement. `last` : reprend la dernière taille. */
    startupMode: StartupMode
    /** Fermer la fenêtre la masque dans la zone de notification au lieu de quitter. */
    closeToTray: boolean
  }
  plugins: {
    /** Identifiants des extensions désactivées par l'utilisateur. */
    disabled: string[]
  }
  apps: {
    /** Applications web et installées (Discord…), dans l'ordre du menu latéral. */
    items: UserApp[]
  }
}

type SettingsSections = Omit<Settings, 'schemaVersion'>

/** Modification partielle : chaque section peut être mise à jour champ par champ. */
export type SettingsPatch = { [K in keyof SettingsSections]?: Partial<SettingsSections[K]> }

/** Couleur de la marque Tessera, utilisée si l'accent Windows est indisponible. */
export const BRAND_ACCENT: HexColor = '#4f46e5'

export const ACCENT_PRESETS: HexColor[] = [
  '#4f46e5', // indigo (Tessera)
  '#2563eb', // bleu
  '#0891b2', // cyan
  '#059669', // émeraude
  '#65a30d', // vert
  '#d97706', // ambre
  '#ea580c', // orange
  '#dc2626', // rouge
  '#db2777', // rose
  '#7c3aed' // violet
]

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  general: {
    language: 'system'
  },
  appearance: {
    theme: 'system',
    accentColor: 'system',
    accentIcon: true,
    sidebar: 'expanded'
  },
  window: {
    startupMode: 'maximized',
    closeToTray: true
  },
  plugins: {
    disabled: []
  },
  apps: {
    items: []
  }
}

export function isHexColor(value: unknown): value is HexColor {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/** Construit des réglages valides à partir de n'importe quelle donnée (fichier JSON, patch…). */
export function sanitizeSettings(input: unknown): Settings {
  const root = asRecord(input)
  const general = asRecord(root.general)
  const appearance = asRecord(root.appearance)
  const window = asRecord(root.window)
  const plugins = asRecord(root.plugins)
  const defaults = DEFAULT_SETTINGS

  return {
    schemaVersion: 1,
    general: {
      language: pick<LanguageSetting>(
        general.language,
        ['system', ...LANGUAGES],
        defaults.general.language
      )
    },
    appearance: {
      theme: pick(appearance.theme, THEMES, defaults.appearance.theme),
      accentColor:
        appearance.accentColor === 'system' || isHexColor(appearance.accentColor)
          ? (appearance.accentColor.toLowerCase() as AccentSetting)
          : defaults.appearance.accentColor,
      accentIcon:
        typeof appearance.accentIcon === 'boolean'
          ? appearance.accentIcon
          : defaults.appearance.accentIcon,
      sidebar: pick(appearance.sidebar, SIDEBAR_MODES, defaults.appearance.sidebar)
    },
    window: {
      startupMode: pick(window.startupMode, STARTUP_MODES, defaults.window.startupMode),
      closeToTray:
        typeof window.closeToTray === 'boolean' ? window.closeToTray : defaults.window.closeToTray
    },
    plugins: {
      disabled: Array.isArray(plugins.disabled)
        ? [...new Set(plugins.disabled.filter((id): id is string => typeof id === 'string'))]
        : defaults.plugins.disabled
    },
    apps: {
      items: sanitizeUserApps(asRecord(root.apps).items)
    }
  }
}

/** Applique un patch sur des réglages existants, puis valide le résultat. */
export function applySettingsPatch(current: Settings, patch: SettingsPatch): Settings {
  return sanitizeSettings({
    ...current,
    general: { ...current.general, ...patch.general },
    appearance: { ...current.appearance, ...patch.appearance },
    window: { ...current.window, ...patch.window },
    plugins: { ...current.plugins, ...patch.plugins },
    apps: { ...current.apps, ...patch.apps }
  })
}

/**
 * Langue effective : celle choisie, ou la première langue du système prise en charge.
 * Anglais par défaut si aucune langue du système n'est prise en charge.
 */
export function resolveLanguage(setting: LanguageSetting, systemLanguages: string[]): Language {
  if (setting !== 'system') return setting
  for (const locale of systemLanguages) {
    const base = locale.toLowerCase().split('-')[0]
    const match = LANGUAGES.find((language) => language === base)
    if (match) return match
  }
  return 'en'
}

/** Couleur d'accent effective : celle choisie, ou celle de Windows, ou celle de la marque. */
export function resolveAccentColor(
  setting: AccentSetting,
  systemAccent: HexColor | null
): HexColor {
  if (setting !== 'system') return setting
  return systemAccent ?? BRAND_ACCENT
}
