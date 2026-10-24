/**
 * Schéma des réglages de l'application, partagé entre main (stockage) et renderer (affichage).
 * Toute valeur lue sur le disque passe par `sanitizeSettings` : un fichier abîmé ou d'une
 * ancienne version ne peut donc jamais casser l'app, les valeurs invalides reprennent leur défaut.
 */

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  sanitizeNotificationSettings,
  type NotificationSettings
} from './notifications'
import { QUIT_MODES, type QuitMode } from './desktop-apps'
import { DEFAULT_MAIL_SETTINGS, sanitizeMailSettings, type MailSettings } from './mail'
import { DEFAULT_MEDIA_SETTINGS, sanitizeMediaSettings, type MediaSettings } from './media'
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
    /** Mode développeur : charger un module depuis un dossier, rechargé à chaque construction. */
    developerMode: boolean
  }
  apps: {
    /** Applications web et installées (Discord…), dans l'ordre du menu latéral. */
    items: UserApp[]
    /** À la fermeture de Tessera : fermer les applications installées, ou les rendre au bureau. */
    onQuit: QuitMode
  }
  /** Notifications : bannières, sons, Ne pas déranger, réglages par source. */
  notifications: NotificationSettings
  /** Mails : identifiant de connexion Google, comptes, vérification. */
  mail: MailSettings
  /** YouTube et Twitch : comptes connectés, application Twitch, vérification des directs. */
  media: MediaSettings
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
    disabled: [],
    developerMode: false
  },
  apps: {
    items: [],
    onQuit: 'close'
  },
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  mail: DEFAULT_MAIL_SETTINGS,
  media: DEFAULT_MEDIA_SETTINGS
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
        : defaults.plugins.disabled,
      developerMode:
        typeof plugins.developerMode === 'boolean'
          ? plugins.developerMode
          : defaults.plugins.developerMode
    },
    apps: {
      items: sanitizeUserApps(asRecord(root.apps).items),
      onQuit: pick(asRecord(root.apps).onQuit, QUIT_MODES, defaults.apps.onQuit)
    },
    notifications: sanitizeNotificationSettings(root.notifications),
    mail: sanitizeMailSettings(root.mail),
    media: sanitizeMediaSettings(root.media)
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
    apps: { ...current.apps, ...patch.apps },
    notifications: { ...current.notifications, ...patch.notifications },
    mail: { ...current.mail, ...patch.mail },
    media: { ...current.media, ...patch.media }
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
