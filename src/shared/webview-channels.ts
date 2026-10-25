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
  notificationEvent: 'webview:notification-event',
  /** Interface -> page : la molette fait défiler la page de Tessera (`true`) ou la page web. */
  wheelMode: 'webview:wheel-mode',
  /** Page -> interface : molette reçue, à faire défiler par Tessera (px). */
  wheel: 'webview:wheel',
  /** Page -> interface : clic dans la page (son bloc devient actif). */
  pointerDown: 'webview:pointer-down',
  /** Page -> interface : la souris est sortie de la page (son bloc n'est plus actif). */
  pointerLeave: 'webview:pointer-leave'
} as const
