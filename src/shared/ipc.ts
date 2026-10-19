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
  pluginFilesList: 'plugin-files:list',
  pluginFilesRead: 'plugin-files:read',
  pluginFilesWrite: 'plugin-files:write',
  pluginFilesRename: 'plugin-files:rename',
  pluginFilesTrash: 'plugin-files:trash',
  pluginFilesOpenFolder: 'plugin-files:open-folder',
  pluginFilesGetFolder: 'plugin-files:get-folder',
  pluginFilesImport: 'plugin-files:import',
  /** Événement main -> renderer : le dossier d'une extension a changé (identifiant en argument). */
  pluginFilesChanged: 'plugin-files:changed',
  processesPick: 'processes:pick',
  processesStart: 'processes:start',
  processesStop: 'processes:stop',
  processesList: 'processes:list',
  processesGetOutput: 'processes:get-output',
  processesClearOutput: 'processes:clear-output',
  processesGetIcon: 'processes:get-icon',
  processesShowInFolder: 'processes:show-in-folder',
  processesIsRunning: 'processes:is-running',
  /** Événement main -> renderer : une exécution a changé d'état (extension, exécution). */
  processesChanged: 'processes:changed',
  /** Événement main -> renderer : nouvelle sortie console (extension, exécution, texte). */
  processesOutput: 'processes:output',
  webFetchIcon: 'web:fetch-icon',
  webClearAppData: 'web:clear-app-data',
  webResetPermissions: 'web:reset-permissions',
  desktopAppsListPrograms: 'desktop-apps:list-programs',
  desktopAppsAddProgram: 'desktop-apps:add-program',
  desktopAppsPick: 'desktop-apps:pick',
  desktopAppsGetStates: 'desktop-apps:get-states',
  desktopAppsAttach: 'desktop-apps:attach',
  desktopAppsMove: 'desktop-apps:move',
  desktopAppsDetach: 'desktop-apps:detach',
  desktopAppsLaunch: 'desktop-apps:launch',
  desktopAppsRelease: 'desktop-apps:release',
  desktopAppsCapture: 'desktop-apps:capture',
  desktopAppsSetSuspended: 'desktop-apps:set-suspended',
  /** Événement main -> renderer : état d'une application installée (identifiant, état). */
  desktopAppsChanged: 'desktop-apps:changed',
  /** Événement main -> renderer : une application demande à s'afficher (identifiant). */
  desktopAppsReveal: 'desktop-apps:reveal',
  notificationsList: 'notifications:list',
  notificationsMarkRead: 'notifications:mark-read',
  notificationsRemove: 'notifications:remove',
  notificationsClear: 'notifications:clear',
  notificationsActivate: 'notifications:activate',
  notificationsTest: 'notifications:test',
  notificationsNotify: 'notifications:notify',
  notificationsImportSound: 'notifications:import-sound',
  notificationsDeleteSound: 'notifications:delete-sound',
  notificationsGetSound: 'notifications:get-sound',
  notificationsBannersBlocked: 'notifications:banners-blocked',
  notificationsOpenSystemSettings: 'notifications:open-system-settings',
  /** Événement main -> renderer : l'historique des notifications a changé. */
  notificationsChanged: 'notifications:changed',
  /** Événement main -> renderer : son à jouer (son, volume). */
  notificationsPlay: 'notifications:play',
  /** Événement main -> renderer : clic sur une bannière (notification). */
  notificationsActivated: 'notifications:activated',
  browsersList: 'browsers:list',
  browsersOpen: 'browsers:open',
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
