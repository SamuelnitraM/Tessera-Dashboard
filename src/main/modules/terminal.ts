import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ipcMain, type WebContents } from 'electron'
import { spawn as spawnPty, type IPty } from '@lydell/node-pty'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import type { TerminalShell } from '@shared/terminal'
import { errorText } from '../i18n'

/**
 * Module Terminal : vraies consoles Windows (ConPTY, par node-pty) pour PowerShell, cmd,
 * Git Bash ou WSL. Les sessions vivent dans le processus principal : un bloc qui disparaît
 * (autre page) les retrouve avec leur historique ; elles se ferment avec leur onglet, ou quand
 * Tessera quitte.
 *
 * À chaque invite, le shell signale son dossier courant (séquence OSC 9;9, comme pour Windows
 * Terminal) : l'onglet le retient, et au prochain lancement de Tessera son shell est rouvert dans
 * ce dossier (rien ne tourne pendant que Tessera est fermé).
 */

const MAX_BUFFER = 300_000
const MAX_SESSIONS = 30

interface Session {
  pty: IPty
  shell: string
  /** Sortie récente, renvoyée au bloc qui se rattache. */
  buffer: string
  /** Bloc qui affiche la session (reçoit la sortie). */
  viewer: WebContents | null
  exited: boolean
}

const sessions = new Map<string, Session>()

function findShells(): (TerminalShell & { file: string; args: string[] })[] {
  const system = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')
  const programs = process.env.ProgramFiles ?? 'C:\\Program Files'
  const candidates: (TerminalShell & { file: string; args: string[] })[] = [
    {
      id: 'pwsh',
      name: 'PowerShell 7',
      file: join(programs, 'PowerShell', '7', 'pwsh.exe'),
      args: ['-NoLogo']
    },
    {
      id: 'powershell',
      name: 'Windows PowerShell',
      file: join(system, 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      args: ['-NoLogo']
    },
    { id: 'cmd', name: 'Invite de commandes', file: join(system, 'cmd.exe'), args: [] },
    {
      id: 'bash',
      name: 'Git Bash',
      file: join(programs, 'Git', 'bin', 'bash.exe'),
      args: ['--login', '-i']
    },
    { id: 'wsl', name: 'WSL', file: join(system, 'wsl.exe'), args: [] }
  ]
  return candidates.filter((shell) => existsSync(shell.file))
}

let shells: ReturnType<typeof findShells> | null = null

/** PowerShell : l'invite habituelle (celle du profil comprise), précédée du dossier courant. */
const POWERSHELL_PROMPT = `$__tesseraPrompt = $function:prompt
function global:prompt {
  $location = $executionContext.SessionState.Path.CurrentLocation
  if ($location.Provider.Name -eq 'FileSystem') {
    [Console]::Write("$([char]27)]9;9;$($location.ProviderPath)$([char]7)")
  }
  & $__tesseraPrompt
}`
/** Git Bash et WSL : dossier courant au format du shell (`/c/Users/…`, `/home/…`). */
const POSIX_PROMPT = `printf '\\033]9;9;%s\\007' "$PWD"`

/** Dossier d'un shell WSL (chemin Linux, retenu par l'onglet). */
const LINUX_PATH = /^\/[^\0"\r\n]{0,1000}$/

/**
 * Lancement d'un shell : arguments, variables (invite qui signale le dossier courant) et dossier
 * de départ. `cwd` : dossier retenu par l'onglet, ou dossier de départ du bloc.
 */
function launchOf(
  shell: TerminalShell & { file: string; args: string[] },
  cwd: unknown
): { args: string[]; env: Record<string, string>; cwd: string } {
  const env = { ...process.env, TERM_PROGRAM: 'Tessera' } as Record<string, string>
  switch (shell.id) {
    case 'pwsh':
    case 'powershell': {
      const command = Buffer.from(POWERSHELL_PROMPT, 'utf16le').toString('base64')
      return {
        args: [...shell.args, '-NoExit', '-EncodedCommand', command],
        env,
        cwd: folderOrHome(cwd)
      }
    }
    case 'cmd':
      env.PROMPT = `$e]9;9;$P$e\\${process.env.PROMPT || '$P$G'}`
      return { args: shell.args, env, cwd: folderOrHome(cwd) }
    case 'bash': {
      env.PROMPT_COMMAND = POSIX_PROMPT
      // Sans elle, le profil de Git Bash repart du dossier personnel
      env.CHERE_INVOKING = '1'
      const drive = typeof cwd === 'string' ? /^\/([a-z])(\/.*)?$/i.exec(cwd) : null
      const folder = drive
        ? `${drive[1].toUpperCase()}:${(drive[2] ?? '').replace(/\//g, '\\') || '\\'}`
        : cwd
      return { args: shell.args, env, cwd: folderOrHome(folder) }
    }
    case 'wsl': {
      env.PROMPT_COMMAND = POSIX_PROMPT
      // La variable passe à Linux
      env.WSLENV = `${process.env.WSLENV ? `${process.env.WSLENV}:` : ''}PROMPT_COMMAND/u`
      const linux = typeof cwd === 'string' && LINUX_PATH.test(cwd)
      return {
        args: linux ? [...shell.args, '--cd', cwd] : shell.args,
        env,
        cwd: linux ? homedir() : folderOrHome(cwd)
      }
    }
    default:
      return { args: shell.args, env, cwd: folderOrHome(cwd) }
  }
}

export function listShells(): TerminalShell[] {
  shells ??= findShells()
  return shells.map(({ id, name }) => ({ id, name }))
}

function folderOrHome(cwd: unknown): string {
  if (typeof cwd === 'string' && cwd) {
    try {
      if (statSync(cwd).isDirectory()) return cwd
    } catch {
      // Dossier disparu
    }
  }
  return homedir()
}

export function createSession(
  sender: WebContents,
  shellId: unknown,
  cwd: unknown,
  cols: unknown,
  rows: unknown
): string {
  shells ??= findShells()
  if (sessions.size >= MAX_SESSIONS) throw new Error(errorText('terminal', 'tooMany'))
  const shell = shells.find((item) => item.id === shellId) ?? shells[0]
  if (!shell) throw new Error(errorText('terminal', 'noShell'))
  // Identifiant unique : un onglet qui garde l'ancien après un redémarrage ne se branche jamais
  // sur le shell d'un autre onglet
  const id = `term-${randomUUID()}`
  const launch = launchOf(shell, cwd)
  const pty = spawnPty(shell.file, launch.args, {
    name: 'xterm-256color',
    cols: Math.max(20, Math.min(500, Number(cols) || 80)),
    rows: Math.max(5, Math.min(300, Number(rows) || 24)),
    cwd: launch.cwd,
    env: launch.env
  })
  const session: Session = { pty, shell: shell.id, buffer: '', viewer: sender, exited: false }
  sessions.set(id, session)
  pty.onData((data) => {
    session.buffer = (session.buffer + data).slice(-MAX_BUFFER)
    if (session.viewer && !session.viewer.isDestroyed()) {
      session.viewer.send(C.terminalData, id, data)
    }
  })
  pty.onExit(({ exitCode }) => {
    session.exited = true
    if (session.viewer && !session.viewer.isDestroyed()) {
      session.viewer.send(C.terminalExit, id, exitCode)
    }
  })
  return id
}

/** Un bloc se rattache à une session existante : il reçoit la sortie récente. */
export function attachSession(
  sender: WebContents,
  id: unknown
): { buffer: string; exited: boolean } | null {
  const session = typeof id === 'string' ? sessions.get(id) : undefined
  if (!session) return null
  session.viewer = sender
  return { buffer: session.buffer, exited: session.exited }
}

export function writeSession(id: unknown, data: unknown): void {
  const session = typeof id === 'string' ? sessions.get(id) : undefined
  if (session && !session.exited && typeof data === 'string') session.pty.write(data)
}

export function resizeSession(id: unknown, cols: unknown, rows: unknown): void {
  const session = typeof id === 'string' ? sessions.get(id) : undefined
  if (!session || session.exited) return
  const width = Math.floor(Number(cols))
  const height = Math.floor(Number(rows))
  if (width < 2 || height < 1 || width > 1000 || height > 500) return
  try {
    session.pty.resize(width, height)
  } catch {
    // Shell déjà terminé (sa fin n'est pas encore signalée)
  }
}

export function closeSession(id: unknown): void {
  const session = typeof id === 'string' ? sessions.get(id) : undefined
  if (!session) return
  sessions.delete(id as string)
  if (!session.exited) {
    try {
      session.pty.kill()
    } catch {
      // Déjà terminé
    }
  }
}

export function closeAllSessions(): void {
  for (const id of [...sessions.keys()]) closeSession(id)
}

export function registerTerminalHandlers(): void {
  ipcMain.handle(C.terminalShells, () => listShells())
  ipcMain.handle(
    C.terminalCreate,
    (event, shell: unknown, cwd: unknown, cols: unknown, rows: unknown) =>
      createSession(event.sender, shell, cwd, cols, rows)
  )
  ipcMain.handle(C.terminalAttach, (event, id: unknown) => attachSession(event.sender, id))
  ipcMain.on(C.terminalWrite, (_event, id: unknown, data: unknown) => writeSession(id, data))
  ipcMain.on(C.terminalResize, (_event, id: unknown, cols: unknown, rows: unknown) =>
    resizeSession(id, cols, rows)
  )
  ipcMain.handle(C.terminalClose, (_event, id: unknown) => closeSession(id))
}
