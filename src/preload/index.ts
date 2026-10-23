import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannels, type AppInfo, type SystemPreferences } from '@shared/ipc'
import type { InstalledBrowser } from '@shared/browsers'
import type { Dashboard } from '@shared/dashboard'
import type { AccountProviders, GoogleService } from '@shared/accounts'
import type {
  MediaStatus,
  TwitchChannel,
  TwitchStream,
  YouTubePlaylist,
  YouTubeSearch,
  YouTubeVideo
} from '@shared/media'
import type {
  ImapAccountInput,
  MailAccount,
  MailAccountState,
  MailAction,
  MailDraft,
  MailFolder,
  MailMessage,
  MailPage,
  MailQuery,
  MailUpload
} from '@shared/mail'
import type {
  DesktopApp,
  DesktopAppPan,
  DesktopAppSnapshot,
  DesktopAppState,
  HostRect,
  InstalledProgram
} from '@shared/desktop-apps'
import type { CustomSound, NotifyInput, TesseraNotification } from '@shared/notifications'
import type { PluginFileEntry } from '@shared/plugin-files'
import type { LaunchOptions, PickedTarget, ProcessRun } from '@shared/plugin-processes'
import type { Settings, SettingsPatch } from '@shared/settings'

/** S'abonne à un événement envoyé par le processus principal. Renvoie la fonction de désabonnement. */
function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

/**
 * API exposée à l'interface sous `window.tessera`.
 * C'est le seul point de passage entre React et le système :
 * chaque fonction ici correspond à un canal IPC géré par le processus principal.
 */
const api = {
  app: {
    getInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IpcChannels.appGetInfo)
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(IpcChannels.settingsGet),
    update: (patch: SettingsPatch): Promise<Settings> =>
      ipcRenderer.invoke(IpcChannels.settingsUpdate, patch),
    onChange: (callback: (settings: Settings) => void) =>
      subscribe(IpcChannels.settingsChanged, callback)
  },
  dashboard: {
    get: (): Promise<Dashboard> => ipcRenderer.invoke(IpcChannels.dashboardGet),
    save: (dashboard: Dashboard): Promise<Dashboard> =>
      ipcRenderer.invoke(IpcChannels.dashboardSave, dashboard)
  },
  /** Fichiers des extensions (le processus principal vérifie leurs permissions). */
  pluginFiles: {
    list: (pluginId: string): Promise<PluginFileEntry[]> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesList, pluginId),
    read: (pluginId: string, name: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesRead, pluginId, name),
    write: (pluginId: string, name: string, content: string): Promise<PluginFileEntry> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesWrite, pluginId, name, content),
    rename: (pluginId: string, from: string, to: string): Promise<PluginFileEntry> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesRename, pluginId, from, to),
    trash: (pluginId: string, name: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesTrash, pluginId, name),
    openFolder: (pluginId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesOpenFolder, pluginId),
    importFiles: (pluginId: string, extensions: string[]): Promise<PluginFileEntry[]> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesImport, pluginId, extensions),
    getFolder: (pluginId: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.pluginFilesGetFolder, pluginId),
    onChange: (callback: (pluginId: string) => void) =>
      subscribe(IpcChannels.pluginFilesChanged, callback)
  },
  /** Programmes lancés par les extensions (le processus principal vérifie leurs permissions). */
  processes: {
    pick: (pluginId: string): Promise<PickedTarget | null> =>
      ipcRenderer.invoke(IpcChannels.processesPick, pluginId),
    start: (pluginId: string, owner: string, options: LaunchOptions): Promise<ProcessRun> =>
      ipcRenderer.invoke(IpcChannels.processesStart, pluginId, owner, options),
    stop: (pluginId: string, runId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.processesStop, pluginId, runId),
    list: (pluginId: string): Promise<ProcessRun[]> =>
      ipcRenderer.invoke(IpcChannels.processesList, pluginId),
    getOutput: (pluginId: string, runId: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.processesGetOutput, pluginId, runId),
    clearOutput: (pluginId: string, runId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.processesClearOutput, pluginId, runId),
    getIcon: (pluginId: string, path: string): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.processesGetIcon, pluginId, path),
    showInFolder: (pluginId: string, path: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.processesShowInFolder, pluginId, path),
    isRunning: (pluginId: string, path: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.processesIsRunning, pluginId, path),
    onChange: (callback: (pluginId: string, run: ProcessRun) => void) => {
      const listener = (_event: IpcRendererEvent, pluginId: string, run: ProcessRun): void =>
        callback(pluginId, run)
      ipcRenderer.on(IpcChannels.processesChanged, listener)
      return () => ipcRenderer.removeListener(IpcChannels.processesChanged, listener)
    },
    onOutput: (callback: (pluginId: string, runId: string, text: string) => void) => {
      const listener = (
        _event: IpcRendererEvent,
        pluginId: string,
        runId: string,
        text: string
      ): void => callback(pluginId, runId, text)
      ipcRenderer.on(IpcChannels.processesOutput, listener)
      return () => ipcRenderer.removeListener(IpcChannels.processesOutput, listener)
    }
  },
  /** Applications web (onglets) : icônes et données de session. */
  web: {
    fetchIcon: (url: string): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.webFetchIcon, url),
    clearAppData: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.webClearAppData, appId),
    resetPermissions: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.webResetPermissions, appId)
  },
  /** Applications installées : ajout, et fenêtres affichées dans les blocs et onglets. */
  desktopApps: {
    listPrograms: (): Promise<InstalledProgram[]> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsListPrograms),
    addProgram: (key: string): Promise<DesktopApp | null> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsAddProgram, key),
    pick: (): Promise<DesktopApp | null> => ipcRenderer.invoke(IpcChannels.desktopAppsPick),
    getStates: (): Promise<Record<string, DesktopAppState>> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsGetStates),
    attach: (hostId: string, appId: string, rect: HostRect | null): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsAttach, hostId, appId, rect),
    move: (hostId: string, rect: HostRect | null): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsMove, hostId, rect),
    detach: (hostId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsDetach, hostId),
    launch: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsLaunch, appId),
    close: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsClose, appId),
    takeOut: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsTakeOut, appId),
    capture: (): Promise<Record<string, DesktopAppSnapshot>> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsCapture),
    setSuspended: (value: boolean): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsSetSuspended, value),
    onChange: (callback: (appId: string, state: DesktopAppState) => void) => {
      const listener = (_event: IpcRendererEvent, appId: string, state: DesktopAppState): void =>
        callback(appId, state)
      ipcRenderer.on(IpcChannels.desktopAppsChanged, listener)
      return () => ipcRenderer.removeListener(IpcChannels.desktopAppsChanged, listener)
    },
    onReveal: (callback: (appId: string) => void) =>
      subscribe(IpcChannels.desktopAppsReveal, callback),
    onPan: (callback: (pan: DesktopAppPan) => void) =>
      subscribe(IpcChannels.desktopAppsPan, callback)
  },
  /** Notifications : centre, test, sons importés, envoi par les widgets et modules. */
  notifications: {
    list: (): Promise<TesseraNotification[]> => ipcRenderer.invoke(IpcChannels.notificationsList),
    markRead: (ids: string[] | 'all'): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.notificationsMarkRead, ids),
    remove: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannels.notificationsRemove, id),
    clear: (): Promise<void> => ipcRenderer.invoke(IpcChannels.notificationsClear),
    activate: (id: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.notificationsActivate, id),
    test: (): Promise<TesseraNotification | null> =>
      ipcRenderer.invoke(IpcChannels.notificationsTest),
    notify: (pluginId: string, input: NotifyInput): Promise<TesseraNotification | null> =>
      ipcRenderer.invoke(IpcChannels.notificationsNotify, pluginId, input),
    importSound: (): Promise<CustomSound | null> =>
      ipcRenderer.invoke(IpcChannels.notificationsImportSound),
    deleteSound: (id: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.notificationsDeleteSound, id),
    getSound: (sound: string): Promise<Uint8Array | null> =>
      ipcRenderer.invoke(IpcChannels.notificationsGetSound, sound),
    /** Bannières bloquées par Windows (notifications désactivées dans ses paramètres). */
    bannersBlocked: (): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.notificationsBannersBlocked),
    openSystemSettings: (): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.notificationsOpenSystemSettings),
    onChange: (callback: (notifications: TesseraNotification[]) => void) =>
      subscribe(IpcChannels.notificationsChanged, callback),
    onPlay: (callback: (sound: string, volume: number) => void) => {
      const listener = (_event: IpcRendererEvent, sound: string, volume: number): void =>
        callback(sound, volume)
      ipcRenderer.on(IpcChannels.notificationsPlay, listener)
      return () => ipcRenderer.removeListener(IpcChannels.notificationsPlay, listener)
    },
    onActivated: (callback: (notification: TesseraNotification) => void) =>
      subscribe(IpcChannels.notificationsActivated, callback)
  },
  /** Comptes : « Se connecter avec Google / Twitch » (Paramètres → Comptes). */
  accounts: {
    providers: (): Promise<AccountProviders> => ipcRenderer.invoke(IpcChannels.accountsProviders),
    connectGoogle: (
      services: GoogleService[]
    ): Promise<{ email: string; services: GoogleService[] }> =>
      ipcRenderer.invoke(IpcChannels.accountsConnectGoogle, services),
    connectTwitch: (): Promise<void> => ipcRenderer.invoke(IpcChannels.accountsConnectTwitch),
    /** Annule la connexion en cours (page de connexion laissée ouverte). */
    cancel: (): Promise<void> => ipcRenderer.invoke(IpcChannels.mailCancelConnect)
  },
  /** Mails : comptes (Paramètres) et mails des widgets (permission `mail`). */
  mail: {
    getConfig: (): Promise<{ googleSecretSet: boolean }> =>
      ipcRenderer.invoke(IpcChannels.mailGetConfig),
    setGoogleSecret: (secret: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailSetGoogleSecret, secret),
    cancelConnect: (): Promise<void> => ipcRenderer.invoke(IpcChannels.mailCancelConnect),
    addImap: (input: ImapAccountInput, reconnectId?: string): Promise<MailAccount> =>
      ipcRenderer.invoke(IpcChannels.mailAddImap, input, reconnectId),
    removeAccount: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailRemoveAccount, accountId),
    getStates: (): Promise<Record<string, MailAccountState>> =>
      ipcRenderer.invoke(IpcChannels.mailGetStates),
    folders: (pluginId: string, accountId: string): Promise<MailFolder[]> =>
      ipcRenderer.invoke(IpcChannels.mailFolders, pluginId, accountId),
    list: (
      pluginId: string,
      accountId: string,
      query: MailQuery,
      page: string | null
    ): Promise<MailPage> =>
      ipcRenderer.invoke(IpcChannels.mailList, pluginId, accountId, query, page),
    get: (pluginId: string, accountId: string, id: string): Promise<MailMessage> =>
      ipcRenderer.invoke(IpcChannels.mailGet, pluginId, accountId, id),
    act: (pluginId: string, accountId: string, id: string, action: MailAction): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailAct, pluginId, accountId, id, action),
    send: (pluginId: string, accountId: string, draft: MailDraft): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailSend, pluginId, accountId, draft),
    pickUploads: (pluginId: string): Promise<MailUpload[]> =>
      ipcRenderer.invoke(IpcChannels.mailPickUploads, pluginId),
    saveAttachment: (
      pluginId: string,
      accountId: string,
      id: string,
      index: number
    ): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.mailSaveAttachment, pluginId, accountId, id, index),
    checkNow: (pluginId: string, accountId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailCheckNow, pluginId, accountId),
    reconnect: (pluginId: string, accountId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailReconnect, pluginId, accountId),
    openLink: (pluginId: string, url: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mailOpenLink, pluginId, url),
    onChange: (callback: (accountId: string, state: MailAccountState, fresh: boolean) => void) => {
      const listener = (
        _event: IpcRendererEvent,
        accountId: string,
        state: MailAccountState,
        fresh: boolean
      ): void => callback(accountId, state, fresh)
      ipcRenderer.on(IpcChannels.mailChanged, listener)
      return () => ipcRenderer.removeListener(IpcChannels.mailChanged, listener)
    }
  },
  /** YouTube et Twitch : comptes (Paramètres) et données des widgets (permission `media`). */
  media: {
    getStatus: (): Promise<MediaStatus> => ipcRenderer.invoke(IpcChannels.mediaGetStatus),
    disconnect: (service: 'youtube' | 'twitch', accountId?: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.mediaDisconnect, service, accountId),
    youtubeFeed: (pluginId: string, accountId: string, refresh: boolean): Promise<YouTubeVideo[]> =>
      ipcRenderer.invoke(IpcChannels.mediaYoutubeFeed, pluginId, accountId, refresh),
    youtubePlaylists: (pluginId: string, accountId: string): Promise<YouTubePlaylist[]> =>
      ipcRenderer.invoke(IpcChannels.mediaYoutubePlaylists, pluginId, accountId),
    youtubePlaylist: (pluginId: string, accountId: string, id: string): Promise<YouTubeVideo[]> =>
      ipcRenderer.invoke(IpcChannels.mediaYoutubePlaylist, pluginId, accountId, id),
    youtubeSearch: (
      pluginId: string,
      accountId: string,
      query: string,
      page: string | null
    ): Promise<YouTubeSearch> =>
      ipcRenderer.invoke(IpcChannels.mediaYoutubeSearch, pluginId, accountId, query, page),
    twitchSearch: (pluginId: string, query: string): Promise<TwitchChannel[]> =>
      ipcRenderer.invoke(IpcChannels.mediaTwitchSearch, pluginId, query),
    twitchLive: (pluginId: string): Promise<TwitchStream[]> =>
      ipcRenderer.invoke(IpcChannels.mediaTwitchLive, pluginId),
    twitchRefresh: (pluginId: string): Promise<TwitchStream[]> =>
      ipcRenderer.invoke(IpcChannels.mediaTwitchRefresh, pluginId),
    onStatus: (callback: (status: MediaStatus) => void) =>
      subscribe(IpcChannels.mediaStatusChanged, callback),
    onLive: (callback: (streams: TwitchStream[]) => void) =>
      subscribe(IpcChannels.mediaLiveChanged, callback)
  },
  /** Navigateurs installés sur le PC. */
  browsers: {
    list: (): Promise<InstalledBrowser[]> => ipcRenderer.invoke(IpcChannels.browsersList),
    open: (browserId: string, url: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.browsersOpen, browserId, url)
  },
  system: {
    getPreferences: (): Promise<SystemPreferences> =>
      ipcRenderer.invoke(IpcChannels.systemGetPreferences),
    onPreferencesChange: (callback: (preferences: SystemPreferences) => void) =>
      subscribe(IpcChannels.systemPreferencesChanged, callback)
  }
}

export type TesseraApi = typeof api

contextBridge.exposeInMainWorld('tessera', api)
