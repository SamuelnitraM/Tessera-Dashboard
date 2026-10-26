import { existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

/**
 * Chemins complets des programmes lancés par Tessera.
 *
 * Sous Windows, un programme lancé par son seul nom (`git`, `cmd.exe`) est d'abord cherché dans
 * le dossier de travail : un `git.exe` déposé dans un dépôt cloné serait exécuté au premier
 * rafraîchissement. Tessera lance donc toujours un chemin complet : les programmes de Windows
 * depuis System32, les autres depuis les dossiers absolus du PATH.
 */

const SYSTEM32 = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')

/** Programme de Windows (`cmd.exe`, `reg.exe`, `tasklist.exe`…), dans System32. */
export const systemProgram = (name: string): string => join(SYSTEM32, name)

/** PowerShell de Windows (5.1). */
export const POWERSHELL = join(SYSTEM32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')

/** Emplacements habituels, si le PATH ne contient pas le programme. */
const KNOWN: Record<string, string[]> = {
  git: [
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'cmd', 'git.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Git', 'cmd', 'git.exe')
  ],
  gh: [join(process.env.ProgramFiles ?? 'C:\\Program Files', 'GitHub CLI', 'gh.exe')],
  docker: [
    join(
      process.env.ProgramFiles ?? 'C:\\Program Files',
      'Docker',
      'Docker',
      'resources',
      'bin',
      'docker.exe'
    )
  ]
}

const found = new Map<string, string | null>()

/**
 * Chemin complet d'un programme du PATH (`git`, `gh`, `docker`), ou `null` s'il n'est pas
 * installé. Seuls les dossiers absolus du PATH comptent (jamais « . » ni le dossier courant).
 */
export function findProgram(name: string): string | null {
  if (found.has(name)) return found.get(name) ?? null
  const file = name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`
  const folders = (process.env.PATH ?? process.env.Path ?? '')
    .split(';')
    .map((folder) => folder.trim().replace(/^"(.*)"$/, '$1'))
    .filter((folder) => folder && isAbsolute(folder))
  const path =
    folders.map((folder) => join(folder, file)).find((candidate) => existsSync(candidate)) ??
    (KNOWN[name] ?? []).find((candidate) => existsSync(candidate)) ??
    null
  // Introuvable : pas mis en cache, il peut être installé pendant que Tessera tourne
  if (path) found.set(name, path)
  return path
}

/** Erreur « programme introuvable », comme celle de Node (`code: 'ENOENT'`). */
export function notFound(name: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`spawn ${name} ENOENT`)
  error.code = 'ENOENT'
  return error
}
