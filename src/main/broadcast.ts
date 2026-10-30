import { getTesseraWindows } from './window'

/** Envoie un événement à toutes les fenêtres de Tessera. */
export function broadcast(channel: string, ...args: unknown[]): void {
  for (const window of getTesseraWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, ...args)
  }
}
