import { execFile, spawn } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { app, shell } from 'electron'
import type { GitProjectStatus, GitSpreadProject, GitSpreadState } from '@shared/integrations'
import {
  field,
  integrationError,
  isDirectory,
  isFile,
  isImageRunning,
  readJson,
  roamingAppData,
  stringList
} from './common'

/**
 * Connecteur GitSpread (https://github.com/SamuelnitraM/GitSpread-Manager-Project).
 *
 * GitSpread n'a ni API ni ligne de commande : Tessera lit ses paramètres
 * (`%AppData%\GitSpread\settings.json`, sans secret), retrouve ses projets avec les mêmes règles
 * que lui (lecture de `.git/config`, sans lancer git), puis lit l'état de chaque projet avec
 * `git status`, en lecture seule et sans réseau.
 *
 * Sécurité : git n'est lancé que sur les dossiers trouvés par ce connecteur (jamais sur un chemin
 * reçu de l'interface), avec les options de GitSpread, pour qu'un dépôt reçu d'ailleurs ne puisse
 * lancer aucun programme (`core.fsmonitor`) ; aucune fenêtre de mot de passe, aucun verrou.
 */

const IMAGE = 'GitSpread.exe'

const settingsPath = (): string => join(roamingAppData(), 'GitSpread', 'settings.json')

/** Valeurs par défaut de GitSpread (`ScanOptions`). */
const DEFAULT_DEPTH = 4
const DEFAULT_EXCLUSIONS = [
  'node_modules',
  'vendor',
  'bin',
  'obj',
  'packages',
  'dist',
  'build',
  'target',
  '__pycache__',
  'venv',
  'AppData'
]

/** Exécutable publié par `publish.ps1` (`dist\GitSpread.exe`) dans un dossier de projets. */
function detectExecutable(roots: string[]): string | null {
  const candidates = [
    ...roots.map((root) => join(root, 'GitSpread', 'dist', IMAGE)),
    join(homedir(), 'GitSpread', 'dist', IMAGE),
    join(app.getPath('home'), 'source', 'repos', 'GitSpread', 'dist', IMAGE)
  ]
  return candidates.find(isFile) ?? null
}

export function resolveGitSpreadExecutable(chosen: string | null): string | null {
  if (chosen && isFile(chosen)) return chosen
  return detectExecutable(stringList(field(readJson(settingsPath()), 'rootFolders')))
}

// ---------------------------------------------------------------------------
// Projets (mêmes règles que `ProjectScanner` de GitSpread)
// ---------------------------------------------------------------------------

interface ScannedProject extends GitSpreadProject {
  /** Dossier `.git` réel (dossier, ou cible d'un fichier `gitdir:`). */
  gitDir: string | null
}

/** Dossier git d'un projet : `.git` (dossier) ou fichier `gitdir: …` (worktree, sous-module). */
function findGitDir(directory: string): string | null {
  const dotGit = join(directory, '.git')
  try {
    const stats = statSync(dotGit)
    if (stats.isDirectory()) return dotGit
    const line = readFileSync(dotGit, 'utf8').split(/\r?\n/)[0] ?? ''
    if (!line.startsWith('gitdir:')) return null
    const target = line.slice(7).trim()
    return isAbsolute(target) ? target : resolve(directory, target)
  } catch {
    return null
  }
}

/** Fichier `config` du dépôt (partagé par les worktrees via `commondir`). */
function findConfig(gitDir: string): string | null {
  let directory = gitDir
  try {
    const common = readFileSync(join(gitDir, 'commondir'), 'utf8').trim()
    if (common) directory = isAbsolute(common) ? common : resolve(gitDir, common)
  } catch {
    // Dépôt ordinaire
  }
  const config = join(directory, 'config')
  return isFile(config) ? config : null
}

/** URL du remote principal (`origin`, sinon le premier) lue dans `.git/config`. */
function readPrimaryRemote(configPath: string): string | null {
  let text: string
  try {
    text = readFileSync(configPath, 'utf8')
  } catch {
    return null
  }
  const remotes: { name: string; url: string }[] = []
  let current: string | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('[')) {
      const match = /^\[remote\s+"(.+)"\]$/.exec(line)
      current = match ? match[1] : null
      continue
    }
    const pair = /^([A-Za-z][\w-]*)\s*=\s*(.*)$/.exec(line)
    if (
      current &&
      pair &&
      pair[1].toLowerCase() === 'url' &&
      !remotes.some((r) => r.name === current)
    ) {
      remotes.push({
        name: current,
        url: pair[2].replace(/^"(.*)"$/, '$1').replace(/\\(.)/g, '$1')
      })
    }
  }
  return (remotes.find((remote) => remote.name === 'origin') ?? remotes[0])?.url ?? null
}

/** Alias d'hôtes SSH (`Host perso` → `HostName github.com`) de `~/.ssh/config`. */
function readSshAliases(): Map<string, string> {
  const aliases = new Map<string, string>()
  let text: string
  try {
    text = readFileSync(join(homedir(), '.ssh', 'config'), 'utf8')
  } catch {
    return aliases
  }
  let hosts: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const [keyword, ...values] = raw.trim().split(/\s+/)
    if (!keyword || keyword.startsWith('#')) continue
    if (keyword.toLowerCase() === 'host') hosts = values.filter((host) => !/[*?!]/.test(host))
    else if (keyword.toLowerCase() === 'hostname' && values[0]) {
      for (const host of hosts) aliases.set(host.toLowerCase(), values[0].toLowerCase())
    }
  }
  return aliases
}

/** Hôte, propriétaire et dépôt d'une URL de remote (HTTPS, ssh://, ou `git@hôte:owner/repo`). */
export function parseRemote(
  url: string,
  aliases: Map<string, string>
): { host: string; owner: string; repository: string } | null {
  let host: string
  let path: string
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/\/)(.+)$/.exec(url)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      host = parsed.hostname
      path = parsed.pathname
    } catch {
      return null
    }
  } else if (scp && !/^[A-Za-z]$/.test(scp[1])) {
    // (une lettre seule serait un chemin Windows « C:\… »)
    host = scp[1]
    path = scp[2]
  } else {
    return null
  }
  const parts = path
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/i, '')
    .split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) return null
  host = aliases.get(host.toLowerCase()) ?? host.toLowerCase()
  return { host, owner: parts[parts.length - 2], repository: parts[parts.length - 1] }
}

const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/

function toProject(directory: string, aliases: Map<string, string>): ScannedProject | null {
  const gitDir = findGitDir(directory)
  const config = gitDir ? findConfig(gitDir) : null
  if (!gitDir || !config) return null
  const remote = readPrimaryRemote(config)
  const parsed = remote ? parseRemote(remote, aliases) : null
  // Page web uniquement pour GitHub (adresse reconstruite, jamais l'URL brute du remote)
  const webUrl =
    parsed &&
    parsed.host === 'github.com' &&
    SAFE_SEGMENT.test(parsed.owner) &&
    SAFE_SEGMENT.test(parsed.repository)
      ? `https://github.com/${parsed.owner}/${parsed.repository}`
      : null
  return {
    path: directory,
    name: basename(directory),
    owner: parsed?.owner ?? null,
    host: parsed?.host ?? null,
    webUrl,
    repository: true,
    gitDir
  }
}

const samePath = (a: string, b: string): boolean =>
  resolve(a).toLowerCase() === resolve(b).toLowerCase()

/** Derniers projets trouvés : les seuls sur lesquels git peut être lancé. */
let scanned: ScannedProject[] = []

function scan(settings: unknown): { projects: ScannedProject[]; missing: string[] } {
  const aliases = readSshAliases()
  const roots = stringList(field(settings, 'rootFolders'))
  const depthValue = field(settings, 'scanDepth')
  const maxDepth =
    typeof depthValue === 'number' && Number.isInteger(depthValue)
      ? Math.min(10, Math.max(0, depthValue))
      : DEFAULT_DEPTH
  const savedExclusions = field(settings, 'excludedFolders')
  const excluded = new Set(
    (Array.isArray(savedExclusions) ? stringList(savedExclusions) : DEFAULT_EXCLUSIONS).map(
      (name) => name.toLowerCase()
    )
  )
  const hidden = stringList(field(settings, 'hiddenProjects'))

  const found = new Map<string, ScannedProject>()
  const missing: string[] = []

  const walk = (directory: string, depth: number): void => {
    const key = directory.toLowerCase()
    if (found.has(key)) return
    const project = toProject(directory, aliases)
    if (project) {
      // Pas de recherche à l'intérieur d'un dépôt (sous-modules, dépendances…)
      found.set(key, project)
      return
    }
    if (depth >= maxDepth) return
    let entries
    try {
      entries = readdirSync(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      // Liens et jonctions ignorés (pas de boucle)
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') || entry.name.startsWith('$')) continue
      const child = join(directory, entry.name)
      if (excluded.has(entry.name.toLowerCase()) && !findGitDir(child)) continue
      walk(child, depth + 1)
    }
  }

  for (const root of [...new Set(roots.map((r) => r.toLowerCase()))].map(
    (lower) => roots.find((r) => r.toLowerCase() === lower) as string
  )) {
    if (!isDirectory(root)) missing.push(root)
    else walk(resolve(root), 0)
  }

  for (const extra of stringList(field(settings, 'extraProjects'))) {
    const path = resolve(extra).replace(/[\\/]+$/, '')
    if (!isDirectory(path)) {
      missing.push(path)
      continue
    }
    found.set(
      path.toLowerCase(),
      toProject(path, aliases) ?? {
        path,
        name: basename(path),
        owner: null,
        host: null,
        webUrl: null,
        repository: false,
        gitDir: null
      }
    )
  }

  const projects = [...found.values()]
    .filter((project) => !hidden.some((path) => samePath(path, project.path)))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return { projects, missing }
}

function findScanned(path: unknown): ScannedProject {
  const project =
    typeof path === 'string'
      ? scanned.find((candidate) => samePath(candidate.path, path))
      : undefined
  if (!project) throw integrationError('invalid', 'Projet inconnu de GitSpread.')
  return project
}

// ---------------------------------------------------------------------------
// État git (lecture seule, sans réseau)
// ---------------------------------------------------------------------------

/** Options de GitSpread (`GitService.CommonOptions`) : pas de verrou, chemins lisibles, pas de fsmonitor. */
const SAFE_OPTIONS = [
  '--no-optional-locks',
  '-c',
  'core.quotepath=false',
  '-c',
  'core.fsmonitor=false'
]
const STATUS_TIMEOUT_MS = 15_000
/** Projets lus en même temps (git est un processus par projet). */
const CONCURRENCY = 4

function runGitStatus(directory: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      'git',
      [...SAFE_OPTIONS, 'status', '--porcelain=v2', '--branch'],
      {
        cwd: directory,
        windowsHide: true,
        timeout: STATUS_TIMEOUT_MS,
        maxBuffer: 16 * 1024 * 1024,
        // Aucune fenêtre de saisie : un échec est propre plutôt que bloquant
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_OPTIONAL_LOCKS: '0',
          GCM_INTERACTIVE: 'never'
        }
      },
      (error, stdout, stderr) => {
        if (error) {
          const code = (error as NodeJS.ErrnoException).code
          reject(
            new Error(
              code === 'ENOENT'
                ? 'git est introuvable (PATH).'
                : String(stderr || error.message)
                    .trim()
                    .split(/\r?\n/)[0]
            )
          )
        } else resolvePromise(stdout)
      }
    )
  })
}

/** Analyse de `git status --porcelain=v2 --branch` (comme `GitService.ParseStatus` de GitSpread). */
export function parseStatus(
  output: string
): Omit<GitProjectStatus, 'path' | 'error' | 'lastFetchAt'> {
  const status = {
    branch: null as string | null,
    detached: false,
    upstream: null as string | null,
    ahead: 0,
    behind: 0,
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicts: 0
  }
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith('# branch.head ')) {
      const head = line.slice(14).trim()
      if (head === '(detached)') status.detached = true
      else status.branch = head
    } else if (line.startsWith('# branch.upstream ')) {
      status.upstream = line.slice(18).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const match = /\+(\d+) -(\d+)/.exec(line)
      if (match) {
        status.ahead = Number(match[1])
        status.behind = Number(match[2])
      }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      if (line[2] !== '.') status.staged++
      if (line[3] !== '.') status.modified++
    } else if (line.startsWith('u ')) {
      status.conflicts++
    } else if (line.startsWith('? ')) {
      status.untracked++
    }
  }
  return status
}

async function readStatus(project: ScannedProject): Promise<GitProjectStatus> {
  const empty: GitProjectStatus = {
    path: project.path,
    error: null,
    branch: null,
    detached: false,
    upstream: null,
    ahead: 0,
    behind: 0,
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicts: 0,
    lastFetchAt: null
  }
  if (!project.repository || !project.gitDir) return empty

  let lastFetchAt: number | null = null
  try {
    lastFetchAt = statSync(join(project.gitDir, 'FETCH_HEAD')).mtimeMs
  } catch {
    // Jamais récupéré
  }
  try {
    return { ...empty, ...parseStatus(await runGitStatus(project.path)), lastFetchAt }
  } catch (error) {
    return { ...empty, lastFetchAt, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// API du connecteur
// ---------------------------------------------------------------------------

export async function getGitSpreadState(chosenExecutable: string | null): Promise<GitSpreadState> {
  const settings = readJson(settingsPath())
  const { projects, missing } = scan(settings)
  scanned = projects
  return {
    installed: isFile(settingsPath()),
    running: await isImageRunning(IMAGE),
    executable:
      chosenExecutable && isFile(chosenExecutable)
        ? chosenExecutable
        : detectExecutable(stringList(field(settings, 'rootFolders'))),
    // Le dossier git interne n'est pas transmis à l'interface
    projects: projects.map((project) => ({
      path: project.path,
      name: project.name,
      owner: project.owner,
      host: project.host,
      webUrl: project.webUrl,
      repository: project.repository
    })),
    missingRoots: missing
  }
}

/** État git des projets demandés (parmi ceux trouvés au dernier `getGitSpreadState`). */
export async function getGitStatuses(paths: unknown): Promise<GitProjectStatus[]> {
  if (!Array.isArray(paths) || paths.length > 500)
    throw integrationError('invalid', 'Liste invalide.')
  const projects = paths.map(findScanned)
  const results: GitProjectStatus[] = new Array(projects.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < projects.length) {
      const index = next++
      results[index] = await readStatus(projects[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, projects.length) }, worker))
  return results
}

export async function openGitSpreadFolder(path: unknown): Promise<void> {
  const error = await shell.openPath(findScanned(path).path)
  if (error) throw integrationError('failed', error)
}

export async function openGitSpreadWeb(path: unknown): Promise<void> {
  const { webUrl } = findScanned(path)
  if (!webUrl) throw integrationError('not-found', 'Aucune page GitHub pour ce projet.')
  await shell.openExternal(webUrl)
}

/** Ouvre GitSpread dans sa propre fenêtre (il continue de tourner si Tessera se ferme). */
export function openGitSpread(chosenExecutable: string | null): void {
  const executable = resolveGitSpreadExecutable(chosenExecutable)
  if (!executable) throw integrationError('not-found', IMAGE)
  const child = spawn(executable, [], {
    cwd: dirname(executable),
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  })
  child.on('error', () => {})
  child.unref()
}
