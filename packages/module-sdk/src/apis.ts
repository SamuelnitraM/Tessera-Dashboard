import { useMemo } from 'react'
import type { BridgeMenuItem } from '../../../src/shared/module-bridge'
import type { NotifyInput } from '../../../src/shared/notifications'
import type { PluginFileEntry } from '../../../src/shared/plugin-files'
import type { LaunchOptions, PickedTarget, ProcessRun } from '../../../src/shared/plugin-processes'
import { getBridge } from './bridge'

/**
 * API de Tessera accessibles aux modules. Chaque appel passe par le pont : Tessera vérifie que
 * l'utilisateur a accordé la permission correspondante, sinon l'appel échoue avec le code
 * `permission` (voir `getErrorCode`).
 */

const call = <T>(method: string, ...args: unknown[]): Promise<T> =>
  getBridge().call<T>(method, ...args)

// ---------------------------------------------------------------------------
// Toujours disponibles
// ---------------------------------------------------------------------------

/** Ouvre une adresse http(s) dans le navigateur par défaut de l'utilisateur. */
export function openExternal(url: string): Promise<void> {
  return call('app.openExternal', url)
}

/** Élément d'un menu du clic droit. */
export interface MenuAction {
  label: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type MenuItem = MenuAction | 'separator'

/**
 * Menu du clic droit de Tessera, affiché par l'app (il peut déborder du bloc) :
 * `onContextMenu={openContextMenu([{ label: 'Effacer', onSelect: clear }])}`.
 * Les champs de saisie gardent le menu de Windows (copier, coller…).
 */
export function openContextMenu(items: MenuItem[] | (() => MenuItem[])) {
  return (event: {
    clientX: number
    clientY: number
    target: EventTarget | null
    preventDefault: () => void
    stopPropagation: () => void
  }): void => {
    const target = event.target as HTMLElement | null
    if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
    event.preventDefault()
    event.stopPropagation()
    const list = typeof items === 'function' ? items() : items
    const actions = new Map<number, () => void>()
    const bridgeItems = list.map((item, index): BridgeMenuItem => {
      if (item === 'separator') return 'separator'
      actions.set(index, item.onSelect)
      return { id: index, label: item.label, danger: item.danger, disabled: item.disabled }
    })
    getBridge().openMenu(event.clientX, event.clientY, bridgeItems, (id) => {
      if (id !== null) actions.get(id)?.()
    })
  }
}

// ---------------------------------------------------------------------------
// Fichiers (permission `files`)
// ---------------------------------------------------------------------------

/**
 * Fichiers du module, dans son dossier `Documents\Tessera Dashboard\<files.folder>`.
 * Nécessite `"permissions": ["files"]` et `"files": { "folder": "…" }` dans le manifeste.
 */
export interface PluginFiles {
  list: () => Promise<PluginFileEntry[]>
  read: (name: string) => Promise<string>
  /** Crée ou remplace un fichier texte (UTF-8, 10 Mo au maximum). */
  write: (name: string, content: string) => Promise<PluginFileEntry>
  /** Renomme un fichier (refusé si le nouveau nom existe déjà). */
  rename: (from: string, to: string) => Promise<PluginFileEntry>
  /** Envoie le fichier à la Corbeille de Windows. */
  trash: (name: string) => Promise<void>
  /** Ouvre le dossier dans l'Explorateur Windows. */
  openFolder: () => Promise<void>
  /** Importe des fichiers choisis par l'utilisateur (ex. `['md', 'txt']`) dans le dossier. */
  importFiles: (extensions: string[]) => Promise<PluginFileEntry[]>
  /** Chemin complet du dossier (pour l'afficher). */
  getFolder: () => Promise<string>
  /** Prévient quand le contenu du dossier change (même depuis un autre programme). */
  onChange: (callback: () => void) => () => void
}

const files: PluginFiles = {
  list: () => call('files.list'),
  read: (name) => call('files.read', name),
  write: (name, content) => call('files.write', name, content),
  rename: (from, to) => call('files.rename', from, to),
  trash: (name) => call('files.trash', name),
  openFolder: () => call('files.openFolder'),
  importFiles: (extensions) => call('files.importFiles', extensions),
  getFolder: () => call('files.getFolder'),
  onChange: (callback) => getBridge().on('files:changed', () => callback())
}

export function usePluginFiles(): PluginFiles {
  return files
}

// ---------------------------------------------------------------------------
// Programmes (permission `processes`)
// ---------------------------------------------------------------------------

/**
 * Lancement de programmes. Nécessite `"permissions": ["processes"]` dans le manifeste.
 * Seuls les programmes choisis par l'utilisateur avec `pick()` peuvent être lancés.
 */
export interface PluginProcesses {
  /** Ouvre la fenêtre de sélection de Windows ; `null` si l'utilisateur annule. */
  pick: () => Promise<PickedTarget | null>
  /** Lance le programme. `owner` identifie le bloc (en général son `instanceId`). */
  start: (owner: string, options: LaunchOptions) => Promise<ProcessRun>
  /** Demande la fermeture, puis force l'arrêt (programme et sous-programmes). */
  stop: (runId: string) => Promise<void>
  /** Exécutions en cours ou récentes du module. */
  list: () => Promise<ProcessRun[]>
  getOutput: (runId: string) => Promise<string>
  clearOutput: (runId: string) => Promise<void>
  /** Icône du programme (image `data:`), ou `null`. */
  getIcon: (path: string) => Promise<string | null>
  showInFolder: (path: string) => Promise<void>
  /** Le programme tourne-t-il, même lancé en dehors de Tessera ? (exécutables uniquement) */
  isRunning: (path: string) => Promise<boolean>
  onChange: (callback: (run: ProcessRun) => void) => () => void
  onOutput: (callback: (runId: string, text: string) => void) => () => void
}

const processes: PluginProcesses = {
  pick: () => call('processes.pick'),
  start: (owner, options) => call('processes.start', owner, options),
  stop: (runId) => call('processes.stop', runId),
  list: () => call('processes.list'),
  getOutput: (runId) => call('processes.getOutput', runId),
  clearOutput: (runId) => call('processes.clearOutput', runId),
  getIcon: (path) => call('processes.getIcon', path),
  showInFolder: (path) => call('processes.showInFolder', path),
  isRunning: (path) => call('processes.isRunning', path),
  onChange: (callback) => getBridge().on('processes:changed', (run) => callback(run as ProcessRun)),
  onOutput: (callback) =>
    getBridge().on('processes:output', (runId, text) => callback(String(runId), String(text)))
}

export function useProcesses(): PluginProcesses {
  return processes
}

// ---------------------------------------------------------------------------
// Notifications (permission `notifications`)
// ---------------------------------------------------------------------------

export interface PluginNotifications {
  /**
   * Envoie une notification : centre de notifications, bannière Windows et son, selon les
   * réglages de l'utilisateur (Paramètres → Notifications) et le mode Ne pas déranger.
   */
  notify: (input: NotifyInput) => Promise<void>
}

export function useNotifications(): PluginNotifications {
  return useMemo(() => ({ notify: (input) => call('notifications.notify', input) }), [])
}
