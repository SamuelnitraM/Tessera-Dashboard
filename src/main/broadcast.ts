import { BrowserWindow } from 'electron'

/** Envoie un événement à toutes les fenêtres de l'app. */
export function broadcast(channel: string, ...args: unknown[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, ...args)
  }
}
