import { app, ipcMain } from 'electron'
import { APP_NAME } from '@shared/app'
import { IpcChannels, type AppInfo } from '@shared/ipc'
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

  ipcMain.handle(IpcChannels.systemGetPreferences, () => getSystemPreferences())
}
