import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannels, type AppInfo, type SystemPreferences } from '@shared/ipc'
import type { Dashboard } from '@shared/dashboard'
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
  system: {
    getPreferences: (): Promise<SystemPreferences> =>
      ipcRenderer.invoke(IpcChannels.systemGetPreferences),
    onPreferencesChange: (callback: (preferences: SystemPreferences) => void) =>
      subscribe(IpcChannels.systemPreferencesChanged, callback)
  }
}

export type TesseraApi = typeof api

contextBridge.exposeInMainWorld('tessera', api)
