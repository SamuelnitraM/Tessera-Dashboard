import { app, BrowserWindow, ipcMain } from 'electron'
import { APP_NAME } from '@shared/app'
import { IpcChannels, type AppInfo } from '@shared/ipc'
import type { LaunchOptions } from '@shared/plugin-processes'
import type { HostRect } from '@shared/desktop-apps'
import type { SettingsPatch } from '@shared/settings'
import { listBrowsers, openInBrowser } from './browsers'
import { getDashboard, saveDashboard } from './dashboard-store'
import {
  attachHost,
  captureApps,
  detachHost,
  getAppStates,
  launchApp,
  moveHost,
  releaseApp,
  setSuspended
} from './desktop/docking'
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
  openSystemNotificationSettings,
  removeNotification,
  sendTestNotification
} from './notifications'
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
import { getSettings, updateSettings } from './settings-store'
import { getSystemPreferences } from './system'
import { clearAppData, fetchSiteIcon, resetAppPermissions } from './web'

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

  ipcMain.handle(IpcChannels.settingsGet, () => getSettings())

  // Le patch vient de l'interface : il est entièrement revalidé par `updateSettings`, et ne
  // peut pas changer le programme lancé par une application installée
  ipcMain.handle(IpcChannels.settingsUpdate, (_event, patch: SettingsPatch) =>
    updateSettings(protectDesktopApps(patch))
  )

  ipcMain.handle(IpcChannels.dashboardGet, () => getDashboard())

  // Comme les réglages, le tableau de bord reçu est entièrement revalidé avant sauvegarde
  ipcMain.handle(IpcChannels.dashboardSave, (_event, dashboard: unknown) =>
    saveDashboard(dashboard)
  )

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
    (_event, hostId: string, appId: string, rect: HostRect | null) =>
      attachHost(hostId, appId, rect)
  )
  ipcMain.handle(IpcChannels.desktopAppsMove, (_event, hostId: string, rect: HostRect | null) =>
    moveHost(hostId, rect)
  )
  ipcMain.handle(IpcChannels.desktopAppsDetach, (_event, hostId: string) => detachHost(hostId))
  ipcMain.handle(IpcChannels.desktopAppsLaunch, (_event, appId: string) => launchApp(appId))
  ipcMain.handle(IpcChannels.desktopAppsRelease, (_event, appId: string) => releaseApp(appId))
  ipcMain.handle(IpcChannels.desktopAppsCapture, () => captureApps())
  ipcMain.handle(IpcChannels.desktopAppsSetSuspended, (_event, value: boolean) =>
    setSuspended(value === true)
  )

  // Notifications : centre, test, sons importés, notifications des widgets et modules
  ipcMain.handle(IpcChannels.notificationsList, () => getNotifications())
  ipcMain.handle(IpcChannels.notificationsMarkRead, (_event, ids: string[] | 'all') =>
    markRead(
      ids === 'all' ? 'all' : Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
    )
  )
  ipcMain.handle(IpcChannels.notificationsRemove, (_event, id: string) => removeNotification(id))
  ipcMain.handle(IpcChannels.notificationsClear, () => clearNotifications())
  ipcMain.handle(IpcChannels.notificationsActivate, (_event, id: string) =>
    activateNotification(id)
  )
  ipcMain.handle(IpcChannels.notificationsTest, () => sendTestNotification())
  ipcMain.handle(IpcChannels.notificationsNotify, (_event, pluginId: string, input: NotifyInput) =>
    notifyFromPlugin(pluginId, input)
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

  // Navigateurs installés (ouverture d'applications web hors de Tessera)
  ipcMain.handle(IpcChannels.browsersList, () => listBrowsers())
  ipcMain.handle(IpcChannels.browsersOpen, (_event, browserId: string, url: string) =>
    openInBrowser(browserId, url)
  )

  ipcMain.handle(IpcChannels.systemGetPreferences, () => getSystemPreferences())
}
