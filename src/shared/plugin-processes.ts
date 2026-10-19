/**
 * Lancement de programmes par les extensions (permission `processes`) : types et règles
 * partagés entre le processus principal (qui lance) et l'interface (qui demande).
 *
 * Sécurité : une extension ne peut lancer QUE des programmes choisis par l'utilisateur
 * dans la fenêtre de sélection de Windows (`pick`). Le processus principal mémorise ces choix
 * et refuse tout autre chemin.
 */

/** Types de fichiers acceptés. */
export const LAUNCHABLE_EXTENSIONS = ['.exe', '.bat', '.cmd', '.lnk'] as const
export type LaunchableKind = 'exe' | 'script' | 'shortcut'

/**
 * - `captured` : console cachée, sortie affichée dans le widget (journaux). Le programme est
 *   arrêté quand Tessera se ferme (il n'aurait plus de fenêtre pour être arrêté).
 * - `window` : le programme a sa propre fenêtre (ou sa console) et continue de tourner
 *   même si Tessera se ferme.
 */
export type ConsoleMode = 'captured' | 'window'

export interface LaunchOptions {
  path: string
  /** Arguments, comme dans une ligne de commande (guillemets pour les espaces). */
  args: string
  /** Dossier de travail ; vide = dossier du programme. */
  cwd: string
  mode: ConsoleMode
}

/**
 * Une exécution d'un programme.
 * - `running` : en cours
 * - `exited` : terminé (code de sortie dans `exitCode`)
 * - `failed` : le lancement a échoué (message dans `error`)
 * - `untracked` : ouvert par Windows sans pouvoir être suivi (ex. raccourci d'application du Store)
 */
export interface ProcessRun {
  id: string
  /** Widget qui a lancé le programme (pour le retrouver après un changement de page). */
  owner: string
  path: string
  mode: ConsoleMode
  pid: number | null
  status: 'running' | 'exited' | 'failed' | 'untracked'
  exitCode: number | null
  /** Arrêté à la demande de l'utilisateur (le code de sortie n'a alors pas de sens). */
  stoppedByUser: boolean
  error: string | null
  startedAt: number
  endedAt: number | null
}

/** Programme choisi par l'utilisateur. */
export interface PickedTarget {
  path: string
  /** Nom sans extension (ex. `DevLauncher`). */
  name: string
  kind: LaunchableKind
}

/**
 * Codes d'erreur renvoyés à l'interface, inclus dans le message sous la forme `[code] détail`.
 * - `permission` : l'extension n'a pas la permission `processes`
 * - `not-approved` : programme qui n'a pas été choisi par l'utilisateur
 * - `not-found` : programme ou dossier de travail introuvable
 * - `invalid` : type de fichier ou paramètre refusé
 * - `already-running` : ce widget a déjà lancé ce programme
 * - `io` : autre erreur
 */
export type ProcessErrorCode =
  'permission' | 'not-approved' | 'not-found' | 'invalid' | 'already-running' | 'io'

export function getProcessErrorCode(error: unknown): ProcessErrorCode {
  const match = /\[(permission|not-approved|not-found|invalid|already-running|io)\]/.exec(
    String(error)
  )
  return (match?.[1] as ProcessErrorCode | undefined) ?? 'io'
}

export function getLaunchableKind(path: string): LaunchableKind | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('.exe')) return 'exe'
  if (lower.endsWith('.bat') || lower.endsWith('.cmd')) return 'script'
  if (lower.endsWith('.lnk')) return 'shortcut'
  return null
}

/** Mode conseillé : journaux pour les scripts, fenêtre propre pour les applications. */
export function defaultConsoleMode(kind: LaunchableKind): ConsoleMode {
  return kind === 'script' ? 'captured' : 'window'
}

/** Nom affichable d'un chemin : `C:\Apps\DevLauncher.exe` -> `DevLauncher`. */
export function targetName(path: string): string {
  const file = path.split(/[\\/]/).pop() ?? path
  return file.replace(/\.(exe|bat|cmd|lnk)$/i, '')
}
