import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, type AppInfo } from '@shared/ipc'

/**
 * API exposée à l'interface sous `window.tessera`.
 * C'est le seul point de passage entre React et le système :
 * chaque fonction ici correspond à un canal IPC géré par le processus principal.
 */
const api = {
  app: {
    getInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IpcChannels.appGetInfo)
  }
}

export type TesseraApi = typeof api

contextBridge.exposeInMainWorld('tessera', api)
