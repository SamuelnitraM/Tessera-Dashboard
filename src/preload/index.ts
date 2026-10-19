import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannels, type AppInfo, type SystemPreferences } from '@shared/ipc'
import type { InstalledBrowser } from '@shared/browsers'
import type { Dashboard } from '@shared/dashboard'
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
