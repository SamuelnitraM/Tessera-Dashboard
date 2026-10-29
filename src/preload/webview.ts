/// <reference lib="dom" />
// (Ce script tourne dans une page web : il a besoin des types du navigateur.)
import { contextBridge, ipcRenderer } from 'electron'
import { WebviewChannels } from '@shared/webview-channels'

/**
 * Script de Tessera exécuté dans chaque page web intégrée (onglets d'applications, widgets web),
 * avant les scripts de la page.
 *
 * Notifications : la page (Discord web, Gmail…) utilise l'API `Notification` du navigateur.
 * Elle est remplacée par une version qui transmet chaque notification à Tessera : réglages par
 * application, Ne pas déranger, sons, centre de notifications. Un clic sur la notification est
 * renvoyé à la page, qui ouvre la bonne conversation. C'est le seul accès donné à la page :
 * afficher ses propres notifications.
 */
const notificationListeners = new Map<string, (type: string) => void>()
/**
 * Notifications suivies au plus : la page ne ferme pas celles que l'utilisateur ou Windows ont
 * fait disparaître. Au-delà, les plus anciennes sont oubliées (leur clic n'est plus renvoyé).
 */
const MAX_NOTIFICATIONS = 50

contextBridge.exposeInMainWorld('__tesseraNotifications', {
  show: (
    input: { title: string; body: string; icon: string; tag: string },
    listener: (type: string) => void
  ): string => {
    const id = crypto.randomUUID()
    notificationListeners.set(id, listener)
    // Ordre d'ajout gardé par la Map : la première est la plus ancienne
    for (const old of notificationListeners.keys()) {
      if (notificationListeners.size <= MAX_NOTIFICATIONS) break
      notificationListeners.delete(old)
    }
    ipcRenderer.send(WebviewChannels.notify, id, {
      title: String(input?.title ?? ''),
      body: String(input?.body ?? ''),
      icon: String(input?.icon ?? ''),
      tag: String(input?.tag ?? '')
    })
    return id
  },
  close: (id: string): void => {
    if (!notificationListeners.delete(id)) return
    ipcRenderer.send(WebviewChannels.notifyClose, id)
  }
})

ipcRenderer.on(WebviewChannels.notificationEvent, (_event, id: string, type: string) => {
  notificationListeners.get(id)?.(type)
  // Fermée par l'utilisateur ou Windows : plus rien à renvoyer à la page
  if (type === 'close') notificationListeners.delete(id)
})

contextBridge.executeInMainWorld({
  func: () => {
    type Bridge = {
      show: (
        input: { title: string; body: string; icon: string; tag: string },
        listener: (type: string) => void
      ) => string
      close: (id: string) => void
    }
    const bridge = (window as unknown as { __tesseraNotifications: Bridge }).__tesseraNotifications

    /** Même interface que la `Notification` du navigateur, transmise à Tessera. */
    class TesseraNotification extends EventTarget {
      static get permission(): NotificationPermission {
        return 'granted'
      }
      static requestPermission(
        callback?: (permission: NotificationPermission) => void
      ): Promise<NotificationPermission> {
        callback?.('granted')
        return Promise.resolve('granted')
      }
      static get maxActions(): number {
        return 0
      }

      readonly title: string
      readonly body: string
      readonly icon: string
      readonly tag: string
      readonly data: unknown
      readonly silent: boolean
      onclick: ((event: Event) => void) | null = null
      onshow: ((event: Event) => void) | null = null
      onclose: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      private readonly id: string

      constructor(title: string, options: NotificationOptions = {}) {
        super()
        this.title = String(title)
        this.body = options.body ?? ''
        this.icon = options.icon ? new URL(options.icon, location.href).href : ''
        this.tag = options.tag ?? ''
        this.data = options.data ?? null
        this.silent = options.silent === true
        this.id = bridge.show(
          { title: this.title, body: this.body, icon: this.icon, tag: this.tag },
          (type) => {
            const event = new Event(type, { cancelable: true })
            this.dispatchEvent(event)
            const handler = this[`on${type}` as 'onclick']
            if (typeof handler === 'function') handler.call(this, event)
          }
        )
      }

      close(): void {
        bridge.close(this.id)
      }
    }

    Object.defineProperty(window, 'Notification', {
      value: TesseraNotification,
      writable: true,
      configurable: true
    })
    // Notifications envoyées par un service worker (même chemin)
    if (window.ServiceWorkerRegistration) {
      ServiceWorkerRegistration.prototype.showNotification = function (
        title: string,
        options?: NotificationOptions
      ) {
        new TesseraNotification(title, options)
        return Promise.resolve()
      }
    }
  }
})

/**
 * Clés d'accès (passkeys) : les pages de connexion (Discord…) demandent souvent une proposition
 * « discrète » de clé d'accès dès leur ouverture. Electron l'affiche sous forme de fenêtre
 * « Sécurité Windows » bloquante. On indique donc à la page que ce mode n'est pas disponible ;
 * la connexion par clé d'accès reste possible quand l'utilisateur la choisit.
 */
contextBridge.executeInMainWorld({
  func: () => {
    const credential = window.PublicKeyCredential
    if (credential?.isConditionalMediationAvailable) {
      credential.isConditionalMediationAvailable = () => Promise.resolve(false)
    }

    // Si la page fait quand même une demande « discrète », elle reste en attente (sans fenêtre)
    // jusqu'à ce que la page l'annule elle-même
    const credentials = navigator.credentials
    if (credentials?.get) {
      const originalGet = credentials.get.bind(credentials)
      credentials.get = (options?: CredentialRequestOptions) => {
        if (options?.mediation !== 'conditional') return originalGet(options)
        return new Promise<Credential | null>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('Demande annulée', 'AbortError'))
          )
        })
      }
    }
  }
})

// Molette : hors du bloc qui a le focus (pas encore cliqué), elle fait défiler la page de
// Tessera, qui le décide et le dit ici. Un clic dans la page donne le focus à son bloc.
let wheelToHost = false
ipcRenderer.on(WebviewChannels.wheelMode, (_event, value: boolean) => {
  wheelToHost = value === true
})

/**
 * Un élément sous la souris (ou la page elle-même) peut-il encore défiler dans ce sens ? Sinon,
 * Chromium passerait la molette à la page de Tessera.
 */
function scrollsAt(event: WheelEvent): boolean {
  if (event.deltaY === 0) return true
  for (const node of event.composedPath()) {
    if (!(node instanceof Element) || node.scrollHeight <= node.clientHeight + 1) continue
    const overflow = getComputedStyle(node).overflowY
    const scrollable =
      node === document.scrollingElement
        ? overflow !== 'hidden'
        : /auto|scroll|overlay/.test(overflow)
    if (!scrollable) continue
    if (
      event.deltaY > 0
        ? node.scrollTop + node.clientHeight < node.scrollHeight - 1
        : node.scrollTop > 0
    ) {
      return true
    }
  }
  return false
}

window.addEventListener(
  'wheel',
  (event) => {
    if (!wheelToHost) {
      // Bloc qui a le focus : arrivée au bout de la page (ou rien à faire défiler), la molette
      // ne passe pas à la page de Tessera
      if (!scrollsAt(event)) event.preventDefault()
      return
    }
    event.preventDefault()
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerHeight : 1
    ipcRenderer.sendToHost(WebviewChannels.wheel, event.deltaY * unit)
  },
  { passive: false, capture: true }
)
window.addEventListener('pointerdown', () => ipcRenderer.sendToHost(WebviewChannels.pointerDown), {
  capture: true
})
// Vidéo en plein écran : le clic molette ne va pas à la page (lien ouvert, défilement
// automatique), il bascule la molette de Tessera entre la page et la vidéo
let stage = false
ipcRenderer.on(WebviewChannels.stageMode, (_event, value: boolean) => {
  stage = value === true
})
for (const type of ['mousedown', 'mouseup', 'auxclick'] as const) {
  window.addEventListener(
    type,
    (event) => {
      if (!stage || event.button !== 1) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (type === 'mousedown') ipcRenderer.sendToHost(WebviewChannels.middleClick)
    },
    { capture: true }
  )
}
// Échap : une vidéo plein écran qui a glissé (la page n'est plus en vrai plein écran) en sort
window.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Escape') ipcRenderer.sendToHost(WebviewChannels.escape)
  },
  { capture: true }
)
