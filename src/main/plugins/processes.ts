import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { app, dialog, shell, type BrowserWindow } from 'electron'
import {
  getLaunchableKind,
  targetName,
  type LaunchOptions,
  type PickedTarget,
  type ProcessErrorCode,
  type ProcessRun
} from '@shared/plugin-processes'
import { interpolate } from '@shared/i18n'
import { pluginSource } from '@shared/notifications'
import { getTranslation } from '../i18n'
import { notify } from '../notifications'
import { JsonStore } from '../json-store'
import { hasPermission } from './manifests'

/**
 * Programmes lancés par les extensions (permission `processes`).
 *
 * Règle de sécurité : une extension ne peut lancer que des programmes que l'utilisateur a
 * choisis lui-même dans la fenêtre de sélection de Windows. Ces choix sont mémorisés par
 * extension dans `process-targets.json` ; tout autre chemin est refusé.
 */

function processError(code: ProcessErrorCode, detail: string): Error {
  return new Error(`[${code}] ${detail}`)
}

// ---------------------------------------------------------------------------
// Programmes autorisés (choisis par l'utilisateur)
// ---------------------------------------------------------------------------

type Approvals = Record<string, string[]>

const approvals = new JsonStore<Approvals>('process-targets.json', (input) => {
  const result: Approvals = {}
  if (typeof input === 'object' && input !== null) {
    for (const [pluginId, paths] of Object.entries(input)) {
      if (Array.isArray(paths)) result[pluginId] = paths.filter((p) => typeof p === 'string')
    }
  }
  return result
})

export const loadProcessApprovals = (): void => void approvals.load()
export const flushProcessApprovals = (): void => approvals.flush()

const samePath = (a: string, b: string): boolean =>
  resolve(a).toLowerCase() === resolve(b).toLowerCase()

function requirePermission(pluginId: string): void {
  if (!hasPermission(pluginId, 'processes')) {
    throw processError(
      'permission',
      `L'extension « ${pluginId} » n'a pas la permission « processes ».`
    )
  }
}

function requireApproved(pluginId: string, path: unknown): string {
  requirePermission(pluginId)
  if (
    typeof path !== 'string' ||
    !(approvals.get()[pluginId] ?? []).some((p) => samePath(p, path))
  ) {
    throw processError('not-approved', 'Ce programme n’a pas été choisi par l’utilisateur.')
  }
  if (!existsSync(path)) throw processError('not-found', `Programme introuvable : ${path}`)
  return path
}

/** Ouvre la fenêtre de sélection de Windows et autorise le programme choisi. */
export async function pickTarget(
  pluginId: string,
  window: BrowserWindow | null
): Promise<PickedTarget | null> {
  requirePermission(pluginId)
  const text = getTranslation().dialogs
  const options: Electron.OpenDialogOptions = {
    title: text.pickProgram,
    properties: ['openFile', 'dontAddToRecent'],
    filters: [{ name: text.programFilter, extensions: ['exe', 'bat', 'cmd', 'lnk'] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const path = result.filePaths[0]
  if (result.canceled || !path) return null

  const kind = getLaunchableKind(path)
  if (!kind) throw processError('invalid', 'Type de fichier non pris en charge.')

  const current = approvals.get()
  const list = current[pluginId] ?? []
  if (!list.some((p) => samePath(p, path)))
    approvals.set({ ...current, [pluginId]: [...list, path] })
  return { path, name: targetName(path), kind }
}

// ---------------------------------------------------------------------------
// Exécutions
// ---------------------------------------------------------------------------

interface RunState {
  pluginId: string
  info: ProcessRun
  /** Sortie de la console (mode `captured`), limitée aux derniers caractères. */
  output: string
}

/** Taille maximale des journaux gardés en mémoire par exécution. */
const MAX_OUTPUT = 200_000
/** Délai laissé à un programme pour se fermer proprement avant l'arrêt forcé. */
const GRACEFUL_STOP_MS = 2500

const runs = new Map<string, RunState>()

interface ProcessListeners {
  changed: (pluginId: string, run: ProcessRun) => void
  output: (pluginId: string, runId: string, text: string) => void
}
let listeners: ProcessListeners = { changed: () => {}, output: () => {} }

export function setProcessListeners(next: ProcessListeners): void {
  listeners = next
}

function update(state: RunState, patch: Partial<ProcessRun>): void {
  state.info = { ...state.info, ...patch }
  listeners.changed(state.pluginId, state.info)
}

/** Séquences de couleur des consoles (ESC [ … m) : retirées des journaux. */
const ANSI_SEQUENCE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`, 'g')

function appendOutput(state: RunState, chunk: string): void {
  const text = chunk.replace(ANSI_SEQUENCE, '').replace(/\r\n?/g, '\n')
  if (!text) return
  state.output = (state.output + text).slice(-MAX_OUTPUT)
  listeners.output(state.pluginId, state.info.id, text)
}

/** Découpe des arguments en respectant les guillemets : `a "b c" d` -> [a, b c, d]. */
function splitArgs(args: string): string[] {
  return [...args.matchAll(/"([^"]*)"|(\S+)/g)].map((match) => match[1] ?? match[2])
}

/** Lance un programme choisi par l'utilisateur. */
export function startProcess(pluginId: string, owner: string, options: LaunchOptions): ProcessRun {
  const path = requireApproved(pluginId, options?.path)
  if (typeof owner !== 'string' || !owner) throw processError('invalid', 'Propriétaire manquant.')
  const args = typeof options.args === 'string' ? options.args.trim() : ''
  const mode = options.mode === 'captured' || options.mode === 'window' ? options.mode : 'window'

  const running = [...runs.values()].find(
    (state) =>
      state.pluginId === pluginId && state.info.owner === owner && state.info.status === 'running'
  )
  if (running) throw processError('already-running', 'Ce programme est déjà lancé.')

  // On ne garde que la dernière exécution de chaque widget
  for (const [id, state] of runs) {
    if (state.pluginId === pluginId && state.info.owner === owner) runs.delete(id)
  }

  let command = path
  let commandArgs: string[] = splitArgs(args)
  let cwd =
    typeof options.cwd === 'string' && options.cwd.trim() ? options.cwd.trim() : dirname(path)
  let verbatim = false

  const kind = getLaunchableKind(path)
  if (kind === 'shortcut') {
    // Raccourci vers un .exe : lancé directement (pour pouvoir le suivre et l'arrêter).
    // Sinon (application du Store…), Windows l'ouvre lui-même, sans suivi possible.
    const link = readShortcut(path)
    if (!link || getLaunchableKind(link.target) !== 'exe')
      return openUntracked(pluginId, owner, path, mode)
    command = link.target
    commandArgs = [...splitArgs(link.args ?? ''), ...commandArgs]
    if (!options.cwd?.trim()) cwd = link.cwd || dirname(link.target)
  } else if (kind === 'script') {
    // Un .bat passe par cmd.exe. `chcp 65001` : sortie en UTF-8 (accents corrects).
    command = 'cmd.exe'
    commandArgs = ['/d', '/s', '/c', `"chcp 65001 >nul & "${path}" ${args}"`]
    verbatim = true
  }

  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
    throw processError('not-found', `Dossier de travail introuvable : ${cwd}`)
  }

  const state: RunState = {
    pluginId,
    output: '',
    info: {
      id: randomUUID(),
      owner,
      path,
      mode,
      pid: null,
      status: 'running',
      exitCode: null,
      stoppedByUser: false,
      error: null,
      startedAt: Date.now(),
      endedAt: null
    }
  }
  runs.set(state.info.id, state)

  let child: ChildProcess
  try {
    child = spawn(command, commandArgs, {
      cwd,
      // Sortie Python immédiate et en UTF-8 (utile pour les scripts lancés par un .bat)
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
      windowsVerbatimArguments: verbatim,
      ...(mode === 'captured'
        ? { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
        : { detached: true, windowsHide: false, stdio: 'ignore' })
    })
  } catch (error) {
    update(state, { status: 'failed', error: String(error), endedAt: Date.now() })
    return state.info
  }

  if (mode === 'window') child.unref()
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue
    const decoder = new TextDecoder('utf-8')
    stream.on('data', (data: Buffer) => appendOutput(state, decoder.decode(data, { stream: true })))
  }

  child.on('error', (error) => {
    update(state, { status: 'failed', error: error.message, endedAt: Date.now() })
  })
  child.on('exit', (code) => {
    if (state.info.status !== 'running') return
    update(state, { status: 'exited', exitCode: code, endedAt: Date.now() })
    // Arrêt inattendu (erreur) : notification, même si le bloc n'est pas affiché
    if (code !== 0 && code !== null && !state.info.stoppedByUser) {
      if (hasPermission(pluginId, 'notifications')) {
        const text = getTranslation().processes
        void notify(pluginSource(pluginId), {
          title: interpolate(text.crashTitle, { name: targetName(path) }),
          body: interpolate(text.crashBody, { code: String(code) }),
          tag: state.info.id
        })
      }
    }
  })

  state.info = { ...state.info, pid: child.pid ?? null }
  listeners.changed(pluginId, state.info)
  return state.info
}

function openUntracked(
  pluginId: string,
  owner: string,
  path: string,
  mode: LaunchOptions['mode']
): ProcessRun {
  const info: ProcessRun = {
    id: randomUUID(),
    owner,
    path,
    mode,
    pid: null,
    status: 'untracked',
    exitCode: null,
    stoppedByUser: false,
    error: null,
    startedAt: Date.now(),
    endedAt: null
  }
  const state: RunState = { pluginId, info, output: '' }
  runs.set(info.id, state)
  void shell.openPath(path).then((error) => {
    if (error) update(state, { status: 'failed', error })
  })
  return info
}

function readShortcut(path: string): Electron.ShortcutDetails | null {
  try {
    return shell.readShortcutLink(path)
  } catch {
    return null
  }
}

function getRun(pluginId: string, runId: string): RunState {
  requirePermission(pluginId)
  const state = runs.get(runId)
  if (!state || state.pluginId !== pluginId)
    throw processError('not-found', 'Exécution introuvable.')
  return state
}

/**
 * Arrête un programme et ceux qu'il a lancés (ex. Python lancé par un .bat).
 * D'abord une demande de fermeture normale, puis un arrêt forcé s'il ne se ferme pas.
 */
export function stopProcess(pluginId: string, runId: string): void {
  const state = getRun(pluginId, runId)
  const pid = state.info.pid
  if (state.info.status !== 'running' || !pid) return
  // Mémorisé avant l'arrêt : le code de sortie qui suivra ne sera pas affiché comme une erreur
  state.info = { ...state.info, stoppedByUser: true }

  const force = (): void => {
    if (state.info.status === 'running')
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {})
  }
  execFile('taskkill', ['/PID', String(pid), '/T'], (error) => {
    // Les programmes en console refusent la fermeture normale : arrêt forcé immédiat
    if (error) force()
    else setTimeout(force, GRACEFUL_STOP_MS)
  })
}

/** Exécutions de l'extension (sans les journaux). */
export function listRuns(pluginId: string): ProcessRun[] {
  requirePermission(pluginId)
  return [...runs.values()]
    .filter((state) => state.pluginId === pluginId)
    .map((state) => state.info)
}

export function getRunOutput(pluginId: string, runId: string): string {
  return getRun(pluginId, runId).output
}

export function clearRunOutput(pluginId: string, runId: string): void {
  getRun(pluginId, runId).output = ''
}

/** Icône du programme (celle de l'Explorateur), en image `data:`. */
export async function getTargetIcon(pluginId: string, path: string): Promise<string | null> {
  const target = requireApproved(pluginId, path)
  try {
    return (await app.getFileIcon(target, { size: 'large' })).toDataURL()
  } catch {
    return null
  }
}

export function showTargetInFolder(pluginId: string, path: string): void {
  shell.showItemInFolder(requireApproved(pluginId, path))
}

/**
 * Le programme tourne-t-il déjà, lancé en dehors de Tessera ? (recherche par nom d'exécutable)
 * Toujours `false` pour les scripts, dont le nom de processus est celui de cmd.exe.
 */
export function isTargetRunning(pluginId: string, path: string): Promise<boolean> {
  const target = requireApproved(pluginId, path)
  let executable = target
  if (getLaunchableKind(target) === 'shortcut') executable = readShortcut(target)?.target ?? ''
  if (getLaunchableKind(executable) !== 'exe') return Promise.resolve(false)

  const image = basename(executable)
  return new Promise((resolvePromise) => {
    execFile(
      'tasklist',
      ['/FI', `IMAGENAME eq ${image}`, '/FO', 'CSV', '/NH'],
      { windowsHide: true },
      (error, stdout) =>
        resolvePromise(!error && stdout.toLowerCase().includes(`"${image.toLowerCase()}"`))
    )
  })
}

/**
 * À la fermeture de Tessera : les programmes en mode `captured` (console cachée) sont arrêtés,
 * puisqu'ils n'auraient plus aucune fenêtre pour être arrêtés. Ceux qui ont leur propre fenêtre
 * continuent de tourner.
 */
export function stopCapturedProcesses(): void {
  for (const state of runs.values()) {
    if (state.info.mode === 'captured' && state.info.status === 'running' && state.info.pid) {
      try {
        execFileSync('taskkill', ['/PID', String(state.info.pid), '/T', '/F'], { stdio: 'ignore' })
      } catch {
        // Déjà terminé
      }
    }
  }
}
