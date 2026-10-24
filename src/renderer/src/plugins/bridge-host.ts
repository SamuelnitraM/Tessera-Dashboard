import type {
  BridgeError,
  BridgeEventName,
  BridgeMenuItem,
  HostMessage,
  ModuleMessage
} from '@shared/module-bridge'
import { MAX_MODULE_CONFIG_BYTES } from '@shared/module-bridge'
import { DEFAULT_QUERY, type MailAction, type MailDraft, type MailQuery } from '@shared/mail'
import type { NotifyInput } from '@shared/notifications'
import type { LaunchOptions } from '@shared/plugin-processes'
import type { PluginPermission } from '@shared/plugins'
import {
  installedApps,
  mailSnapshot,
  mediaSnapshot,
  takeNotificationTarget,
  watchData,
  watchNotificationTargets
} from './bridge-data'

/**
 * Côté Tessera du pont avec le bloc d'un module tiers (voir @shared/module-bridge).
 *
 * L'identité du module (`pluginId`) est fixée ici, par le cadre auquel le port a été remis :
 * le module ne la fournit jamais. Chaque appel passe par la table `METHODS` : une méthode
 * absente n'existe pas pour les modules, et une méthode liée à une permission n'est transmise
 * que si l'utilisateur l'a accordée. Le processus principal revérifie ensuite tout de son côté.
 */

type Method = {
  /** Permission requise (`null` : toujours disponible). */
  permission: PluginPermission | null
  run: (pluginId: string, args: unknown[]) => unknown
}

/** Erreur du pont lui-même : son message commence par `[code]`, comme celles du processus principal. */
class BridgeCallError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(`[${code}] ${message}`)
  }
}

function text(value: unknown, name = 'argument'): string {
  if (typeof value !== 'string') throw new BridgeCallError(`${name} : texte attendu.`, 'invalid')
  return value
}

function texts(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BridgeCallError('Liste de textes attendue.', 'invalid')
  }
  return value as string[]
}

/** Lien ouvert dans le navigateur par défaut (http et https uniquement). */
function openExternal(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new BridgeCallError('Adresse invalide.', 'invalid')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BridgeCallError('Seules les adresses http(s) peuvent être ouvertes.', 'invalid')
  }
  // Toute fenêtre demandée par l'interface s'ouvre dans le navigateur par défaut (window.ts)
  window.open(parsed.href, '_blank', 'noopener')
}

const api = (): typeof window.tessera => window.tessera

const METHODS: Record<string, Method> = {
  'app.openExternal': { permission: null, run: (_id, [url]) => openExternal(text(url, 'url')) },

  'files.list': { permission: 'files', run: (id) => api().pluginFiles.list(id) },
  'files.read': {
    permission: 'files',
    run: (id, [name]) => api().pluginFiles.read(id, text(name))
  },
  'files.write': {
    permission: 'files',
    run: (id, [name, content]) => api().pluginFiles.write(id, text(name), text(content))
  },
  'files.rename': {
    permission: 'files',
    run: (id, [from, to]) => api().pluginFiles.rename(id, text(from), text(to))
  },
  'files.trash': {
    permission: 'files',
    run: (id, [name]) => api().pluginFiles.trash(id, text(name))
  },
  'files.openFolder': { permission: 'files', run: (id) => api().pluginFiles.openFolder(id) },
  'files.importFiles': {
    permission: 'files',
    run: (id, [extensions]) => api().pluginFiles.importFiles(id, texts(extensions))
  },
  'files.getFolder': { permission: 'files', run: (id) => api().pluginFiles.getFolder(id) },

  'processes.pick': { permission: 'processes', run: (id) => api().processes.pick(id) },
  'processes.start': {
    permission: 'processes',
    run: (id, [owner, options]) =>
      api().processes.start(id, text(owner), (options ?? {}) as LaunchOptions)
  },
  'processes.stop': {
    permission: 'processes',
    run: (id, [run]) => api().processes.stop(id, text(run))
  },
  'processes.list': { permission: 'processes', run: (id) => api().processes.list(id) },
  'processes.getOutput': {
    permission: 'processes',
    run: (id, [run]) => api().processes.getOutput(id, text(run))
  },
  'processes.clearOutput': {
    permission: 'processes',
    run: (id, [run]) => api().processes.clearOutput(id, text(run))
  },
  'processes.getIcon': {
    permission: 'processes',
    run: (id, [path]) => api().processes.getIcon(id, text(path))
  },
  'processes.showInFolder': {
    permission: 'processes',
    run: (id, [path]) => api().processes.showInFolder(id, text(path))
  },
  'processes.isRunning': {
    permission: 'processes',
    run: (id, [path]) => api().processes.isRunning(id, text(path))
  },

  'notifications.notify': {
    permission: 'notifications',
    run: async (id, [input]) => {
      await api().notifications.notify(id, (input ?? {}) as NotifyInput)
    }
  },
  'notifications.takeTarget': {
    permission: 'notifications',
    run: (id) => takeNotificationTarget(id)
  },

  // Mails des comptes de l'utilisateur
  'mail.accounts': { permission: 'mail', run: () => mailSnapshot() },
  'mail.folders': {
    permission: 'mail',
    run: (id, [account]) => api().mail.folders(id, text(account))
  },
  'mail.list': {
    permission: 'mail',
    run: (id, [account, query, page]) =>
      api().mail.list(
        id,
        text(account),
        (query ?? DEFAULT_QUERY) as MailQuery,
        typeof page === 'string' ? page : null
      )
  },
  'mail.get': {
    permission: 'mail',
    run: (id, [account, message]) => api().mail.get(id, text(account), text(message))
  },
  'mail.act': {
    permission: 'mail',
    run: (id, [account, message, action]) =>
      api().mail.act(id, text(account), text(message), text(action) as MailAction)
  },
  'mail.send': {
    permission: 'mail',
    run: (id, [account, draft]) => api().mail.send(id, text(account), (draft ?? {}) as MailDraft)
  },
  'mail.pickUploads': { permission: 'mail', run: (id) => api().mail.pickUploads(id) },
  'mail.saveAttachment': {
    permission: 'mail',
    run: (id, [account, message, index]) =>
      api().mail.saveAttachment(id, text(account), text(message), Number(index))
  },
  'mail.checkNow': {
    permission: 'mail',
    run: (id, [account]) => api().mail.checkNow(id, text(account))
  },
  'mail.reconnect': {
    permission: 'mail',
    run: (id, [account]) => api().mail.reconnect(id, text(account))
  },
  'mail.openLink': { permission: 'mail', run: (id, [url]) => api().mail.openLink(id, text(url)) },

  // YouTube et Twitch (comptes de l'utilisateur, lecture seule)
  'media.status': { permission: 'media', run: () => mediaSnapshot() },
  'media.youtubeFeed': {
    permission: 'media',
    run: (id, [account, refresh]) => api().media.youtubeFeed(id, text(account), refresh === true)
  },
  'media.youtubePlaylists': {
    permission: 'media',
    run: (id, [account]) => api().media.youtubePlaylists(id, text(account))
  },
  'media.youtubePlaylist': {
    permission: 'media',
    run: (id, [account, playlist]) => api().media.youtubePlaylist(id, text(account), text(playlist))
  },
  'media.youtubeSearch': {
    permission: 'media',
    run: (id, [account, query, page]) =>
      api().media.youtubeSearch(
        id,
        text(account),
        text(query),
        typeof page === 'string' ? page : null
      )
  },
  'media.twitchSearch': {
    permission: 'media',
    run: (id, [query]) => api().media.twitchSearch(id, text(query))
  },
  'media.twitchLive': { permission: 'media', run: (id) => api().media.twitchLive(id) },
  'media.twitchRefresh': { permission: 'media', run: (id) => api().media.twitchRefresh(id) },

  // Vidéos et musiques du PC choisies par l'utilisateur (pas de dépôt de fichier : pas de chemin)
  'videos.open': { permission: 'videos', run: (id) => api().localMedia.open(id) },
  'videos.recent': { permission: 'videos', run: (id) => api().localMedia.recent(id) },
  'videos.get': { permission: 'videos', run: (id, [file]) => api().localMedia.get(id, text(file)) },
  'videos.forget': {
    permission: 'videos',
    run: (id, [file]) => api().localMedia.forget(id, text(file))
  },
  'videos.hasVlc': { permission: 'videos', run: (id) => api().localMedia.hasVlc(id) },
  'videos.openExternally': {
    permission: 'videos',
    run: (id, [file, position]) =>
      api().localMedia.openExternally(id, text(file), Number(position) || 0)
  },

  // Applications installées de l'utilisateur (liste seulement)
  'apps.list': { permission: 'apps', run: () => installedApps() }
}

/** Événements transmis au module, et la permission qu'ils demandent. */
const EVENT_PERMISSIONS: Record<BridgeEventName, PluginPermission> = {
  'files:changed': 'files',
  'processes:changed': 'processes',
  'processes:output': 'processes',
  'mail:changed': 'mail',
  'media:changed': 'media',
  'apps:changed': 'apps',
  'notification:target': 'notifications'
}

/** Code d'erreur lisible : celui du pont, ou le `[code]` d'une erreur du processus principal. */
function toBridgeError(error: unknown): BridgeError {
  if (error instanceof BridgeCallError) return { message: error.message, code: error.code }
  const message = error instanceof Error ? error.message : String(error)
  // « Error invoking remote method '…': Error: [code] détail » -> « [code] détail »
  const clean = message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
  // Codes des fichiers et programmes (`[code] détail`) et des mails (`mail-error:code:détail`)
  const code = /^\[([a-z-]+)\]/.exec(clean)?.[1] ?? /mail-error:([a-z-]+)/.exec(clean)?.[1] ?? null
  return { message: clean, code }
}

export interface BridgeHostOptions {
  pluginId: string
  port: MessagePort
  /** Permissions accordées à cet instant (elles peuvent changer pendant la vie du bloc). */
  granted: () => readonly PluginPermission[]
  /**
   * Applique une modification de configuration (`patch` : `null` si elle est refusée), puis
   * renvoie l'état au module avec l'accusé de réception `seq`.
   */
  setConfig: (patch: Record<string, unknown> | null, seq: number) => void
  /** Menu du clic droit, aux coordonnées du cadre. `select` reçoit l'élément choisi. */
  contextMenu: (x: number, y: number, items: BridgeMenuItem[], select: (id: number) => void) => void
  crash: (message: string) => void
  /** Réponse à un `ping` (le module est toujours en vie). */
  pong: (id: number) => void
  /** Raccourci clavier non utilisé par le module, à appliquer à l'interface. */
  key: (init: KeyboardEventInit) => void
  /** Clic droit non utilisé par le module : menu du bloc, aux coordonnées du cadre. */
  blockMenu: (x: number, y: number) => void
}

/** Relie un port au module : répond à ses appels et lui transmet ses événements. */
export function connectBridgeHost(options: BridgeHostOptions): () => void {
  const { pluginId, port, granted } = options
  const send = (message: HostMessage): void => port.postMessage(message)
  const allowed = (permission: PluginPermission | null): boolean =>
    permission === null || granted().includes(permission)

  const emit = (name: BridgeEventName, ...args: unknown[]): void => {
    if (allowed(EVENT_PERMISSIONS[name])) send({ type: 'event', name, args })
  }
  const unsubscribe = [
    api().pluginFiles.onChange((id) => id === pluginId && emit('files:changed')),
    api().processes.onChange((id, run) => id === pluginId && emit('processes:changed', run)),
    api().processes.onOutput(
      (id, runId, output) => id === pluginId && emit('processes:output', runId, output)
    ),
    watchData({
      mail: (snapshot, fresh) => emit('mail:changed', snapshot, fresh),
      media: (snapshot) => emit('media:changed', snapshot),
      apps: (apps) => emit('apps:changed', apps)
    }),
    // Notification cliquée : le module la récupère avec `notifications.takeTarget`
    watchNotificationTargets(() => emit('notification:target'))
  ]

  const call = async (id: number, name: string, args: unknown[]): Promise<void> => {
    try {
      const method = Object.hasOwn(METHODS, name) ? METHODS[name] : undefined
      if (!method) throw new BridgeCallError(`Méthode inconnue : « ${name} ».`, 'unknown-method')
      if (!allowed(method.permission)) {
        throw new BridgeCallError(
          `Permission « ${method.permission} » non accordée à ce module.`,
          'permission'
        )
      }
      const value = await method.run(pluginId, Array.isArray(args) ? args : [])
      send({ type: 'result', id, ok: true, value })
    } catch (error) {
      send({ type: 'result', id, ok: false, error: toBridgeError(error) })
    }
  }

  port.onmessage = (event: MessageEvent<ModuleMessage>) => {
    const message = event.data
    if (typeof message !== 'object' || message === null) return
    switch (message.type) {
      case 'call':
        if (typeof message.id === 'number')
          void call(message.id, String(message.method), message.args)
        break
      case 'setConfig': {
        const { patch, seq } = message
        if (!Number.isSafeInteger(seq)) break
        // Configuration enregistrée dans dashboard.json : JSON simple, taille bornée.
        // Refusée, elle est tout de même acquittée : le module revient à l'état de Tessera
        const json =
          typeof patch === 'object' && patch !== null && !Array.isArray(patch)
            ? JSON.stringify(patch)
            : null
        if (json && json.length > MAX_MODULE_CONFIG_BYTES) {
          console.warn(`[modules] ${pluginId} : configuration trop volumineuse, ignorée.`)
        }
        const valid = json !== null && json.length <= MAX_MODULE_CONFIG_BYTES
        options.setConfig(valid ? (JSON.parse(json) as Record<string, unknown>) : null, seq)
        break
      }
      case 'contextMenu': {
        if (!Array.isArray(message.items)) break
        const items = message.items
          .slice(0, 40)
          .filter(
            (item): item is BridgeMenuItem =>
              item === 'separator' ||
              (typeof item === 'object' &&
                item !== null &&
                typeof item.id === 'number' &&
                typeof item.label === 'string')
          )
        const menu = message.menu
        options.contextMenu(Number(message.x) || 0, Number(message.y) || 0, items, (item) =>
          send({ type: 'menu', menu, item })
        )
        break
      }
      case 'crash':
        options.crash(String(message.message ?? '').slice(0, 500))
        break
      case 'blockMenu':
        options.blockMenu(Number(message.x) || 0, Number(message.y) || 0)
        break
      case 'pong':
        if (typeof message.id === 'number') options.pong(message.id)
        break
      case 'key':
        // Échap, ou une touche avec Ctrl / Alt / Windows : rien d'autre (pas de saisie de texte)
        if (typeof message.key !== 'string' || message.key.length > 32) break
        if (!(message.ctrl || message.alt || message.meta) && message.key !== 'Escape') break
        options.key({
          key: message.key,
          code: typeof message.code === 'string' ? message.code.slice(0, 32) : '',
          ctrlKey: message.ctrl === true,
          altKey: message.alt === true,
          shiftKey: message.shift === true,
          metaKey: message.meta === true
        })
        break
    }
  }
  port.start()

  return () => {
    for (const stop of unsubscribe) stop()
    port.onmessage = null
    port.close()
  }
}
