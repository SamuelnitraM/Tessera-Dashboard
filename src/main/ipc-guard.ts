import { app, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { WebviewChannels } from '@shared/webview-channels'

/**
 * Vérifie l'expéditeur de chaque message IPC, avant tout le reste (importé en premier par
 * index.ts, avant que les canaux ne soient enregistrés).
 *
 * Seule l'interface de Tessera (cadre principal d'une de ses fenêtres, page `file://` ou serveur
 * de développement) peut appeler ses canaux : une page web intégrée (`<webview>`) ou un cadre
 * interne (module, corps d'un mail) compromis ne peut pas ouvrir un terminal, lancer un
 * programme ou lire des fichiers. Les pages web n'ont droit qu'à leurs propres canaux
 * (notifications, src/preload/webview.ts).
 */

const WEBVIEW_ONLY = new Set<string>([WebviewChannels.notify, WebviewChannels.notifyClose])

function trusted(event: IpcMainEvent | IpcMainInvokeEvent, channel: string): boolean {
  const type = event.sender.getType()
  if (WEBVIEW_ONLY.has(channel)) return type === 'webview'
  if (type !== 'window') return false
  const frame = event.senderFrame
  if (!frame || frame !== event.sender.mainFrame) return false
  const url = frame.url
  if (url.startsWith('file://')) return true
  const devServer = process.env['ELECTRON_RENDERER_URL']
  return !app.isPackaged && !!devServer && url.startsWith(devServer)
}

function refuse(channel: string, event: IpcMainEvent | IpcMainInvokeEvent): void {
  console.warn(
    `[ipc] message refusé sur « ${channel} » (expéditeur ${event.sender.getType()}, ${event.senderFrame?.url ?? 'cadre inconnu'})`
  )
}

let installed = false

export function installIpcGuard(): void {
  if (installed) return
  installed = true
  const handle = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = (channel, listener) =>
    handle(channel, (event, ...args) => {
      if (!trusted(event, channel)) {
        refuse(channel, event)
        throw new Error('Accès refusé.')
      }
      return listener(event, ...args)
    })
  const handleOnce = ipcMain.handleOnce.bind(ipcMain)
  ipcMain.handleOnce = (channel, listener) =>
    handleOnce(channel, (event, ...args) => {
      if (!trusted(event, channel)) {
        refuse(channel, event)
        throw new Error('Accès refusé.')
      }
      return listener(event, ...args)
    })
  const on = ipcMain.on.bind(ipcMain)
  ipcMain.on = (channel, listener) =>
    on(channel, (event: IpcMainEvent, ...args: unknown[]) => {
      if (!trusted(event, channel)) {
        refuse(channel, event)
        return
      }
      listener(event, ...args)
    })
}

installIpcGuard()
