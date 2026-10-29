import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import { IpcChannels, type AppInfo, type LogName, type SystemPreferences } from '@shared/ipc'
import type { BrowserChoice, InstalledBrowser } from '@shared/browsers'
import type { Dashboard } from '@shared/dashboard'
import type {
  AudioFlow,
  AppAudio,
  AudioState,
  CalendarEventInput,
  CalendarState,
  ClipboardEntry,
  CurrencyRates,
  MediaCommand,
  MediaSession,
  Place,
  Screenshot,
  SystemStats,
  TopProcess,
  WeatherReport
} from '@shared/header-bar'
import type { AccountProviders, GoogleService } from '@shared/accounts'
import type { ExternalPlayer, LocalMediaFile } from '@shared/local-media'
import type { UpdateState } from '@shared/updates'
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
  DesktopAppTabDrag,
  DesktopAppSnapshot,
  DesktopAppState,
  HostRect,
  InstalledProgram
} from '@shared/desktop-apps'
import type { CustomSound, NotifyInput, TesseraNotification } from '@shared/notifications'
import type {
  InstalledModule,
  ModulePreview,
  ModuleSelection,
  UninstallOptions
} from '@shared/modules'
import type { PluginFileEntry } from '@shared/plugin-files'
import type { PluginPermission } from '@shared/plugins'
import type { LaunchOptions, PickedTarget, ProcessRun } from '@shared/plugin-processes'
import type { Settings, SettingsPatch } from '@shared/settings'
import { builtinsApi } from './builtins'
import { integrationsApi } from './integrations'

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
  logs: {
    read: (name: LogName): Promise<string> => ipcRenderer.invoke(IpcChannels.logsRead, name),
    openFolder: (): Promise<void> => ipcRenderer.invoke(IpcChannels.logsOpenFolder)
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
    /** Bloc resté vide : la fenêtre est vérifiée et remise dans son bloc. */
    refresh: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsRefresh, appId),
    capture: (): Promise<Record<string, DesktopAppSnapshot>> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsCapture),
    setSuspended: (value: boolean, reasons = ''): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsSetSuspended, value, reasons),
    /** Ligne du journal des applications installées (ce que montre un bloc…). */
    log: (message: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsLog, message),
    onChange: (callback: (appId: string, state: DesktopAppState) => void) => {
      const listener = (_event: IpcRendererEvent, appId: string, state: DesktopAppState): void =>
        callback(appId, state)
      ipcRenderer.on(IpcChannels.desktopAppsChanged, listener)
      return () => ipcRenderer.removeListener(IpcChannels.desktopAppsChanged, listener)
    },
    onReveal: (callback: (appId: string) => void) =>
      subscribe(IpcChannels.desktopAppsReveal, callback),
    onPan: (callback: (pan: DesktopAppPan) => void) =>
      subscribe(IpcChannels.desktopAppsPan, callback),
    /** La fenêtre de Tessera a bougé : une fenêtre étirée reprend la taille de son bloc. */
    onUnstretch: (callback: () => void) => subscribe(IpcChannels.desktopAppsUnstretch, callback),
    /** Molette au-dessus de la fenêtre d'un bloc (la page doit défiler). */
    onWheel: (callback: (event: { hostId: string; deltaY: number }) => void) =>
      subscribe(IpcChannels.desktopAppsWheel, callback),
    /** Clic dans l'application d'un bloc (`null` : la souris en est sortie). */
    onActivate: (callback: (hostId: string | null) => void) =>
      subscribe(IpcChannels.desktopAppsActivate, callback),
    /** Application insérée passée au premier plan (elle reçoit le clavier). */
    focus: (appId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.desktopAppsFocus, appId),
    /** Une application insérée passe en plein écran (vidéo…) ou en sort. */
    onFullScreen: (callback: (event: { appId: string; value: boolean }) => void) =>
      subscribe(IpcChannels.desktopAppsFullScreen, callback),
    /** Onglet de navigateur tiré par l'utilisateur (`null` : relâché). */
    onTabDrag: (callback: (drag: DesktopAppTabDrag | null) => void) =>
      subscribe(IpcChannels.desktopAppsTabDrag, callback)
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
    /** Notification de Tessera elle-même (fin du minuteur de la barre des pages…). */
    notifyTessera: (input: NotifyInput): Promise<TesseraNotification | null> =>
      ipcRenderer.invoke(IpcChannels.notificationsNotifyTessera, input),
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
  /** Vidéos et musiques du PC choisies par l'utilisateur (permission `videos`). */
  localMedia: {
    open: (pluginId: string): Promise<LocalMediaFile | null> =>
      ipcRenderer.invoke(IpcChannels.localMediaOpen, pluginId),
    /** Fichier déposé : son chemin est lu ici, la page ne peut pas en donner un autre. */
    addDropped: (pluginId: string, file: File): Promise<LocalMediaFile> =>
      ipcRenderer.invoke(IpcChannels.localMediaDropped, pluginId, webUtils.getPathForFile(file)),
    recent: (pluginId: string): Promise<LocalMediaFile[]> =>
      ipcRenderer.invoke(IpcChannels.localMediaRecent, pluginId),
    get: (pluginId: string, id: string): Promise<LocalMediaFile | null> =>
      ipcRenderer.invoke(IpcChannels.localMediaGet, pluginId, id),
    forget: (pluginId: string, id: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.localMediaForget, pluginId, id),
    savePosition: (id: string, position: number, duration: number): void =>
      ipcRenderer.send(IpcChannels.localMediaPosition, id, position, duration),
    hasVlc: (pluginId: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.localMediaHasVlc, pluginId),
    openExternally: (pluginId: string, id: string, position: number): Promise<ExternalPlayer> =>
      ipcRenderer.invoke(IpcChannels.localMediaOpenExternally, pluginId, id, position)
  },
  /** Modules tiers : installation, permissions accordées, mode développeur. */
  modules: {
    list: (): Promise<InstalledModule[]> => ipcRenderer.invoke(IpcChannels.modulesList),
    /** Lien demandé par un module : ouvert seulement si l'utilisateur accepte. */
    openLink: (pluginId: string, url: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.modulesOpenLink, pluginId, url),
    /** Fenêtre de Windows pour choisir un `.tessera` ; `null` si annulé. */
    pickPackage: (): Promise<ModulePreview | null> =>
      ipcRenderer.invoke(IpcChannels.modulesPickPackage),
    /** Paquet déposé sur la fenêtre : son chemin est lu ici. */
    previewFile: (file: File): Promise<ModulePreview> =>
      ipcRenderer.invoke(IpcChannels.modulesPreviewFile, webUtils.getPathForFile(file)),
    pickDevFolder: (): Promise<ModulePreview | null> =>
      ipcRenderer.invoke(IpcChannels.modulesPickDevFolder),
    /** Mode développeur : dossier de module déposé sur la page (son chemin est lu ici). */
    previewDevFolder: (folder: File): Promise<ModulePreview> =>
      ipcRenderer.invoke(IpcChannels.modulesPreviewDevFolder, webUtils.getPathForFile(folder)),
    install: (token: string, selection: ModuleSelection[]): Promise<InstalledModule[]> =>
      ipcRenderer.invoke(IpcChannels.modulesInstall, token, selection),
    cancel: (token: string): Promise<void> => ipcRenderer.invoke(IpcChannels.modulesCancel, token),
    uninstall: (id: string, options: UninstallOptions): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.modulesUninstall, id, options),
    setGranted: (id: string, granted: PluginPermission[]): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.modulesSetGranted, id, granted),
    reload: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannels.modulesReload, id),
    inspect: (): Promise<void> => ipcRenderer.invoke(IpcChannels.modulesInspect),
    onChange: (callback: (modules: InstalledModule[]) => void) =>
      subscribe(IpcChannels.modulesChanged, callback),
    /** Paquet ouvert depuis l'Explorateur (double-clic sur un `.tessera`), une seule fois. */
    takeOpened: (): Promise<ModulePreview | null> =>
      ipcRenderer.invoke(IpcChannels.modulesTakeOpened),
    /** Un paquet vient d'être ouvert : le récupérer avec `takeOpened`. */
    onOpened: (callback: () => void) => subscribe(IpcChannels.modulesOpened, callback)
  },
  /** Mises à jour automatiques de la version installée. */
  updates: {
    getState: (): Promise<UpdateState> => ipcRenderer.invoke(IpcChannels.updatesGetState),
    check: (): Promise<void> => ipcRenderer.invoke(IpcChannels.updatesCheck),
    install: (): Promise<void> => ipcRenderer.invoke(IpcChannels.updatesInstall),
    onChange: (callback: (state: UpdateState) => void) =>
      subscribe(IpcChannels.updatesChanged, callback)
  },
  /** Navigateurs installés sur le PC. */
  browsers: {
    list: (): Promise<InstalledBrowser[]> => ipcRenderer.invoke(IpcChannels.browsersList),
    open: (browserId: string, url: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.browsersOpen, browserId, url),
    /** Navigateurs installés, et l'application de Tessera qui affiche chacun. */
    choices: (): Promise<BrowserChoice[]> => ipcRenderer.invoke(IpcChannels.browsersChoices),
    /** Application installée qui affiche ce navigateur (créée au besoin). */
    appFor: (browserId: string): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.browsersAppFor, browserId),
    /** Page web dans le navigateur d'un bloc (sinon celui du PC) : application qui l'a reçue. */
    openPage: (url: string): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.browsersOpenPage, url)
  },
  /** Intégrations avec DevLauncher, GitSpread et Prospect Solution (permission `integrations`). */
  integrations: integrationsApi,
  /** Modules intégrés : fichiers, jeux, Git… */
  ...builtinsApi,
  /** Widgets de la barre des pages : météo, média, son, système, presse-papiers, capture… */
  headerBar: {
    searchPlaces: (query: string, language: string): Promise<Place[]> =>
      ipcRenderer.invoke(IpcChannels.headerBarSearchPlaces, query, language),
    weather: (latitude: number, longitude: number): Promise<WeatherReport> =>
      ipcRenderer.invoke(IpcChannels.headerBarWeather, latitude, longitude),
    rates: (): Promise<CurrencyRates> => ipcRenderer.invoke(IpcChannels.headerBarRates),
    /** Pipette : couleur choisie à l'écran (`#rrggbb`), `null` si annulé. */
    pickColor: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.headerBarPickColor),
    media: (): Promise<MediaSession | null> => ipcRenderer.invoke(IpcChannels.headerBarMedia),
    mediaCommand: (action: MediaCommand): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.headerBarMediaCommand, action),
    audio: (): Promise<AudioState> => ipcRenderer.invoke(IpcChannels.headerBarAudio),
    setVolume: (flow: AudioFlow, value: number): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.headerBarAudioVolume, flow, value),
    setMute: (flow: AudioFlow, value: boolean): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.headerBarAudioMute, flow, value),
    setAudioDevice: (id: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.headerBarAudioDevice, id),
    /** Programmes qui jouent du son, et leur volume. */
    appAudio: (): Promise<AppAudio[]> => ipcRenderer.invoke(IpcChannels.headerBarAppAudio),
    setAppVolume: (id: string, change: { volume?: number; muted?: boolean }): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.headerBarAppVolume, id, change),
    system: (network: boolean): Promise<SystemStats> =>
      ipcRenderer.invoke(IpcChannels.headerBarSystem, network),
    topProcesses: (sort: 'cpu' | 'memory'): Promise<TopProcess[]> =>
      ipcRenderer.invoke(IpcChannels.headerBarTopProcesses, sort),
    clipboard: {
      list: (): Promise<ClipboardEntry[]> => ipcRenderer.invoke(IpcChannels.headerBarClipboardList),
      copy: (id: string): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarClipboardCopy, id),
      pin: (id: string, pinned: boolean): Promise<boolean> =>
        ipcRenderer.invoke(IpcChannels.headerBarClipboardPin, id, pinned),
      remove: (id: string): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarClipboardRemove, id),
      clear: (): Promise<void> => ipcRenderer.invoke(IpcChannels.headerBarClipboardClear),
      onChange: (callback: (entries: ClipboardEntry[]) => void) =>
        subscribe(IpcChannels.headerBarClipboardChanged, callback)
    },
    screenshot: {
      windowsTool: (): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotWindowsTool),
      capture: (mode: 'region' | 'screen'): Promise<Screenshot | null> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotCapture, mode),
      windows: (): Promise<{ id: string; name: string; preview: string }[]> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotWindows),
      captureWindow: (id: string): Promise<Screenshot | null> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotCaptureWindow, id),
      recent: (): Promise<Screenshot[]> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotRecent),
      open: (path: string): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotOpen, path),
      show: (path: string): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotShow, path),
      copy: (path: string): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotCopy, path),
      openFolder: (): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotOpenFolder),
      pickFolder: (): Promise<string | null> =>
        ipcRenderer.invoke(IpcChannels.headerBarScreenshotPickFolder),
      /** À appeler au début du glissement (`dragstart`). */
      drag: (path: string): void => ipcRenderer.send(IpcChannels.headerBarScreenshotDrag, path)
    }
  },
  /** Fenêtre de Tessera : plein écran (comme F11). */
  window: {
    isFullScreen: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.windowIsFullScreen),
    toggleFullScreen: (): Promise<void> => ipcRenderer.invoke(IpcChannels.windowToggleFullScreen),
    /** Vidéo en plein écran : Tessera reste en plein écran, puis revient à son état d'avant. */
    holdFullScreen: (value: boolean): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.windowHoldFullScreen, value === true),
    onFullScreenChange: (callback: (fullScreen: boolean) => void) =>
      subscribe(IpcChannels.windowFullScreenChanged, callback)
  },
  /** Vidéo en plein écran : interrupteur de la molette (Page / Vidéo) affiché par-dessus. */
  videoStage: {
    set: (active: boolean): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.videoStageSet, active === true),
    /** Clic molette : la molette bascule entre la page et la vidéo. */
    toggleWheel: (): Promise<void> => ipcRenderer.invoke(IpcChannels.videoStageToggleWheel)
  },
  calendar: {
    get: (force = false): Promise<CalendarState> =>
      ipcRenderer.invoke(IpcChannels.calendarGet, force),
    disconnect: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.calendarDisconnect, accountId),
    /** Crée ou modifie un événement ; renvoie l'agenda à jour. */
    saveEvent: (input: CalendarEventInput): Promise<CalendarState> =>
      ipcRenderer.invoke(IpcChannels.calendarSaveEvent, input),
    /** `series` : toute la série d'une occurrence (`recurringEventId`). */
    deleteEvent: (
      accountId: string,
      calendarId: string,
      eventId: string,
      scope?: 'occurrence' | 'series',
      recurringEventId?: string
    ): Promise<CalendarState> =>
      ipcRenderer.invoke(
        IpcChannels.calendarDeleteEvent,
        accountId,
        calendarId,
        eventId,
        scope,
        recurringEventId
      )
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
