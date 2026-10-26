import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ipcMain, type WebContents } from 'electron'
import { spawn as spawnPty, type IPty } from '@lydell/node-pty'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import type { TerminalShell } from '@shared/terminal'

/**
 * Module Terminal : vraies consoles Windows (ConPTY, par node-pty) pour PowerShell, cmd,
 * Git Bash ou WSL. Les sessions vivent dans le processus principal : un bloc qui disparaît
 * (autre page) les retrouve avec leur historique ; elles se ferment avec leur onglet, ou quand
 * Tessera quitte.
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
  if (sessions.size >= MAX_SESSIONS) throw new Error('Trop de terminaux ouverts.')
  const shell = shells.find((item) => item.id === shellId) ?? shells[0]
  if (!shell) throw new Error('Aucun shell trouvé.')
  // Identifiant unique : un onglet qui garde l'ancien après un redémarrage ne se branche jamais
  // sur le shell d'un autre onglet
  const id = `term-${randomUUID()}`
  const pty = spawnPty(shell.file, shell.args, {
    name: 'xterm-256color',
    cols: Math.max(20, Math.min(500, Number(cols) || 80)),
    rows: Math.max(5, Math.min(300, Number(rows) || 24)),
    cwd: folderOrHome(cwd),
    env: { ...process.env, TERM_PROGRAM: 'Tessera' } as Record<string, string>
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
