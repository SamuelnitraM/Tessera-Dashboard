/**
 * Noms des canaux IPC (communication renderer <-> main).
 * Les centraliser ici évite les fautes de frappe entre les deux côtés.
 */
export const IpcChannels = {
  appGetInfo: 'app:get-info'
} as const

/** Informations sur l'application renvoyées par le processus principal. */
export interface AppInfo {
  name: string
  version: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
}
