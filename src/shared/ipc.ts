import type { HexColor } from './settings'

/**
 * Noms des canaux IPC (communication renderer <-> main).
 * Les centraliser ici évite les fautes de frappe entre les deux côtés.
 */
export const IpcChannels = {
  appGetInfo: 'app:get-info',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  /** Événement main -> renderer : les réglages ont changé. */
  settingsChanged: 'settings:changed',
  dashboardGet: 'dashboard:get',
  dashboardSave: 'dashboard:save',
  systemGetPreferences: 'system:get-preferences',
  /** Événement main -> renderer : une préférence de Windows a changé (ex. couleur d'accent). */
  systemPreferencesChanged: 'system:preferences-changed'
} as const

/** Informations sur l'application renvoyées par le processus principal. */
export interface AppInfo {
  name: string
  version: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
}

/** Préférences lues dans Windows, utilisées quand un réglage vaut « système ». */
export interface SystemPreferences {
  /** Langues préférées de l'utilisateur, par ordre de priorité (ex. `fr-FR`). */
  languages: string[]
  /** Couleur d'accent de Windows, ou `null` si elle n'est pas disponible. */
  accentColor: HexColor | null
}
