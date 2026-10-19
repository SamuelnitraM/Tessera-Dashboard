import { app, ipcMain } from 'electron'
import { APP_NAME } from '@shared/app'
import { IpcChannels, type AppInfo } from '@shared/ipc'
import type { SettingsPatch } from '@shared/settings'
import { getDashboard, saveDashboard } from './dashboard-store'
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

  ipcMain.handle(IpcChannels.systemGetPreferences, () => getSystemPreferences())
}
