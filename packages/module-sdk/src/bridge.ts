import {
  BRIDGE_VERSION,
  type BridgeEventName,
  type BridgeMenuItem,
  type HostMessage,
  type ModuleMessage,
  type ModuleReady,
  type ModuleWidgetState
} from '../../../src/shared/module-bridge'

/**
 * Connexion du bloc à Tessera.
 *
 * Le bloc tourne dans un cadre isolé : il n'a accès ni à l'interface de Tessera, ni au
 * système. Il annonce qu'il est prêt ; Tessera lui remet alors un port de messages, par lequel
 * passent son état (configuration, thème, langue…) et ses appels (fichiers, programmes…).
 */

/** Erreur renvoyée par Tessera, avec un code lisible (`permission`, `not-found`…). */
export class TesseraError extends Error {
  constructor(
    message: string,
    /** Code de l'erreur, ou `null` s'il n'y en a pas. */
    readonly code: string | null
  ) {
    super(message)
    this.name = 'TesseraError'
  }
}

/** Code d'une erreur venue de Tessera (`permission`, `invalid-name`…), sinon `null`. */
export function getErrorCode(error: unknown): string | null {
  return error instanceof TesseraError ? error.code : null
}

export interface WidgetIdentity {
  pluginId: string
  widgetType: string
  instanceId: string
}

type Pending = { resolve: (value: unknown) => void; reject: (error: unknown) => void }
type EventListener = (...args: unknown[]) => void

class Bridge {
  private port: MessagePort | null = null
  private nextId = 1
  /**
   * Configuration : celle de Tessera, plus les modifications du bloc pas encore acquittées.
   * Un état de Tessera envoyé avant l'arrivée d'une modification ne doit pas l'effacer (sinon,
   * un clic rapide après un autre serait perdu) : elles sont réappliquées par-dessus.
   */
  private hostConfig: Record<string, unknown> = {}
  private pendingConfig: { seq: number; patch: Record<string, unknown> }[] = []
  private nextSeq = 1
  private readonly pending = new Map<number, Pending>()
  private readonly menus = new Map<number, (item: number | null) => void>()
  private readonly stateListeners = new Set<() => void>()
  private readonly eventListeners = new Map<BridgeEventName, Set<EventListener>>()

  identity: WidgetIdentity | null = null
  state: ModuleWidgetState | null = null
  /** Résolu une fois la connexion établie et l'état initial reçu. */
  readonly ready: Promise<void>

  constructor() {
    this.ready = new Promise((resolve) => {
      const onMessage = (event: MessageEvent): void => {
        // Seul le cadre parent (Tessera) peut remettre le port
        if (event.source !== window.parent || event.data?.tessera !== 'connect') return
        const port = event.ports[0]
        if (!port) return
        window.removeEventListener('message', onMessage)
        this.port = port
        port.onmessage = (message: MessageEvent<HostMessage>) => this.receive(message.data, resolve)
        port.start()
        window.addEventListener('keydown', (event) => this.forwardShortcut(event))
        window.addEventListener('contextmenu', (event) => this.forwardContextMenu(event))
      }
      window.addEventListener('message', onMessage)
      const ready: ModuleReady = { tessera: 'ready', bridge: BRIDGE_VERSION }
      // Rien de confidentiel ici : l'origine de Tessera varie (fichier, serveur de développement)
      window.parent.postMessage(ready, '*')
    })
  }

  private receive(message: HostMessage, connected: () => void): void {
    switch (message.type) {
      case 'init':
        this.identity = {
          pluginId: message.pluginId,
          widgetType: message.widgetType,
          instanceId: message.instanceId
        }
        this.hostConfig = message.state.config
        this.setState(message.state)
        connected()
        break
      case 'state': {
        if (!this.state) break
        if (message.state.config) this.hostConfig = message.state.config
        this.pendingConfig = this.pendingConfig.filter((pending) => pending.seq > message.ack)
        this.setState({ ...this.state, ...message.state, config: this.mergedConfig() })
        break
      }
      case 'result': {
        const pending = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (!pending) break
        if (message.ok) pending.resolve(message.value)
        else pending.reject(new TesseraError(message.error.message, message.error.code))
        break
      }
      case 'event':
        for (const listener of this.eventListeners.get(message.name) ?? []) {
          listener(...message.args)
        }
        break
      case 'ping':
        this.send({ type: 'pong', id: message.id })
        break
      case 'menu': {
        const select = this.menus.get(message.menu)
        this.menus.delete(message.menu)
        select?.(message.item)
        break
      }
    }
  }

  /**
   * Raccourcis de Tessera (Ctrl+B, Échap…) quand le bloc a le focus : une touche que le module
   * n'a pas utilisée (`preventDefault`), hors saisie de texte, est renvoyée à l'interface.
   */
  private forwardShortcut(event: KeyboardEvent): void {
    if (!event.isTrusted || event.defaultPrevented || event.repeat) return
    const modified = event.ctrlKey || event.altKey || event.metaKey
    if (!modified && event.key !== 'Escape') return
    const target = event.target as Element | null
    if (modified && target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    // Échap ferme d'abord une fenêtre ouverte dans le bloc
    if (!modified && document.querySelector('dialog[open]')) return
    this.send({
      type: 'key',
      key: event.key,
      code: event.code,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    })
  }

  /**
   * Clic droit que le module n'a pas utilisé : Tessera ouvre le menu du bloc (réglages, retrait).
   * Les champs de saisie gardent le menu de Windows (copier, coller…).
   */
  private forwardContextMenu(event: MouseEvent): void {
    if (!event.isTrusted || event.defaultPrevented) return
    const target = event.target as Element | null
    if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
    event.preventDefault()
    this.send({ type: 'blockMenu', x: event.clientX, y: event.clientY })
  }

  private setState(state: ModuleWidgetState): void {
    this.state = state
    for (const listener of this.stateListeners) listener()
  }

  private send(message: ModuleMessage): void {
    if (!this.port) throw new Error('Tessera n’est pas encore connectée à ce bloc.')
    this.port.postMessage(message)
  }

  /** Appelle une méthode de Tessera (ex. `files.read`). */
  call<T>(method: string, ...args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      try {
        this.send({ type: 'call', id, method, args })
      } catch (error) {
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  private mergedConfig(): Record<string, unknown> {
    return Object.assign({}, this.hostConfig, ...this.pendingConfig.map((pending) => pending.patch))
  }

  setConfig(patch: Record<string, unknown>): void {
    // Appliqué tout de suite dans le bloc ; Tessera enregistre, puis acquitte avec son état
    const seq = this.nextSeq++
    this.pendingConfig.push({ seq, patch })
    if (this.state) this.setState({ ...this.state, config: this.mergedConfig() })
    this.send({ type: 'setConfig', seq, patch })
  }

  openMenu(
    x: number,
    y: number,
    items: BridgeMenuItem[],
    select: (item: number | null) => void
  ): void {
    const menu = this.nextId++
    // Un seul menu ouvert à la fois : les précédents ne répondront plus
    this.menus.clear()
    this.menus.set(menu, select)
    this.send({ type: 'contextMenu', menu, x, y, items })
  }

  crash(message: string): void {
    try {
      this.send({ type: 'crash', message })
    } catch {
      // Pas encore connecté : l'erreur reste visible dans la console
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  on(name: BridgeEventName, listener: EventListener): () => void {
    let listeners = this.eventListeners.get(name)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(name, listeners)
    }
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
}

let bridge: Bridge | null = null

/** Connexion unique du bloc (créée au premier usage). */
export function getBridge(): Bridge {
  bridge ??= new Bridge()
  return bridge
}
