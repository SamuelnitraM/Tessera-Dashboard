import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { APP_NAME } from '@shared/app'
import { IpcChannels, LOG_NAMES, type AppInfo, type LogName } from '@shared/ipc'
import type { LaunchOptions } from '@shared/plugin-processes'
import type { HostRect } from '@shared/desktop-apps'
import type { SettingsPatch } from '@shared/settings'
import {
  browserAppFor,
  listBrowserChoices,
  listBrowsers,
  openInBrowser,
  openWebPage
} from './browsers'
import { registerHeaderBarHandlers } from './headerbar/ipc'
import { errorText } from './i18n'
import { registerModuleHandlers } from './modules'
import {
  getTesseraWindows,
  holdFullScreen,
  isFullScreen,
  tesseraWindowOf,
  toggleFullScreen
} from './window'
import { setVideoStage, toggleVideoWheel } from './video-stage'
import { getDashboard, saveDashboard } from './dashboard-store'
import {
  attachHost,
  captureApps,
  detachHost,
  getAppStates,
  closeApp,
  launchApp,
  moveHost,
  refreshApp,
  setHoles,
  setSuspended,
  takeOutApp,
  focusApp
} from './desktop/docking'
import { logDocking, openLogsFolder, readLog } from './log'
import { addProgram, listPrograms, pickProgram, protectDesktopApps } from './desktop/programs'
import {
  activateNotification,
  areBannersBlocked,
  clearNotifications,
  deleteSound,
  getNotifications,
  getSoundData,
  importSound,
  markRead,
  notifyFromPlugin,
  notifyFromTessera,
  openSystemNotificationSettings,
  removeNotification,
  sendTestNotification
} from './notifications'
import { openInApp, openOutside, resolveOpenTarget } from './open-in-tessera'
import type { NotifyInput } from '@shared/notifications'
import {
  getPluginFolder,
  importPluginFiles,
  listFiles,
  openPluginFolder,
  readPluginFile,
  renamePluginFile,
  trashPluginFile,
  writePluginFile
} from './plugins/files'
import {
  clearRunOutput,
  getRunOutput,
  getTargetIcon,
  isTargetRunning,
  listRuns,
  pickTarget,
  showTargetInFolder,
  startProcess,
  stopProcess
} from './plugins/processes'
import {
  actOnMessage,
  addImapAccount,
  cancelConnect,
  checkNow,
  getAccountStates,
  getMailConfig,
  getMessage,
  listFolders,
  listMessages,
  markMessageRead,
  openMailLink,
  pickUploads,
  protectMailAccounts,
  removeAccount,
  openAttachment,
  saveAttachment,
  sendMessage,
  setGoogleClientSecret
} from './mail'
import type { ImapAccountInput, MailAction, MailDraft, MailQuery } from '@shared/mail'
import {
  disconnectMedia,
  getMediaStatus,
  protectMediaAccounts,
  twitchLive,
  twitchRefresh,
  twitchSearch,
  youtubeFeed,
  youtubePlaylist,
  youtubeSearch,
  youtubePlaylists
} from './media'
import type { GoogleService } from '@shared/accounts'
import { connectGoogle, connectTwitch, getAccountProviders, reconnectMailAccount } from './accounts'
import { getSettings, updateSettings } from './settings-store'
import { takeOpenedPackage } from './startup'
import { checkForUpdates, getUpdateState, installUpdate } from './updater'
import {
  addDroppedMedia,
  forgetLocalMedia,
  getLocalMedia,
  hasVlc,
  openLocalMedia,
  openLocalMediaExternally,
  recentLocalMedia,
  saveLocalMediaPosition
} from './media/local'
import { openModuleLink } from './plugins/module-links'
import {
  cancelPreview,
  installPreview,
  listModules,
  previewDevFolder,
  previewDevPath,
  previewPackage,
  reloadModule,
  setGrantedPermissions,
  uninstallModule
} from './plugins/modules'
import {
  MODULE_PACKAGE_EXTENSION,
  type ModulePreview,
  type ModuleSelection,
  type UninstallOptions
} from '@shared/modules'
import { getTranslation } from './i18n'
import type { PluginPermission } from '@shared/plugins'
import { getSystemPreferences } from './system'
import { registerIntegrationHandlers } from './plugins/integrations'
import { clearAppData, fetchSiteIcon, resetAppPermissions } from './web'

/** Fenêtre de Windows pour choisir un paquet `.tessera`, puis aperçu de son contenu. */
async function pickModulePackage(window: BrowserWindow | null): Promise<ModulePreview | null> {
  const options: Electron.OpenDialogOptions = {
    title: getTranslation().settings.extensions.install.pickTitle,
    properties: ['openFile'],
    filters: [{ name: 'Tessera', extensions: [MODULE_PACKAGE_EXTENSION] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const path = result.filePaths[0]
  return result.canceled || !path ? null : previewPackage(path)
}

/** Enregistre les réponses du processus principal aux demandes du renderer. */
export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.appGetInfo, (): AppInfo => {
    return {
      name: APP_NAME,
      version: app.getVersion(),
      versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
      }
    }
  })

  ipcMain.handle(IpcChannels.logsRead, (_event, name: unknown) =>
    (LOG_NAMES as readonly unknown[]).includes(name) ? readLog(name as LogName) : ''
  )
  ipcMain.handle(IpcChannels.logsOpenFolder, () => openLogsFolder())

  ipcMain.handle(IpcChannels.settingsGet, () => getSettings())

  // Le patch vient de l'interface : il est entièrement revalidé par `updateSettings`, et ne
  // peut pas changer le programme lancé par une application installée
  ipcMain.handle(IpcChannels.settingsUpdate, (_event, patch: SettingsPatch) =>
    updateSettings(protectMediaAccounts(protectMailAccounts(protectDesktopApps(patch))))
  )

  ipcMain.handle(IpcChannels.dashboardGet, () => getDashboard())

  // Comme les réglages, le tableau de bord reçu est entièrement revalidé avant sauvegarde. Les
  // autres fenêtres reçoivent la nouvelle version (sans quoi leur prochaine sauvegarde, faite
  // avec l'ancienne, effacerait ce changement).
  ipcMain.handle(IpcChannels.dashboardSave, (event, dashboard: unknown) => {
    const saved = saveDashboard(dashboard)
    for (const window of getTesseraWindows()) {
      if (window.webContents !== event.sender && !window.isDestroyed()) {
        window.webContents.send(IpcChannels.dashboardChanged, saved)
      }
    }
    return saved
  })

  // Fichiers des extensions : chaque opération vérifie la permission de l'extension
  ipcMain.handle(IpcChannels.pluginFilesList, (_event, pluginId: string) => listFiles(pluginId))
  ipcMain.handle(IpcChannels.pluginFilesRead, (_event, pluginId: string, name: string) =>
    readPluginFile(pluginId, name)
  )
  ipcMain.handle(
    IpcChannels.pluginFilesWrite,
    (_event, pluginId: string, name: string, content: string) =>
      writePluginFile(pluginId, name, content)
  )
  ipcMain.handle(
    IpcChannels.pluginFilesRename,
    (_event, pluginId: string, from: string, to: string) => renamePluginFile(pluginId, from, to)
  )
  ipcMain.handle(IpcChannels.pluginFilesTrash, (_event, pluginId: string, name: string) =>
    trashPluginFile(pluginId, name)
  )
  ipcMain.handle(IpcChannels.pluginFilesOpenFolder, (_event, pluginId: string) =>
    openPluginFolder(pluginId)
  )
  ipcMain.handle(IpcChannels.pluginFilesImport, (event, pluginId: string, extensions: unknown) =>
    importPluginFiles(pluginId, BrowserWindow.fromWebContents(event.sender), extensions)
  )
  ipcMain.handle(IpcChannels.pluginFilesGetFolder, (_event, pluginId: string) =>
    getPluginFolder(pluginId)
  )

  // Programmes des extensions : seuls ceux choisis par l'utilisateur peuvent être lancés
  ipcMain.handle(IpcChannels.processesPick, (event, pluginId: string) =>
    pickTarget(pluginId, BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle(
    IpcChannels.processesStart,
    (_event, pluginId: string, owner: string, options: LaunchOptions) =>
      startProcess(pluginId, owner, options)
  )
  ipcMain.handle(IpcChannels.processesStop, (_event, pluginId: string, runId: string) =>
    stopProcess(pluginId, runId)
  )
  ipcMain.handle(IpcChannels.processesList, (_event, pluginId: string) => listRuns(pluginId))
  ipcMain.handle(IpcChannels.processesGetOutput, (_event, pluginId: string, runId: string) =>
    getRunOutput(pluginId, runId)
  )
  ipcMain.handle(IpcChannels.processesClearOutput, (_event, pluginId: string, runId: string) =>
    clearRunOutput(pluginId, runId)
  )
  ipcMain.handle(IpcChannels.processesGetIcon, (_event, pluginId: string, path: string) =>
    getTargetIcon(pluginId, path)
  )
  ipcMain.handle(IpcChannels.processesShowInFolder, (_event, pluginId: string, path: string) =>
    showTargetInFolder(pluginId, path)
  )
  ipcMain.handle(IpcChannels.processesIsRunning, (_event, pluginId: string, path: string) =>
    isTargetRunning(pluginId, path)
  )

  // Applications web
  ipcMain.handle(IpcChannels.webFetchIcon, (_event, url: string) => fetchSiteIcon(url))
  ipcMain.handle(IpcChannels.webClearAppData, (_event, appId: string) => clearAppData(appId))
  ipcMain.handle(IpcChannels.webResetPermissions, (_event, appId: string) =>
    resetAppPermissions(appId)
  )

  // Applications installées : ajout (menu Démarrer ou .exe) et fenêtres affichées dans Tessera
  ipcMain.handle(IpcChannels.desktopAppsListPrograms, () => listPrograms())
  ipcMain.handle(IpcChannels.desktopAppsAddProgram, (_event, key: string) => addProgram(key))
  ipcMain.handle(IpcChannels.desktopAppsPick, (event) =>
    pickProgram(BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle(IpcChannels.desktopAppsGetStates, () => getAppStates())
  ipcMain.handle(
    IpcChannels.desktopAppsAttach,
    (event, hostId: string, appId: string, rect: HostRect | null) => {
      const window = tesseraWindowOf(event.sender)
      if (window) attachHost(window, hostId, appId, rect)
    }
  )
  ipcMain.handle(IpcChannels.desktopAppsMove, (_event, hostId: string, rect: HostRect | null) =>
    moveHost(hostId, rect)
  )
  ipcMain.handle(IpcChannels.desktopAppsDetach, (_event, hostId: string) => detachHost(hostId))
  ipcMain.handle(IpcChannels.desktopAppsLaunch, (_event, appId: string) => launchApp(appId))
  ipcMain.handle(IpcChannels.desktopAppsClose, (_event, appId: string) => closeApp(appId))
  ipcMain.handle(IpcChannels.desktopAppsTakeOut, (_event, appId: string) => takeOutApp(appId))
  ipcMain.handle(IpcChannels.desktopAppsRefresh, (_event, appId: string) => refreshApp(appId))
  ipcMain.handle(IpcChannels.desktopAppsFocus, (_event, appId: string) => focusApp(String(appId)))
  ipcMain.handle(IpcChannels.desktopAppsCapture, () => captureApps())
  ipcMain.handle(IpcChannels.desktopAppsSetHoles, (event, holes: unknown, names: unknown) => {
    const window = tesseraWindowOf(event.sender)
    if (!window) return
    const number = (value: unknown): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : 0
    const rects = (Array.isArray(holes) ? holes : []).slice(0, 20).map((hole) => {
      const item = (hole ?? {}) as Record<string, unknown>
      return {
        x: number(item.x),
        y: number(item.y),
        width: Math.max(0, number(item.width)),
        height: Math.max(0, number(item.height)),
        radius: Math.max(0, Math.min(64, number(item.radius)))
      }
    })
    setHoles(window, rects, typeof names === 'string' ? names.slice(0, 300) : '')
  })
  ipcMain.handle(IpcChannels.desktopAppsSetSuspended, (event, value: boolean, reasons: unknown) => {
    const window = tesseraWindowOf(event.sender)
    if (window) {
      setSuspended(window, value === true, typeof reasons === 'string' ? reasons.slice(0, 300) : '')
    }
  })
  ipcMain.handle(IpcChannels.desktopAppsLog, (_event, message: unknown) => {
    if (typeof message === 'string') logDocking(`[interface] ${message.slice(0, 500)}`)
  })

  // Notifications : centre, test, sons importés, notifications des widgets et modules
  ipcMain.handle(IpcChannels.notificationsList, () => getNotifications())
  ipcMain.handle(IpcChannels.notificationsMarkRead, (_event, ids: string[] | 'all') =>
    markRead(
      ids === 'all' ? 'all' : Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
    )
  )
  ipcMain.handle(IpcChannels.notificationsRemove, (_event, id: string) => removeNotification(id))
  ipcMain.handle(IpcChannels.notificationsClear, () => clearNotifications())
  // Clic dans le centre ou sur une bulle : la fenêtre va elle-même vers la source
  ipcMain.handle(IpcChannels.notificationsActivate, (_event, id: string) =>
    activateNotification(id, true)
  )
  ipcMain.handle(IpcChannels.notificationsTest, () => sendTestNotification())
  ipcMain.handle(IpcChannels.notificationsNotify, (_event, pluginId: string, input: NotifyInput) =>
    notifyFromPlugin(pluginId, input)
  )
  ipcMain.handle(IpcChannels.notificationsNotifyTessera, (_event, input: NotifyInput) =>
    notifyFromTessera(input)
  )
  ipcMain.handle(IpcChannels.notificationsImportSound, (event) =>
    importSound(BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle(IpcChannels.notificationsDeleteSound, (_event, id: string) => deleteSound(id))
  ipcMain.handle(IpcChannels.notificationsGetSound, (_event, sound: string) => getSoundData(sound))
  ipcMain.handle(IpcChannels.notificationsBannersBlocked, () => areBannersBlocked())
  ipcMain.handle(IpcChannels.notificationsOpenSystemSettings, () =>
    openSystemNotificationSettings()
  )
  ipcMain.handle(IpcChannels.notificationsMailRead, async (_event, id: string) => {
    const notification = getNotifications().find((item) => item.id === id)
    const accountId = notification?.source.match(/^mail:(.+)$/s)?.[1]
    if (!notification || !accountId || !notification.target) return
    await markMessageRead(accountId, notification.target)
    markRead([id])
  })

  // Comptes : « Se connecter avec Google / Twitch » (Paramètres → Comptes)
  ipcMain.handle(IpcChannels.accountsProviders, () => getAccountProviders())
  ipcMain.handle(IpcChannels.accountsConnectGoogle, (_event, services: GoogleService[]) =>
    connectGoogle(Array.isArray(services) ? services : [])
  )
  ipcMain.handle(IpcChannels.accountsConnectTwitch, () => connectTwitch())

  // Mails : comptes (Paramètres), puis mails des widgets (permission `mail`, vérifiée)
  ipcMain.handle(IpcChannels.mailGetConfig, () => getMailConfig())
  ipcMain.handle(IpcChannels.mailSetGoogleSecret, (_event, secret: string) =>
    setGoogleClientSecret(secret)
  )
  ipcMain.handle(IpcChannels.mailCancelConnect, () => cancelConnect())
  ipcMain.handle(IpcChannels.mailAddImap, (_event, input: ImapAccountInput, reconnectId?: string) =>
    addImapAccount(input, typeof reconnectId === 'string' ? reconnectId : undefined)
  )
  ipcMain.handle(IpcChannels.mailRemoveAccount, (_event, accountId: string) =>
    removeAccount(accountId)
  )
  ipcMain.handle(IpcChannels.mailGetStates, () => getAccountStates())
  ipcMain.handle(IpcChannels.mailFolders, (_event, pluginId: string, accountId: string) =>
    listFolders(pluginId, accountId)
  )
  ipcMain.handle(
    IpcChannels.mailList,
    (_event, pluginId: string, accountId: string, query: MailQuery, page: string | null) =>
      listMessages(pluginId, accountId, query, page)
  )
  ipcMain.handle(IpcChannels.mailGet, (_event, pluginId: string, accountId: string, id: string) =>
    getMessage(pluginId, accountId, id)
  )
  ipcMain.handle(
    IpcChannels.mailAct,
    (_event, pluginId: string, accountId: string, id: string, action: MailAction) =>
      actOnMessage(pluginId, accountId, id, action)
  )
  ipcMain.handle(
    IpcChannels.mailSend,
    (_event, pluginId: string, accountId: string, draft: MailDraft) =>
      sendMessage(pluginId, accountId, draft)
  )
  ipcMain.handle(IpcChannels.mailPickUploads, (event, pluginId: string) =>
    pickUploads(pluginId, BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle(
    IpcChannels.mailOpenAttachment,
    (_event, pluginId: string, accountId: string, id: string, index: number) =>
      openAttachment(pluginId, accountId, id, index)
  )
  ipcMain.handle(
    IpcChannels.mailSaveAttachment,
    (event, pluginId: string, accountId: string, id: string, index: number) =>
      saveAttachment(pluginId, accountId, id, index, BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle(IpcChannels.mailCheckNow, (_event, pluginId: string, accountId: string) =>
    checkNow(pluginId, accountId)
  )
  ipcMain.handle(IpcChannels.mailReconnect, (_event, pluginId: string, accountId: string) =>
    reconnectMailAccount(pluginId, accountId)
  )
  ipcMain.handle(IpcChannels.mailOpenLink, (event, pluginId: string, url: string) =>
    openMailLink(pluginId, url, event.sender)
  )

  // YouTube et Twitch : comptes (Paramètres), puis données des widgets (permission `media`)
  ipcMain.handle(IpcChannels.mediaGetStatus, () => getMediaStatus())
  ipcMain.handle(IpcChannels.mediaDisconnect, (_event, service: string, accountId?: string) => {
    if (service === 'youtube' || service === 'twitch') {
      disconnectMedia(service, typeof accountId === 'string' ? accountId : undefined)
    }
  })
  ipcMain.handle(
    IpcChannels.mediaYoutubeFeed,
    (_event, pluginId: string, accountId: string, refresh: boolean) =>
      youtubeFeed(pluginId, accountId, refresh)
  )
  ipcMain.handle(IpcChannels.mediaYoutubePlaylists, (_event, pluginId: string, accountId: string) =>
    youtubePlaylists(pluginId, accountId)
  )
  ipcMain.handle(
    IpcChannels.mediaYoutubePlaylist,
    (_event, pluginId: string, accountId: string, id: string) =>
      youtubePlaylist(pluginId, accountId, id)
  )
  ipcMain.handle(
    IpcChannels.mediaYoutubeSearch,
    (_event, pluginId: string, accountId: string, query: string, page: string | null) =>
      youtubeSearch(pluginId, accountId, query, page)
  )
  ipcMain.handle(IpcChannels.mediaTwitchSearch, (_event, pluginId: string, query: string) =>
    twitchSearch(pluginId, query)
  )

  // Vidéos et musiques du PC (permission `videos`)
  ipcMain.handle(IpcChannels.localMediaOpen, (event, pluginId: string) =>
    openLocalMedia(pluginId, BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle(IpcChannels.localMediaDropped, (_event, pluginId: string, path: string) =>
    addDroppedMedia(pluginId, path)
  )
  ipcMain.handle(IpcChannels.localMediaRecent, (_event, pluginId: string) =>
    recentLocalMedia(pluginId)
  )
  ipcMain.handle(IpcChannels.localMediaGet, (_event, pluginId: string, id: string) =>
    getLocalMedia(pluginId, id)
  )
  ipcMain.handle(IpcChannels.localMediaForget, (_event, pluginId: string, id: string) =>
    forgetLocalMedia(pluginId, id)
  )
  ipcMain.on(
    IpcChannels.localMediaPosition,
    (_event, id: string, position: number, duration: number) =>
      saveLocalMediaPosition(id, position, duration)
  )
  ipcMain.handle(IpcChannels.localMediaHasVlc, (_event, pluginId: string) => hasVlc(pluginId))
  ipcMain.handle(
    IpcChannels.localMediaOpenExternally,
    (_event, pluginId: string, id: string, position: number) =>
      openLocalMediaExternally(pluginId, id, position)
  )
  ipcMain.handle(IpcChannels.mediaTwitchLive, (_event, pluginId: string) => twitchLive(pluginId))
  ipcMain.handle(IpcChannels.mediaTwitchRefresh, (_event, pluginId: string) =>
    twitchRefresh(pluginId)
  )

  // Modules tiers : installation (aperçu puis consentement), permissions, mode développeur
  ipcMain.handle(IpcChannels.modulesList, () => listModules())
  ipcMain.handle(IpcChannels.modulesOpenLink, (_event, pluginId: unknown, url: unknown) =>
    openModuleLink(String(pluginId), String(url))
  )
  ipcMain.handle(IpcChannels.modulesPickPackage, (event) =>
    pickModulePackage(BrowserWindow.fromWebContents(event.sender))
  )
  // Paquet ouvert par un double-clic dans l'Explorateur avant que l'interface soit prête
  ipcMain.handle(IpcChannels.modulesTakeOpened, () => takeOpenedPackage())
  ipcMain.handle(IpcChannels.modulesPreviewFile, (_event, path: unknown) => {
    if (typeof path !== 'string' || !path.toLowerCase().endsWith(`.${MODULE_PACKAGE_EXTENSION}`)) {
      throw new Error(`[invalid-package] ${errorText('modules', 'packageExpected')}`)
    }
    return previewPackage(path)
  })
  ipcMain.handle(IpcChannels.modulesPickDevFolder, (event) => {
    if (!getSettings().plugins.developerMode) return null
    return previewDevFolder(BrowserWindow.fromWebContents(event.sender))
  })
  ipcMain.handle(IpcChannels.modulesPreviewDevFolder, (_event, path: unknown) => {
    if (!getSettings().plugins.developerMode) {
      throw new Error(`[not-found] ${errorText('modules', 'developerModeOff')}`)
    }
    return previewDevPath(String(path))
  })
  ipcMain.handle(
    IpcChannels.modulesInstall,
    (_event, token: string, selection: ModuleSelection[]) => installPreview(token, selection)
  )
  ipcMain.handle(IpcChannels.modulesCancel, (_event, token: string) => cancelPreview(token))
  ipcMain.handle(IpcChannels.modulesUninstall, (_event, id: string, options: UninstallOptions) =>
    uninstallModule(id, options)
  )
  ipcMain.handle(IpcChannels.modulesSetGranted, (_event, id: string, granted: PluginPermission[]) =>
    setGrantedPermissions(id, granted)
  )
  ipcMain.handle(IpcChannels.modulesReload, (_event, id: string) => reloadModule(id))
  // Outils de développement de l'interface (le cadre du module s'y choisit), mode développeur
  ipcMain.handle(IpcChannels.modulesInspect, (event) => {
    if (getSettings().plugins.developerMode) event.sender.openDevTools({ mode: 'detach' })
  })

  // Navigateurs installés (ouverture d'applications web hors de Tessera)
  ipcMain.handle(IpcChannels.browsersList, () => listBrowsers())
  ipcMain.handle(IpcChannels.browsersChoices, () => listBrowserChoices())
  ipcMain.handle(IpcChannels.browsersAppFor, (_event, browserId: string) =>
    browserAppFor(String(browserId))
  )
  ipcMain.handle(IpcChannels.browsersOpenPage, (_event, url: string) => openWebPage(String(url)))
  ipcMain.handle(IpcChannels.openResolve, (_event, target: unknown) => resolveOpenTarget(target))
  ipcMain.handle(IpcChannels.openInApp, (_event, appId: unknown, target: unknown) =>
    openInApp(appId, target)
  )
  ipcMain.handle(IpcChannels.openOutside, (_event, target: unknown) => openOutside(target))
  ipcMain.handle(IpcChannels.browsersOpen, (_event, browserId: string, url: string) =>
    openInBrowser(browserId, url)
  )

  ipcMain.handle(IpcChannels.systemGetPreferences, () => getSystemPreferences())
  ipcMain.handle(IpcChannels.windowIsFullScreen, (event) =>
    isFullScreen(tesseraWindowOf(event.sender))
  )
  ipcMain.handle(IpcChannels.windowToggleFullScreen, (event) =>
    toggleFullScreen(tesseraWindowOf(event.sender))
  )
  ipcMain.handle(IpcChannels.windowHoldFullScreen, (event, value: boolean) =>
    holdFullScreen(tesseraWindowOf(event.sender), value === true)
  )
  ipcMain.handle(IpcChannels.videoStageSet, (event, active: boolean) =>
    setVideoStage(active === true, tesseraWindowOf(event.sender))
  )
  ipcMain.handle(IpcChannels.videoStageToggleWheel, () => toggleVideoWheel())

  // Intégrations avec DevLauncher, GitSpread et Prospect Solution (permission `integrations`)
  registerIntegrationHandlers()

  // Widgets de la barre des pages (météo, son, presse-papiers, capture d'écran…)
  registerHeaderBarHandlers()

  // Modules intégrés : fichiers, jeux, Git…
  registerModuleHandlers()

  // Mises à jour automatiques (version installée)
  ipcMain.handle(IpcChannels.updatesGetState, () => getUpdateState())
  ipcMain.handle(IpcChannels.updatesCheck, () => checkForUpdates())
  ipcMain.handle(IpcChannels.updatesInstall, () => installUpdate())
}
