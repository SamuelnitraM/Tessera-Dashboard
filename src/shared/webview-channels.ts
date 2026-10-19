/**
 * Canaux IPC entre les pages web intégrées (src/preload/webview.ts) et le processus principal.
 *
 * Séparés de `IpcChannels` : les deux preloads ne doivent partager aucun module, sinon le
 * bundler crée un fichier commun qu'un preload « sandboxé » ne peut pas charger.
 */
export const WebviewChannels = {
  /** Page -> main : la page affiche une notification (identifiant, contenu). */
  notify: 'webview:notify',
  /** Page -> main : la page ferme sa notification. */
  notifyClose: 'webview:notify-close',
  /** Main -> page : événement d'une notification (identifiant, `show` ou `click`). */
  notificationEvent: 'webview:notification-event'
} as const
