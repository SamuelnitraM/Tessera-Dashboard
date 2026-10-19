import { app, BrowserWindow, ipcMain } from 'electron'
import { APP_NAME } from '@shared/app'
import { IpcChannels, type AppInfo } from '@shared/ipc'
import type { LaunchOptions } from '@shared/plugin-processes'
import type { SettingsPatch } from '@shared/settings'
import { getDashboard, saveDashboard } from './dashboard-store'
import {
  getPluginFolder,
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

  // Le patch vient de l'interface : il est entièrement revalidé par `updateSettings`
  ipcMain.handle(IpcChannels.settingsUpdate, (_event, patch: SettingsPatch) =>
    updateSettings(patch)
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

  ipcMain.handle(IpcChannels.systemGetPreferences, () => getSystemPreferences())
}
