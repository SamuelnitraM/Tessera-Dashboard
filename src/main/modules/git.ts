import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { ipcMain, shell } from 'electron'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import type {
  GitAccount,
  GitBranch,
  GitBranchAction,
  GitChange,
  GitCommit,
  GitHubCollaborator,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
  GitHubRepositoryAction,
  GitHubRun,
  GitNetworkAction,
  GitProject,
  GitProjectStatus,
  GitStash,
  GitState
} from '@shared/git'
import { field, stringList } from '../plugins/integrations/common'
import {
  readStatus,
  scanGitSpreadProjects,
  settingsPath,
  type ScannedProject
} from '../plugins/integrations/gitspread'
import { findProgram } from '../executables'

/**
 * Module Git : reprise de GitSpread dans Tessera (mêmes réglages, `%AppData%\GitSpread`).
 *
 * Comme GitSpread : `git` et `gh` sont lancés sans shell ; pour les opérations réseau, le jeton
 * du compte `gh` du projet est passé à ce seul processus git (en-tête limité à l'hôte, aucun
 * gestionnaire d'identifiants, aucune fenêtre de saisie), jamais écrit sur le disque. git n'est
 * lancé que dans les projets trouvés par la recherche de GitSpread. Pull en avance rapide
 * seulement, push jamais forcé.
 */

const SAFE = ['--no-optional-locks', '-c', 'core.quotepath=false', '-c', 'core.fsmonitor=false']
const TIMEOUT_MS = 60_000
const NETWORK_TIMEOUT_MS = 5 * 60_000
const MAX_OUTPUT = 32 * 1024 * 1024
const MAX_DIFF = 400_000
const TOKEN_CACHE_MS = 10 * 60_000
/** `propriétaire/dépôt` (jamais `.` ni `..`, qui sortiraient de l'adresse de l'API). */
const REPO = /^(?!\.{1,2}\/)[A-Za-z0-9_.-]+\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/
const LOGIN = /^[A-Za-z0-9-]{1,39}$/

interface RunOptions {
  cwd?: string
  env?: Record<string, string>
  input?: string
  timeout?: number
}

/** Lance un programme sans shell ; erreur = premières lignes de sa sortie d'erreur. */
function run(command: string, args: string[], options: RunOptions = {}): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    // Chemin complet : jamais un git.exe ou gh.exe posé dans le dossier du projet
    const executable = findProgram(command)
    if (!executable) {
      reject(new Error(`${command} est introuvable (PATH).`))
      return
    }
    const child = spawn(executable, args, {
      cwd: options.cwd,
      windowsHide: true,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GCM_INTERACTIVE: 'never',
        GH_PROMPT_DISABLED: '1',
        NO_COLOR: '1',
        ...options.env
      }
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), options.timeout ?? TIMEOUT_MS)
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk
    })
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      if (stderr.length < 64_000) stderr += chunk
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(
        new Error(
          (error as NodeJS.ErrnoException).code === 'ENOENT'
            ? `${command} est introuvable (PATH).`
            : error.message
        )
      )
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolvePromise(stdout)
      else {
        const message = (stderr || stdout).trim().split(/\r?\n/).slice(-4).join('\n')
        reject(new Error(message || `${command} a échoué (${code}).`))
      }
    })
    if (options.input !== undefined) child.stdin.end(options.input)
    else child.stdin.end()
  })
}

const git = (cwd: string, args: string[], options: RunOptions = {}): Promise<string> =>
  run('git', [...SAFE, ...args], { ...options, cwd })

/* ---------- Comptes gh ---------- */

let accountsCache: { accounts: GitAccount[]; at: number } | null = null
const tokens = new Map<string, { token: string; at: number }>()

async function listAccounts(force = false): Promise<GitAccount[]> {
  if (!force && accountsCache && Date.now() - accountsCache.at < 60_000)
    return accountsCache.accounts
  let accounts: GitAccount[] = []
  try {
    const data = JSON.parse(await run('gh', ['auth', 'status', '--json', 'hosts'])) as {
      hosts?: Record<string, { login?: string; active?: boolean; state?: string }[]>
    }
    for (const [host, list] of Object.entries(data.hosts ?? {})) {
      for (const entry of list) {
        if (!entry.login || (entry.state && entry.state !== 'success')) continue
        accounts.push({
          key: `${host}/${entry.login}`.toLowerCase(),
          host,
          login: entry.login,
          active: entry.active === true
        })
      }
    }
  } catch {
    // Ancienne version de gh : sortie texte
    try {
      const text = await run('gh', ['auth', 'status']).catch((error: Error) => error.message)
      let host = ''
      let last: GitAccount | null = null
      for (const line of text.split(/\r?\n/)) {
        const hostLine = /^\s*([\w.-]+\.[\w.-]+)\s*$/.exec(line)
        if (hostLine) host = hostLine[1]
        const login = /Logged in to ([\w.-]+) account ([\w-]+)/.exec(line)
        if (login) {
          last = {
            key: `${login[1]}/${login[2]}`.toLowerCase(),
            host: login[1],
            login: login[2],
            active: false
          }
          accounts.push(last)
        }
        if (/Active account: true/.test(line) && last) last.active = true
        if (!login && host && last && last.host !== host) last = null
      }
    } catch {
      accounts = []
    }
  }
  accountsCache = { accounts, at: Date.now() }
  return accounts
}

async function tokenFor(account: GitAccount): Promise<string | null> {
  const cached = tokens.get(account.key)
  if (cached && Date.now() - cached.at < TOKEN_CACHE_MS) return cached.token
  try {
    const token = (
      await run('gh', ['auth', 'token', '--hostname', account.host, '--user', account.login])
    ).trim()
    if (!token) return null
    tokens.set(account.key, { token, at: Date.now() })
    return token
  } catch {
    return null
  }
}

/** Environnement git : jeton du compte limité à son hôte (comme GitSpread), sans saisie. */
function credentialEnv(account: GitAccount | null, token: string | null): Record<string, string> {
  const config: [string, string][] = []
  if (account && token) {
    const basic = Buffer.from(`${account.login}:${token}`).toString('base64')
    config.push(
      ['credential.helper', ''],
      [`http.https://${account.host}/.extraHeader`, `Authorization: Basic ${basic}`],
      ['http.sslVerify', 'true'],
      ['submodule.recurse', 'false'],
      ['fetch.recurseSubmodules', 'false'],
      ['push.recurseSubmodules', 'no']
    )
  }
  const env: Record<string, string> = { GIT_CONFIG_COUNT: String(config.length) }
  config.forEach(([key, value], index) => {
    env[`GIT_CONFIG_KEY_${index}`] = key
    env[`GIT_CONFIG_VALUE_${index}`] = value
  })
  return env
}

/* ---------- Réglages de GitSpread (partagés) ---------- */

type Settings = Record<string, unknown>

/**
 * Réglages de GitSpread, `{}` s'il n'en a pas encore, ou `null` s'ils sont illisibles (fichier
 * verrouillé par GitSpread, JSON invalide) : ils ne sont alors jamais réécrits.
 */
function readSettings(): Settings | null {
  let text: string
  try {
    text = readFileSync(settingsPath(), 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? {} : null
  }
  try {
    const value = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text) as unknown
    return typeof value === 'object' && value !== null ? (value as Settings) : null
  } catch {
    return null
  }
}

/** Écrit un champ en gardant l'écriture de GitSpread (`RootFolders`). */
function setField(settings: Settings, key: string, value: unknown): void {
  const lower = key.toLowerCase()
  const existing = Object.keys(settings).find((candidate) => candidate.toLowerCase() === lower)
  settings[existing ?? key.charAt(0).toUpperCase() + key.slice(1)] = value
}

function updateSettings(change: (settings: Settings) => void): void {
  const settings = readSettings()
  // Illisibles : les réécrire effacerait toute la configuration de GitSpread
  if (!settings) throw new Error('Réglages de GitSpread illisibles : réessaie dans un instant.')
  change(settings)
  mkdirSync(dirname(settingsPath()), { recursive: true })
  // Écriture atomique : GitSpread ne lit jamais un fichier à moitié écrit
  const temporary = `${settingsPath()}.tmp`
  writeFileSync(temporary, JSON.stringify(settings, null, 2), 'utf8')
  renameSync(temporary, settingsPath())
}

const samePath = (a: string, b: string): boolean =>
  resolve(a).toLowerCase() === resolve(b).toLowerCase()

/* ---------- Projets ---------- */

let scanned: ScannedProject[] = []

function project(path: unknown): ScannedProject {
  const found =
    typeof path === 'string' ? scanned.find((candidate) => samePath(candidate.path, path)) : null
  if (!found) throw new Error('Projet inconnu : actualise la liste.')
  return found
}

function repository(path: unknown): ScannedProject {
  const found = project(path)
  if (!found.repository) throw new Error('Ce dossier n’est pas un dépôt git.')
  return found
}

function accountKeyOf(
  scannedProject: ScannedProject,
  accounts: GitAccount[],
  settings: unknown
): string | null {
  // Compte choisi dans GitSpread pour ce projet, sinon celui du propriétaire, sinon l'actif
  const map = field(settings, 'projectAccounts')
  const explicit =
    typeof map === 'object' && map
      ? Object.entries(map as Record<string, unknown>).find(([path]) =>
          samePath(path, scannedProject.path)
        )?.[1]
      : undefined
  if (typeof explicit === 'string' && accounts.some((account) => account.key === explicit)) {
    return explicit
  }
  const host = scannedProject.host ?? 'github.com'
  const owner = scannedProject.owner?.toLowerCase()
  return (
    accounts.find((account) => account.host === host && account.login.toLowerCase() === owner)
      ?.key ??
    accounts.find((account) => account.host === host && account.active)?.key ??
    null
  )
}

async function accountFor(
  path: unknown
): Promise<{ account: GitAccount | null; token: string | null }> {
  const scannedProject = project(path)
  const accounts = await listAccounts()
  const key = accountKeyOf(scannedProject, accounts, readSettings() ?? {})
  const account = accounts.find((candidate) => candidate.key === key) ?? null
  return { account, token: account ? await tokenFor(account) : null }
}

const nameWithOwner = (scannedProject: ScannedProject): string => {
  const match = /github\.com\/([^/]+\/[^/]+)$/.exec(scannedProject.webUrl ?? '')
  if (!match) throw new Error('Pas de dépôt GitHub pour ce projet.')
  return match[1]
}

async function installed(command: string): Promise<boolean> {
  try {
    await run(command, ['--version'], { timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

let tools: { git: boolean; gh: boolean } | null = null

export async function gitState(force = false): Promise<GitState> {
  tools ??= { git: await installed('git'), gh: await installed('gh') }
  const { projects, missing, settings } = scanGitSpreadProjects()
  scanned = projects
  const accounts = tools.gh ? await listAccounts(force) : []
  const result: GitProject[] = projects.map((item) => ({
    path: item.path,
    name: item.name,
    owner: item.owner,
    host: item.host,
    webUrl: item.webUrl,
    repository: item.repository,
    account: accountKeyOf(item, accounts, settings)
  }))
  const cloneFolder = field(settings, 'cloneFolder')
  return {
    gitInstalled: tools.git,
    ghInstalled: tools.gh,
    settingsFound: existsSync(settingsPath()),
    accounts,
    projects: result,
    roots: stringList(field(settings, 'rootFolders')),
    missingRoots: missing,
    cloneFolder: typeof cloneFolder === 'string' && cloneFolder ? cloneFolder : null
  }
}

export async function gitStatuses(paths: unknown): Promise<GitProjectStatus[]> {
  if (!Array.isArray(paths)) return []
  const list = paths.slice(0, 500).map(project)
  const results: GitProjectStatus[] = []
  for (let index = 0; index < list.length; index += 4) {
    results.push(...(await Promise.all(list.slice(index, index + 4).map(readStatus))))
  }
  return results
}

/* ---------- Modifications et commits ---------- */

export async function gitChanges(path: unknown): Promise<GitChange[]> {
  const cwd = repository(path).path
  const output = await git(cwd, ['status', '--porcelain=v1', '-z', '-uall'])
  const parts = output.split('\0')
  const changes: GitChange[] = []
  for (let index = 0; index < parts.length; index += 1) {
    const entry = parts[index]
    if (entry.length < 4) continue
    const x = entry[0]
    const y = entry[1]
    const file = entry.slice(3)
    let from: string | null = null
    if (x === 'R' || x === 'C') from = parts[++index] ?? null
    const conflict = x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')
    changes.push({
      path: file,
      from,
      index: x,
      worktree: y,
      staged: x !== ' ' && x !== '?' && !conflict,
      untracked: x === '?',
      conflict
    })
  }
  return changes
}

const files = (list: unknown): string[] =>
  Array.isArray(list)
    ? list.filter((item): item is string => typeof item === 'string' && !item.startsWith('-'))
    : []

export async function gitDiff(path: unknown, file: unknown, staged: unknown): Promise<string> {
  const cwd = repository(path).path
  const name = files([file])[0]
  if (!name) return ''
  const changes = await gitChanges(path)
  const change = changes.find((item) => item.path === name)
  if (change?.untracked) {
    const full = resolve(cwd, name)
    if (!full.toLowerCase().startsWith(cwd.toLowerCase())) return ''
    const text = (await readFile(full, 'utf8').catch(() => '')).slice(0, MAX_DIFF)
    return text
      .split(/\r?\n/)
      .map((line) => `+${line}`)
      .join('\n')
  }
  const diff = await git(cwd, [
    'diff',
    '--no-color',
    '--no-ext-diff',
    // Pas de filtre « textconv » défini par le dépôt (programme qu'il choisirait)
    '--no-textconv',
    ...(staged === true ? ['--cached'] : []),
    '--',
    name
  ])
  return diff.slice(0, MAX_DIFF)
}

export async function gitStage(path: unknown, list: unknown, on: unknown): Promise<void> {
  const cwd = repository(path).path
  const names = files(list)
  if (names.length === 0) return
  if (on === true) await git(cwd, ['add', '-A', '--', ...names])
  else await git(cwd, ['restore', '--staged', '--', ...names])
}

/**
 * Annule les modifications : fichiers suivis remis comme au dernier commit ; fichiers qui
 * n'existent pas dans le dernier commit (nouveaux, ajoutés, nouveau nom d'un renommage) à la
 * corbeille, jamais supprimés définitivement. Un renommage retrouve aussi son ancien nom.
 */
export async function gitDiscard(path: unknown, list: unknown): Promise<void> {
  const cwd = repository(path).path
  const changes = await gitChanges(path)
  const names = files(list)
  const change = (name: string): GitChange | undefined => changes.find((item) => item.path === name)
  const isNew = (name: string): boolean => {
    const item = change(name)
    return (
      !!item && (item.untracked || item.index === 'A' || item.index === 'R' || item.index === 'C')
    )
  }
  const created = names.filter(isNew)
  const previousNames = names
    .map((name) => change(name))
    .filter((item): item is GitChange => !!item && item.index === 'R' && !!item.from)
    .map((item) => item.from as string)
  const tracked = [...names.filter((name) => !isNew(name)), ...previousNames]
  // Nouveaux fichiers de l'index : retirés de l'index (le fichier reste), puis à la corbeille
  const staged = created.filter((name) => !change(name)?.untracked)
  if (staged.length > 0) await git(cwd, ['restore', '--staged', '--', ...staged])
  if (tracked.length > 0) {
    await git(cwd, ['restore', '--staged', '--worktree', '--source=HEAD', '--', ...tracked])
  }
  for (const name of created) {
    const full = resolve(cwd, name)
    if (full.toLowerCase().startsWith(`${cwd.toLowerCase()}\\`) && existsSync(full)) {
      await shell.trashItem(full)
    }
  }
}

/** Commit des fichiers choisis (et d'eux seulement). */
export async function gitCommit(path: unknown, message: unknown, list: unknown): Promise<void> {
  const cwd = repository(path).path
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) throw new Error('Message de commit vide.')
  const names = files(list)
  if (names.length === 0) throw new Error('Aucun fichier choisi.')
  await git(cwd, ['add', '-A', '--', ...names])
  await git(cwd, ['commit', '-F', '-', '--', ...names], { input: `${text}\n` })
}

export async function gitNetwork(path: unknown, action: GitNetworkAction): Promise<string> {
  const scannedProject = repository(path)
  const { account, token } = await accountFor(path)
  const options = {
    env: credentialEnv(account, token),
    timeout: NETWORK_TIMEOUT_MS
  }
  if (action === 'fetch') return git(scannedProject.path, ['fetch', '--prune'], options)
  if (action === 'pull') return git(scannedProject.path, ['pull', '--ff-only'], options)
  if (action === 'push') {
    const status = await readStatus(scannedProject)
    return git(
      scannedProject.path,
      status.upstream ? ['push'] : ['push', '--set-upstream', 'origin', 'HEAD'],
      options
    )
  }
  throw new Error('Action inconnue.')
}

/* ---------- Branches, historique, remise de côté ---------- */

export async function gitBranches(path: unknown): Promise<GitBranch[]> {
  const cwd = repository(path).path
  const output = await git(cwd, [
    'for-each-ref',
    '--format=%(refname)%1f%(upstream:short)%1f%(upstream:track)%1f%(committerdate:unix)%1f%(HEAD)',
    'refs/heads',
    'refs/remotes'
  ])
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      const [ref, upstream, track, date, head] = line.split('\x1f')
      if (ref.endsWith('/HEAD')) return []
      const remote = ref.startsWith('refs/remotes/')
      return [
        {
          name: ref.replace(/^refs\/(heads|remotes)\//, ''),
          remote,
          current: head === '*',
          upstream: upstream || null,
          ahead: Number(/ahead (\d+)/.exec(track)?.[1] ?? 0),
          behind: Number(/behind (\d+)/.exec(track)?.[1] ?? 0),
          updatedAt: Number(date) * 1000
        }
      ]
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

async function validBranch(cwd: string, name: unknown): Promise<string> {
  if (typeof name !== 'string' || !name || name.startsWith('-'))
    throw new Error('Nom de branche invalide.')
  await git(cwd, ['check-ref-format', '--branch', name]).catch(() => {
    throw new Error('Nom de branche invalide.')
  })
  return name
}

export async function gitBranchAction(
  path: unknown,
  action: GitBranchAction,
  name: unknown,
  extra: unknown
): Promise<void> {
  const cwd = repository(path).path
  if (action === 'switch') {
    const branches = await gitBranches(path)
    const target = branches.find((branch) => branch.name === name)
    if (!target) throw new Error('Branche introuvable.')
    if (target.remote) {
      const local = target.name.split('/').slice(1).join('/')
      if (branches.some((branch) => !branch.remote && branch.name === local)) {
        await git(cwd, ['switch', local])
      } else await git(cwd, ['switch', '--track', target.name])
    } else await git(cwd, ['switch', target.name])
    return
  }
  const branch = await validBranch(cwd, name)
  if (action === 'create') await git(cwd, ['switch', '-c', branch])
  else if (action === 'delete') await git(cwd, ['branch', extra === true ? '-D' : '-d', branch])
  else if (action === 'merge') await git(cwd, ['merge', '--no-edit', branch])
  else if (action === 'rename')
    await git(cwd, ['branch', '-m', branch, await validBranch(cwd, extra)])
}

export async function gitLog(path: unknown, all: unknown, limit: unknown): Promise<GitCommit[]> {
  const cwd = repository(path).path
  const count = typeof limit === 'number' ? Math.min(2000, Math.max(10, limit)) : 300
  const output = await git(cwd, [
    'log',
    '--date-order',
    `-n${count}`,
    ...(all === true ? ['--all'] : []),
    '--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s%x1e'
  ]).catch((error: Error) => {
    // Dépôt sans commit
    if (/does not have any commits|bad default revision/i.test(error.message)) return ''
    throw error
  })
  return output
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, short, parents, author, email, date, refs, subject] = record.split('\x1f')
      return {
        hash,
        short,
        parents: parents ? parents.split(' ') : [],
        author,
        email,
        date: Number(date) * 1000,
        refs: refs ? refs.split(', ').map((ref) => ref.replace(/^HEAD -> /, '→ ')) : [],
        subject
      }
    })
}

export async function gitStash(
  path: unknown,
  action: 'list' | 'push' | 'pop' | 'drop',
  index: unknown
): Promise<GitStash[]> {
  const cwd = repository(path).path
  const ref = `stash@{${typeof index === 'number' ? Math.max(0, Math.floor(index)) : 0}}`
  if (action === 'push') await git(cwd, ['stash', 'push', '--include-untracked'])
  else if (action === 'pop') await git(cwd, ['stash', 'pop', ref])
  else if (action === 'drop') await git(cwd, ['stash', 'drop', ref])
  const output = await git(cwd, ['stash', 'list', '--format=%gd%x1f%s'])
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, message] = line.split('\x1f')
      return { index: Number(/\{(\d+)\}/.exec(name)?.[1] ?? 0), message }
    })
}

/* ---------- GitHub (gh) ---------- */

async function gh(path: unknown, args: string[], cwd?: string): Promise<string> {
  const { account, token } = await accountFor(path)
  return run('gh', args, {
    cwd,
    env: {
      ...(token ? { GH_TOKEN: token } : {}),
      ...(account ? { GH_HOST: account.host } : {})
    },
    timeout: NETWORK_TIMEOUT_MS
  })
}

async function ghAccount(key: unknown, args: string[], cwd?: string): Promise<string> {
  const account = (await listAccounts()).find((candidate) => candidate.key === key)
  if (!account) throw new Error('Compte inconnu.')
  const token = await tokenFor(account)
  return run('gh', args, {
    cwd,
    env: { ...(token ? { GH_TOKEN: token } : {}), GH_HOST: account.host },
    timeout: NETWORK_TIMEOUT_MS
  })
}

type Rollup = { status?: string; conclusion?: string; state?: string }[]

function checksOf(rollup: Rollup | undefined): GitHubPullRequest['checks'] {
  if (!rollup || rollup.length === 0) return null
  const results = rollup.map((check) => (check.conclusion || check.state || '').toUpperCase())
  if (
    results.some((result) =>
      ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED'].includes(result)
    )
  ) {
    return 'failure'
  }
  if (rollup.some((check) => check.status && check.status.toUpperCase() !== 'COMPLETED'))
    return 'pending'
  if (results.some((result) => result === 'PENDING' || result === 'EXPECTED')) return 'pending'
  return 'success'
}

export async function gitPullRequests(path: unknown): Promise<GitHubPullRequest[]> {
  const repo = nameWithOwner(repository(path))
  const output = await gh(path, [
    'pr',
    'list',
    '--repo',
    repo,
    '--state',
    'open',
    '--limit',
    '50',
    '--json',
    'number,title,author,headRefName,baseRefName,isDraft,url,updatedAt,reviewDecision,statusCheckRollup'
  ])
  return (
    JSON.parse(output) as {
      number: number
      title: string
      author?: { login?: string }
      headRefName: string
      baseRefName: string
      isDraft: boolean
      url: string
      updatedAt: string
      reviewDecision?: string
      statusCheckRollup?: Rollup
    }[]
  ).map((item) => ({
    number: item.number,
    title: item.title,
    author: item.author?.login ?? '',
    head: item.headRefName,
    base: item.baseRefName,
    draft: item.isDraft,
    url: item.url,
    updatedAt: item.updatedAt,
    review: item.reviewDecision || null,
    checks: checksOf(item.statusCheckRollup)
  }))
}

export async function gitPullRequestAction(
  path: unknown,
  number: unknown,
  action: 'checkout' | 'merge' | 'squash' | 'close' | 'ready'
): Promise<void> {
  const scannedProject = repository(path)
  const repo = nameWithOwner(scannedProject)
  const id = String(Math.floor(Number(number)))
  if (!/^\d+$/.test(id)) throw new Error('Numéro invalide.')
  if (action === 'checkout') {
    await gh(path, ['pr', 'checkout', id, '--repo', repo], scannedProject.path)
  } else if (action === 'merge' || action === 'squash') {
    await gh(path, ['pr', 'merge', id, '--repo', repo, action === 'merge' ? '--merge' : '--squash'])
  } else if (action === 'close') await gh(path, ['pr', 'close', id, '--repo', repo])
  else if (action === 'ready') await gh(path, ['pr', 'ready', id, '--repo', repo])
}

export async function gitCreatePullRequest(
  path: unknown,
  input: { title?: unknown; body?: unknown; base?: unknown; draft?: unknown }
): Promise<string> {
  const scannedProject = repository(path)
  const repo = nameWithOwner(scannedProject)
  const status = await readStatus(scannedProject)
  if (!status.branch) throw new Error('Aucune branche active.')
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) throw new Error('Titre vide.')
  const args = [
    'pr',
    'create',
    '--repo',
    repo,
    '--head',
    status.branch,
    '--title',
    title,
    '--body',
    typeof input.body === 'string' ? input.body : ''
  ]
  if (typeof input.base === 'string' && input.base && !input.base.startsWith('-')) {
    args.push('--base', input.base)
  }
  if (input.draft === true) args.push('--draft')
  return (await gh(path, args, scannedProject.path)).trim()
}

export async function gitIssues(path: unknown, state: unknown): Promise<GitHubIssue[]> {
  const repo = nameWithOwner(repository(path))
  const output = await gh(path, [
    'issue',
    'list',
    '--repo',
    repo,
    '--state',
    state === 'closed' ? 'closed' : 'open',
    '--limit',
    '50',
    '--json',
    'number,title,author,labels,url,updatedAt,state'
  ])
  return (
    JSON.parse(output) as {
      number: number
      title: string
      author?: { login?: string }
      labels?: { name: string }[]
      url: string
      updatedAt: string
      state: string
    }[]
  ).map((item) => ({
    number: item.number,
    title: item.title,
    author: item.author?.login ?? '',
    labels: (item.labels ?? []).map((label) => label.name),
    url: item.url,
    updatedAt: item.updatedAt,
    state: item.state
  }))
}

export async function gitIssueAction(
  path: unknown,
  action: 'create' | 'close' | 'reopen',
  input: { number?: unknown; title?: unknown; body?: unknown }
): Promise<void> {
  const repo = nameWithOwner(repository(path))
  if (action === 'create') {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!title) throw new Error('Titre vide.')
    await gh(path, [
      'issue',
      'create',
      '--repo',
      repo,
      '--title',
      title,
      '--body',
      typeof input.body === 'string' ? input.body : ''
    ])
    return
  }
  const id = String(Math.floor(Number(input.number)))
  if (!/^\d+$/.test(id)) throw new Error('Numéro invalide.')
  await gh(path, ['issue', action, id, '--repo', repo])
}

export async function gitRuns(path: unknown): Promise<GitHubRun[]> {
  const repo = nameWithOwner(repository(path))
  const output = await gh(path, [
    'run',
    'list',
    '--repo',
    repo,
    '--limit',
    '30',
    '--json',
    'databaseId,displayTitle,workflowName,headBranch,event,status,conclusion,url,createdAt'
  ])
  return (
    JSON.parse(output) as {
      databaseId: number
      displayTitle: string
      workflowName: string
      headBranch: string
      event: string
      status: string
      conclusion: string
      url: string
      createdAt: string
    }[]
  ).map((item) => ({
    id: item.databaseId,
    title: item.displayTitle,
    workflow: item.workflowName,
    branch: item.headBranch,
    event: item.event,
    status: item.status,
    conclusion: item.conclusion || null,
    url: item.url,
    createdAt: item.createdAt
  }))
}

export async function gitRunAction(
  path: unknown,
  id: unknown,
  action: 'rerun' | 'cancel'
): Promise<void> {
  const repo = nameWithOwner(repository(path))
  const run = String(Math.floor(Number(id)))
  if (!/^\d+$/.test(run)) throw new Error('Identifiant invalide.')
  await gh(path, ['run', action, run, ...(action === 'rerun' ? ['--failed'] : []), '--repo', repo])
}

/** Publie un projet local sur GitHub (nouveau dépôt, remote `origin`, premier push). */
export async function gitPublish(
  path: unknown,
  accountKey: unknown,
  name: unknown,
  privateRepo: unknown
): Promise<void> {
  const scannedProject = repository(path)
  if (typeof name !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(name))
    throw new Error('Nom invalide.')
  await ghAccount(
    accountKey,
    [
      'repo',
      'create',
      name,
      privateRepo === false ? '--public' : '--private',
      '--source',
      scannedProject.path,
      '--remote',
      'origin',
      '--push'
    ],
    scannedProject.path
  )
}

/* ---------- Dépôts d'un compte ---------- */

export async function gitRepositories(accountKey: unknown): Promise<GitHubRepository[]> {
  const account = (await listAccounts()).find((candidate) => candidate.key === accountKey)
  if (!account) throw new Error('Compte inconnu.')
  const own = JSON.parse(
    await ghAccount(accountKey, [
      'repo',
      'list',
      account.login,
      '--limit',
      '300',
      '--json',
      'name,nameWithOwner,description,visibility,isArchived,isFork,url,updatedAt'
    ])
  ) as {
    name: string
    nameWithOwner: string
    description: string | null
    visibility: GitHubRepository['visibility']
    isArchived: boolean
    isFork: boolean
    url: string
    updatedAt: string
  }[]
  let shared: GitHubRepository[] = []
  try {
    const list = JSON.parse(
      await ghAccount(accountKey, [
        'api',
        '--paginate',
        '--slurp',
        'user/repos?affiliation=collaborator&per_page=100'
      ])
    ).flat() as {
      name: string
      full_name: string
      description: string | null
      private: boolean
      archived: boolean
      fork: boolean
      html_url: string
      updated_at: string
    }[]
    shared = list.map((item) => ({
      nameWithOwner: item.full_name,
      name: item.name,
      description: item.description ?? '',
      visibility: item.private ? 'PRIVATE' : 'PUBLIC',
      archived: item.archived,
      fork: item.fork,
      url: item.html_url,
      updatedAt: item.updated_at,
      collaborator: true,
      localPath: null
    }))
  } catch {
    // Dépôts partagés indisponibles (autorisations du jeton)
  }
  const local = (repo: string): string | null =>
    scanned.find((item) => item.webUrl?.toLowerCase().endsWith(`/${repo.toLowerCase()}`))?.path ??
    null
  return [
    ...own.map((item) => ({
      nameWithOwner: item.nameWithOwner,
      name: item.name,
      description: item.description ?? '',
      visibility: item.visibility,
      archived: item.isArchived,
      fork: item.isFork,
      url: item.url,
      updatedAt: item.updatedAt,
      collaborator: false,
      localPath: null
    })),
    ...shared
  ].map((item) => ({ ...item, localPath: local(item.nameWithOwner) }))
}

/** Clone un dépôt dans un dossier ; il rejoint les projets (ajouté à GitSpread au besoin). */
export async function gitClone(
  accountKey: unknown,
  repo: unknown,
  folder: unknown
): Promise<string> {
  if (typeof repo !== 'string' || !REPO.test(repo)) throw new Error('Dépôt invalide.')
  if (typeof folder !== 'string' || !folder) throw new Error('Dossier invalide.')
  const account = (await listAccounts()).find((candidate) => candidate.key === accountKey)
  if (!account) throw new Error('Compte inconnu.')
  const token = await tokenFor(account)
  const parent = resolve(folder)
  const target = join(parent, repo.split('/')[1])
  if (existsSync(target)) throw new Error(`Le dossier « ${basename(target)} » existe déjà.`)
  await run('git', ['clone', `https://${account.host}/${repo}.git`, target], {
    cwd: parent,
    env: credentialEnv(account, token),
    timeout: NETWORK_TIMEOUT_MS
  })
  const roots = stringList(field(readSettings() ?? {}, 'rootFolders'))
  if (!roots.some((root) => target.toLowerCase().startsWith(resolve(root).toLowerCase() + '\\'))) {
    updateSettings((settings) =>
      setField(settings, 'extraProjects', [...stringList(field(settings, 'extraProjects')), target])
    )
  }
  return target
}

export async function gitRepositoryAction(
  accountKey: unknown,
  repo: unknown,
  action: GitHubRepositoryAction,
  value: unknown
): Promise<void> {
  if (typeof repo !== 'string' || !REPO.test(repo)) throw new Error('Dépôt invalide.')
  if (action === 'visibility') {
    await ghAccount(accountKey, [
      'repo',
      'edit',
      repo,
      '--visibility',
      value === 'public' ? 'public' : 'private',
      '--accept-visibility-change-consequences'
    ])
  } else if (action === 'archive' || action === 'unarchive') {
    await ghAccount(accountKey, ['repo', action, repo, '--yes'])
  } else if (action === 'rename') {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(value))
      throw new Error('Nom invalide.')
    await ghAccount(accountKey, ['repo', 'rename', value, '--repo', repo, '--yes'])
  } else if (action === 'delete') {
    await ghAccount(accountKey, ['repo', 'delete', repo, '--yes'])
  } else if (action === 'transfer') {
    if (typeof value !== 'string' || !LOGIN.test(value)) throw new Error('Compte invalide.')
    await ghAccount(accountKey, [
      'api',
      '-X',
      'POST',
      `repos/${repo}/transfer`,
      '-f',
      `new_owner=${value}`
    ])
  }
}

export async function gitCollaborators(
  accountKey: unknown,
  repo: unknown,
  action: 'list' | 'add' | 'remove',
  login: unknown
): Promise<GitHubCollaborator[]> {
  if (typeof repo !== 'string' || !REPO.test(repo)) throw new Error('Dépôt invalide.')
  if (action !== 'list') {
    if (typeof login !== 'string' || !LOGIN.test(login)) throw new Error('Compte invalide.')
    await ghAccount(accountKey, [
      'api',
      '-X',
      action === 'add' ? 'PUT' : 'DELETE',
      `repos/${repo}/collaborators/${login}`,
      ...(action === 'add' ? ['-f', 'permission=push'] : [])
    ])
  }
  const list = JSON.parse(
    await ghAccount(accountKey, [
      'api',
      '--paginate',
      '--slurp',
      `repos/${repo}/collaborators?per_page=100`
    ])
  ).flat() as { login: string; role_name?: string }[]
  return list.map((item) => ({ login: item.login, permission: item.role_name ?? '' }))
}

/* ---------- Réglages partagés ---------- */

export function gitSettings(
  action: 'addRoot' | 'removeRoot' | 'addProject' | 'hideProject' | 'setAccount' | 'cloneFolder',
  path: unknown,
  value: unknown
): void {
  if (typeof path !== 'string' || !path) throw new Error('Chemin invalide.')
  const full = resolve(path)
  updateSettings((settings) => {
    const list = (key: string): string[] => stringList(field(settings, key))
    const without = (key: string): string[] => list(key).filter((item) => !samePath(item, full))
    if (action === 'addRoot') setField(settings, 'rootFolders', [...without('rootFolders'), full])
    else if (action === 'removeRoot') setField(settings, 'rootFolders', without('rootFolders'))
    else if (action === 'addProject')
      setField(settings, 'extraProjects', [...without('extraProjects'), full])
    else if (action === 'hideProject') {
      setField(settings, 'hiddenProjects', [...without('hiddenProjects'), full])
      setField(settings, 'extraProjects', without('extraProjects'))
    } else if (action === 'cloneFolder') setField(settings, 'cloneFolder', full)
    else if (action === 'setAccount') {
      const current = field(settings, 'projectAccounts')
      const map: Record<string, string> = {}
      if (typeof current === 'object' && current) {
        for (const [key, item] of Object.entries(current as Record<string, unknown>)) {
          if (!samePath(key, full) && typeof item === 'string') map[key] = item
        }
      }
      if (typeof value === 'string' && value) map[full] = value
      setField(settings, 'projectAccounts', map)
    }
  })
}

export function registerGitHandlers(): void {
  ipcMain.handle(C.gitState, (_event, force: boolean) => gitState(force === true))
  ipcMain.handle(C.gitStatuses, (_event, paths: unknown) => gitStatuses(paths))
  ipcMain.handle(C.gitChanges, (_event, path: unknown) => gitChanges(path))
  ipcMain.handle(C.gitDiff, (_event, path: unknown, file: unknown, staged: unknown) =>
    gitDiff(path, file, staged)
  )
  ipcMain.handle(C.gitStage, (_event, path: unknown, list: unknown, on: unknown) =>
    gitStage(path, list, on)
  )
  ipcMain.handle(C.gitDiscard, (_event, path: unknown, list: unknown) => gitDiscard(path, list))
  ipcMain.handle(C.gitCommit, (_event, path: unknown, message: unknown, list: unknown) =>
    gitCommit(path, message, list)
  )
  ipcMain.handle(C.gitNetwork, (_event, path: unknown, action: GitNetworkAction) =>
    gitNetwork(path, action)
  )
  ipcMain.handle(C.gitBranches, (_event, path: unknown) => gitBranches(path))
  ipcMain.handle(
    C.gitBranchAction,
    (_event, path: unknown, action: GitBranchAction, name: unknown, extra: unknown) =>
      gitBranchAction(path, action, name, extra)
  )
  ipcMain.handle(C.gitLog, (_event, path: unknown, all: unknown, limit: unknown) =>
    gitLog(path, all, limit)
  )
  ipcMain.handle(
    C.gitStash,
    (_event, path: unknown, action: 'list' | 'push' | 'pop' | 'drop', index: unknown) =>
      gitStash(path, action, index)
  )
  ipcMain.handle(C.gitOpenFolder, async (_event, path: unknown) => {
    await shell.openPath(project(path).path)
  })
  ipcMain.handle(C.gitPullRequests, (_event, path: unknown) => gitPullRequests(path))
  ipcMain.handle(
    C.gitPullRequestAction,
    (
      _event,
      path: unknown,
      number: unknown,
      action: 'checkout' | 'merge' | 'squash' | 'close' | 'ready'
    ) => gitPullRequestAction(path, number, action)
  )
  ipcMain.handle(C.gitCreatePullRequest, (_event, path: unknown, input: Record<string, unknown>) =>
    gitCreatePullRequest(path, input ?? {})
  )
  ipcMain.handle(C.gitIssues, (_event, path: unknown, state: unknown) => gitIssues(path, state))
  ipcMain.handle(
    C.gitIssueAction,
    (
      _event,
      path: unknown,
      action: 'create' | 'close' | 'reopen',
      input: Record<string, unknown>
    ) => gitIssueAction(path, action, input ?? {})
  )
  ipcMain.handle(C.gitRuns, (_event, path: unknown) => gitRuns(path))
  ipcMain.handle(C.gitRunAction, (_event, path: unknown, id: unknown, action: 'rerun' | 'cancel') =>
    gitRunAction(path, id, action)
  )
  ipcMain.handle(
    C.gitPublish,
    (_event, path: unknown, account: unknown, name: unknown, privateRepo: unknown) =>
      gitPublish(path, account, name, privateRepo)
  )
  ipcMain.handle(C.gitRepositories, (_event, account: unknown) => gitRepositories(account))
  ipcMain.handle(C.gitClone, (_event, account: unknown, repo: unknown, folder: unknown) =>
    gitClone(account, repo, folder)
  )
  ipcMain.handle(
    C.gitRepositoryAction,
    (_event, account: unknown, repo: unknown, action: GitHubRepositoryAction, value: unknown) =>
      gitRepositoryAction(account, repo, action, value)
  )
  ipcMain.handle(
    C.gitCollaborators,
    (_event, account: unknown, repo: unknown, action: 'list' | 'add' | 'remove', login: unknown) =>
      gitCollaborators(account, repo, action, login)
  )
  ipcMain.handle(
    C.gitSettings,
    (
      _event,
      action:
        'addRoot' | 'removeRoot' | 'addProject' | 'hideProject' | 'setAccount' | 'cloneFolder',
      path: unknown,
      value: unknown
    ) => gitSettings(action, path, value)
  )
  ipcMain.handle(C.gitOpenUrl, async (_event, url: unknown) => {
    if (typeof url === 'string' && /^https:\/\/[\w.-]+\//.test(url)) await shell.openExternal(url)
  })
}
