import { readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { app, shell } from 'electron'
import type {
  DevLauncherProject,
  DevLauncherService,
  DevLauncherState,
  McpStatus
} from '@shared/integrations'
import {
  clampInteger,
  field,
  integrationError,
  isDirectory,
  isFile,
  isImageRunning,
  isRecord,
  readJson,
  roamingAppData,
  stringList,
  tailLines
} from './common'

/**
 * Connecteur DevLauncher (https://github.com/SamuelnitraM/DevLauncher).
 *
 * - Lecture seule, sans DevLauncher : `%APPDATA%\DevLauncher` (paramètres, profils, favoris,
 *   projets récents, statistiques, journal de lancement du jour).
 * - Actions : son serveur MCP local (option de ses paramètres), à l'adresse
 *   `http://127.0.0.1:<mcpServerPort>/mcp`, avec le jeton de ses paramètres. Le jeton est lu ici
 *   à chaque appel et n'est jamais transmis à l'interface. Seuls les outils listés sont appelés.
 *
 * DevLauncher demande les droits administrateur : Tessera ne peut ni le lancer sans l'UAC, ni
 * afficher sa fenêtre dans un bloc. Il est donc ouvert par Windows (`shell.openPath`).
 */

const IMAGE = 'DevLauncher.exe'

const dataDirectory = (): string => join(roamingAppData(), 'DevLauncher')

/** Emplacements habituels d'une version compilée (dépôt de sources dans le dossier de l'utilisateur). */
function detectExecutable(): string | null {
  const root = join(homedir(), 'DevLauncher', 'bin')
  const candidates = [
    join(root, 'Release', 'net8.0-windows', 'win-x64', 'publish', IMAGE),
    join(root, 'Release', 'net8.0-windows', 'win-x64', IMAGE),
    join(root, 'Release', 'net8.0-windows', IMAGE),
    join(root, 'Debug', 'net8.0-windows', IMAGE)
  ]
  return candidates.find(isFile) ?? null
}

/** Proposition pour la fenêtre de sélection (même si le fichier n'existe pas encore). */
export function suggestedDevLauncherExecutable(): string {
  return (
    detectExecutable() ??
    join(homedir(), 'DevLauncher', 'bin', 'Release', 'net8.0-windows', 'win-x64', 'publish', IMAGE)
  )
}

/** Exécutable à ouvrir : celui choisi par l'utilisateur, sinon celui trouvé. */
export function resolveDevLauncherExecutable(chosen: string | null): string | null {
  if (chosen && isFile(chosen)) return chosen
  return detectExecutable()
}

// ---------------------------------------------------------------------------
// Paramètres et données
// ---------------------------------------------------------------------------

interface McpSettings {
  enabled: boolean
  port: number | null
  token: string
}

function readSettings(): unknown {
  return readJson(join(dataDirectory(), 'settings.json'))
}

function readMcpSettings(settings = readSettings()): McpSettings {
  const port = field(settings, 'mcpServerPort')
  const token = field(settings, 'mcpServerToken')
  return {
    enabled: field(settings, 'mcpServerEnabled') === true,
    // Port par défaut de DevLauncher quand il n'est pas enregistré
    port:
      port === undefined
        ? 8765
        : typeof port === 'number' && Number.isInteger(port) && port > 0 && port < 65536
          ? port
          : null,
    token: typeof token === 'string' ? token.trim() : ''
  }
}

const samePath = (a: string, b: string): boolean =>
  resolve(a).toLowerCase() === resolve(b).toLowerCase()

const DEFAULT_ROOT = String.raw`C:\xampp\htdocs`
const DEFAULT_EXCLUDED = ['dashboard', 'img', 'webalizer', 'xampp', 'forbidden', 'restricted']

/** Projets des dossiers configurés, comme DevLauncher les liste (`ProjectScanner.GetProjects`). */
function listProjectPaths(settings: unknown): string[] {
  // Valeurs par défaut de DevLauncher (AppSettings) quand elles ne sont pas enregistrées
  const savedRoots = field(settings, 'projectRoots')
  const legacyRoot = field(settings, 'htdocsPath')
  const roots = Array.isArray(savedRoots)
    ? stringList(savedRoots)
    : typeof legacyRoot === 'string' && legacyRoot.trim()
      ? [legacyRoot.trim()]
      : [DEFAULT_ROOT]
  const savedExcluded = field(settings, 'excludedFolderNames')
  const excluded = new Set(
    (Array.isArray(savedExcluded) ? stringList(savedExcluded) : DEFAULT_EXCLUDED).map((name) =>
      name.toLowerCase()
    )
  )

  const paths: string[] = []
  for (const root of roots) {
    let entries
    try {
      entries = readdirSync(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      if (excluded.has(entry.name.toLowerCase())) continue
      paths.push(join(root, entry.name))
    }
  }
  for (const extra of stringList(field(settings, 'extraProjectPaths'))) {
    if (isDirectory(extra)) paths.push(resolve(extra))
  }

  const unique: string[] = []
  for (const path of paths.map((p) => p.replace(/[\\/]+$/, ''))) {
    if (!unique.some((known) => samePath(known, path))) unique.push(path)
  }
  return unique.sort((a, b) =>
    basename(a).localeCompare(basename(b), undefined, { sensitivity: 'base' })
  )
}

/** Noms des profils : ceux partagés dans `.devlauncher.json`, sinon ceux de `Profiles\<projet>.json`. */
function readProfileNames(projectPath: string): string[] {
  const names = (list: unknown): string[] =>
    Array.isArray(list)
      ? list
          .map((profile) => field(profile, 'name'))
          .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
      : []

  const shared = readJson(join(projectPath, '.devlauncher.json'))
  if (shared !== undefined) return names(isRecord(shared) ? field(shared, 'profiles') : shared)
  // Caractères interdits dans un nom de fichier remplacés, comme `SanitizeFileName` de DevLauncher
  const key = [...basename(projectPath)]
    .map((character) => (character < ' ' || '<>:"/\\|?*'.includes(character) ? '_' : character))
    .join('')
  return names(readJson(join(dataDirectory(), 'Profiles', `${key}.json`)))
}

/** Technologie du projet, d'après les mêmes marqueurs que DevLauncher (`DetectProject`). */
function detectType(projectPath: string): string | null {
  const has = (name: string): boolean => {
    try {
      statSync(join(projectPath, name))
      return true
    } catch {
      return false
    }
  }
  if (has('artisan')) return 'Laravel'
  if (has('symfony.lock') || has(join('bin', 'console'))) return 'Symfony'
  if (has('wp-config.php') || has('wp-content')) return 'WordPress'
  if (has('manage.py')) return 'Django'
  try {
    if (readdirSync(projectPath).some((name) => name.toLowerCase().endsWith('.csproj')))
      return '.NET'
  } catch {
    return null
  }
  if (has('package.json') && !has('composer.json')) return 'Node.js'
  return null
}

interface Statistics {
  count: number
  last: number | null
}

function readStatistics(): (path: string) => Statistics {
  const list = readJson(join(dataDirectory(), 'launch-statistics.json'))
  const entries = Array.isArray(list) ? list : []
  return (path) => {
    const entry = entries.find((item) => {
      const projectPath = field(item, 'projectPath')
      return typeof projectPath === 'string' && samePath(projectPath, path)
    })
    const count = field(entry, 'launchCount')
    const last = Date.parse(String(field(entry, 'lastLaunchTime') ?? ''))
    return {
      count: typeof count === 'number' ? count : 0,
      last: Number.isNaN(last) ? null : last
    }
  }
}

/** Projets lus dans les fichiers de DevLauncher (sans lui). */
function readProjects(settings: unknown): DevLauncherProject[] {
  const directory = dataDirectory()
  const favorites = stringList(readJson(join(directory, 'favorite-projects.json')))
  const recents = stringList(readJson(join(directory, 'recent-projects.json')))
  const lastUsed = readJson(join(directory, 'Profiles', 'last-used.json'))
  const statistics = readStatistics()

  return listProjectPaths(settings).map((path) => {
    const name = basename(path)
    const recentIndex = recents.findIndex((recent) => samePath(recent, path))
    const last = field(lastUsed, name)
    const stats = statistics(path)
    return {
      name,
      path,
      type: detectType(path),
      profiles: readProfileNames(path),
      lastProfile: typeof last === 'string' ? last : null,
      favorite: favorites.some((favorite) => samePath(favorite, path)),
      recent: recentIndex === -1 ? null : recentIndex,
      launchCount: stats.count,
      lastLaunchAt: stats.last
    }
  })
}

// ---------------------------------------------------------------------------
// Client MCP (transport HTTP, réponses JSON)
// ---------------------------------------------------------------------------

const PROTOCOL_VERSION = '2025-06-18'
/** Délai d'un appel court (état, journaux) ; un lancement peut durer bien plus longtemps. */
const SHORT_TIMEOUT_MS = 4000
const LAUNCH_TIMEOUT_MS = 180_000

let nextRequestId = 1

class McpFailure extends Error {
  constructor(readonly status: McpStatus) {
    super(status)
  }
}

/** Envoie une requête JSON-RPC au serveur MCP de DevLauncher et renvoie son `result`. */
async function mcpRequest(
  mcp: McpSettings,
  method: string,
  params: Record<string, unknown>,
  timeout: number
): Promise<unknown> {
  if (!mcp.enabled) throw new McpFailure('disabled')
  if (!mcp.port || !mcp.token) throw new McpFailure('unauthorized')

  let response: Response
  try {
    // Pas d'en-tête Origin (requête du processus principal) : DevLauncher refuse celles des pages web
    response = await fetch(`http://127.0.0.1:${mcp.port}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mcp.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': PROTOCOL_VERSION
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextRequestId++, method, params }),
      redirect: 'error',
      signal: AbortSignal.timeout(timeout)
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError' && timeout > SHORT_TIMEOUT_MS) {
      throw integrationError('unavailable', 'DevLauncher ne répond plus.')
    }
    throw new McpFailure('offline')
  }

  if (response.status === 401) throw new McpFailure('unauthorized')
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new McpFailure('other-service')
  }
  if (!response.ok || !isRecord(body) || body.jsonrpc !== '2.0') {
    throw new McpFailure('other-service')
  }
  if (isRecord(body.error)) {
    throw integrationError('failed', String(body.error.message ?? 'Erreur MCP'))
  }
  return body.result
}

/** Vérifie que c'est bien DevLauncher qui répond sur le port (et pas un autre service). */
async function probe(mcp: McpSettings): Promise<McpStatus> {
  try {
    const result = await mcpRequest(
      mcp,
      'initialize',
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'tessera-dashboard', version: app.getVersion() }
      },
      SHORT_TIMEOUT_MS
    )
    return field(field(result, 'serverInfo'), 'name') === 'devlauncher'
      ? 'connected'
      : 'other-service'
  } catch (error) {
    if (error instanceof McpFailure) return error.status
    return 'other-service'
  }
}

/** Outils MCP que Tessera peut appeler (aucun autre nom n'est envoyé). */
type ToolName =
  | 'list_projects'
  | 'launch_project'
  | 'stop_all'
  | 'service_status'
  | 'read_service_logs'
  | 'restart_service'

/** Appelle un outil et renvoie son texte ; une réponse `isError` devient une erreur `failed`. */
async function callTool(
  tool: ToolName,
  args: Record<string, unknown>,
  timeout = SHORT_TIMEOUT_MS
): Promise<string> {
  let result: unknown
  try {
    result = await mcpRequest(
      readMcpSettings(),
      'tools/call',
      { name: tool, arguments: args },
      timeout
    )
  } catch (error) {
    if (error instanceof McpFailure) throw integrationError('unavailable', `MCP : ${error.status}`)
    throw error
  }
  const content = field(result, 'content')
  const text = Array.isArray(content)
    ? content
        .map((part) => field(part, 'text'))
        .filter((part): part is string => typeof part === 'string')
        .join('\n')
    : ''
  if (field(result, 'isError') === true) throw integrationError('failed', text || tool)
  return text
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const requireText = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw integrationError('invalid', `${name} invalide.`)
  }
  return value.trim()
}

// ---------------------------------------------------------------------------
// API du connecteur
// ---------------------------------------------------------------------------

export async function getDevLauncherState(
  chosenExecutable: string | null
): Promise<DevLauncherState> {
  const settings = readSettings()
  const mcp = readMcpSettings(settings)
  const [running, status] = await Promise.all([isImageRunning(IMAGE), probe(mcp)])
  const projects = readProjects(settings)

  // Avec le serveur MCP : types et profils tels que DevLauncher les connaît
  if (status === 'connected') {
    try {
      const listed = parseJson(await callTool('list_projects', {}))
      if (Array.isArray(listed)) {
        for (const item of listed) {
          const path = field(item, 'path')
          const project =
            typeof path === 'string' ? projects.find((p) => samePath(p.path, path)) : undefined
          if (!project) continue
          const type = field(item, 'projectType')
          if (typeof type === 'string' && type && type !== 'Unknown') project.type = type
          const profiles = stringList(field(item, 'profiles'))
          if (profiles.length > 0) project.profiles = profiles
          project.favorite = field(item, 'isFavorite') === true || project.favorite
        }
      }
    } catch {
      // Les données lues dans les fichiers suffisent
    }
  }

  return {
    installed: isDirectory(dataDirectory()),
    running,
    executable: resolveDevLauncherExecutable(chosenExecutable),
    mcp: { status: mcp.enabled ? status : 'disabled', port: mcp.port },
    projects
  }
}

export async function getDevLauncherServices(): Promise<DevLauncherService[]> {
  const list = parseJson(await callTool('service_status', {}))
  if (!Array.isArray(list)) return []
  return list
    .filter((item) => typeof field(item, 'name') === 'string')
    .map((item) => {
      const project = field(item, 'project')
      const ready = field(item, 'isReady')
      return {
        name: field(item, 'name') as string,
        project: typeof project === 'string' ? project : null,
        running: field(item, 'isRunning') === true,
        ready: typeof ready === 'boolean' ? ready : null
      }
    })
}

/** Dernières lignes du journal d'un service (ou « lancement »), lues par le serveur MCP. */
export async function readDevLauncherServiceLogs(
  service: unknown,
  lines: unknown
): Promise<string[]> {
  const text = await callTool('read_service_logs', {
    service: requireText(service, 'Service'),
    lines: clampInteger(lines, 1, 1000, 200)
  })
  return text === '(journal vide)' ? [] : text.split('\n')
}

export function launchDevLauncherProject(project: unknown, profile: unknown): Promise<string> {
  return callTool(
    'launch_project',
    {
      project: requireText(project, 'Projet'),
      ...(profile === null || profile === undefined || profile === ''
        ? {}
        : { profile: requireText(profile, 'Profil') })
    },
    LAUNCH_TIMEOUT_MS
  )
}

export function stopAllDevLauncher(): Promise<string> {
  return callTool('stop_all', {}, LAUNCH_TIMEOUT_MS)
}

export function restartDevLauncherService(service: unknown): Promise<string> {
  return callTool(
    'restart_service',
    { service: requireText(service, 'Service') },
    LAUNCH_TIMEOUT_MS
  )
}

/** Journal de lancement de DevLauncher (fichier du jour, ou le plus récent), sans le serveur MCP. */
export async function readDevLauncherLaunchLog(lines: unknown): Promise<string[]> {
  const directory = join(dataDirectory(), 'Logs')
  let files: string[]
  try {
    files = readdirSync(directory)
      .filter((name) => /^devlauncher-\d{4}-\d{2}-\d{2}\.log$/.test(name))
      .sort()
  } catch {
    return []
  }
  const latest = files[files.length - 1]
  if (!latest) return []
  return tailLines(join(directory, latest), clampInteger(lines, 1, 1000, 200))
}

/** Ouvre DevLauncher par Windows (qui demande la confirmation administrateur). */
export async function openDevLauncher(chosenExecutable: string | null): Promise<void> {
  const executable = resolveDevLauncherExecutable(chosenExecutable)
  if (!executable) throw integrationError('not-found', IMAGE)
  const error = await shell.openPath(executable)
  if (error) throw integrationError('failed', error)
}
