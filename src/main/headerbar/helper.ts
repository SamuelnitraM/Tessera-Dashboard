import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { app } from 'electron'
import script from './system-helper.ps1?raw'
import { POWERSHELL } from '../executables'

/**
 * Aide système des widgets Média, Son et Système (et des modules Jeux et Services locaux) : un
 * petit processus lancé à la demande, qui parle aux contrôles multimédias de Windows (WinRT), à
 * Core Audio et au noyau. Par défaut l'exécutable de Tessera en mode Node (src/main/system-host,
 * appels directs à Windows via koffi) ; PowerShell (system-helper.ps1, même protocole) seulement
 * s'il ne démarre pas ou s'arrête à répétition. Une requête JSON par ligne ; arrêté après
 * quelques minutes sans requête.
 */

const IDLE_MS = 3 * 60_000
const TIMEOUT_MS = 10_000

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

let child: ChildProcessWithoutNullStreams | null = null
let nextId = 1
const pending = new Map<number, Pending>()
let idleTimer: NodeJS.Timeout | null = null
/** Arrêts inattendus récents : au-delà de 3 en une minute, l'aide n'est plus relancée un moment. */
let crashes: number[] = []
let pausedUntil = 0
/**
 * Aide utilisée : la native, ou PowerShell si la native s'est arrêtée 3 fois en une minute
 * (jusqu'au prochain lancement de Tessera).
 */
let backend: 'native' | 'powershell' = 'native'

/** Copie du script dans les données de Tessera (PowerShell exécute un fichier). */
function scriptPath(): string {
  const folder = join(app.getPath('userData'), 'helpers')
  const path = join(folder, 'system-helper.ps1')
  // BOM : PowerShell 5 lirait sinon le fichier dans la page de code du système (accents)
  const content = `\ufeff${script.replace(/^\ufeff/, '')}`
  let current = ''
  try {
    current = readFileSync(path, 'utf8')
  } catch {
    // Pas encore copié
  }
  if (current !== content) {
    mkdirSync(folder, { recursive: true })
    writeFileSync(path, content, 'utf8')
  }
  return path
}

function start(): ChildProcessWithoutNullStreams {
  const helper =
    backend === 'native'
      ? spawn(process.execPath, [join(import.meta.dirname, 'system-host.js')], {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
          windowsHide: true
        })
      : spawn(
          POWERSHELL,
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath()],
          { windowsHide: true }
        )
  // Aide arrêtée avant que Tessera ne le sache : une écriture échoue (EPIPE) sans planter
  helper.stdin.on('error', () => {})
  helper.stdout.setEncoding('utf8')
  createInterface({ input: helper.stdout }).on('line', (line) => {
    let message: { id?: number; ok?: boolean; data?: unknown; error?: string }
    try {
      message = JSON.parse(line.replace(/^\ufeff/, ''))
    } catch {
      return
    }
    if (typeof message.id !== 'number') return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    clearTimeout(request.timer)
    if (message.ok) request.resolve(message.data ?? null)
    else request.reject(new Error(message.error ?? 'helper error'))
  })
  // Erreurs de l'aide : ignorées (chaque requête a sa propre réponse d'erreur)
  helper.stderr.resume()
  helper.on('exit', () => {
    if (child === helper) child = null
    for (const [id, request] of pending) {
      clearTimeout(request.timer)
      request.reject(new Error('helper stopped'))
      pending.delete(id)
    }
    if (!stopping) {
      const now = Date.now()
      crashes = [...crashes.filter((time) => now - time < 60_000), now]
      if (crashes.length >= 3) {
        if (backend === 'native') {
          // L'aide native ne tient pas sur ce PC : PowerShell prend le relais
          backend = 'powershell'
          crashes = []
        } else {
          pausedUntil = now + 5 * 60_000
        }
      }
    }
    stopping = false
  })
  helper.on('error', () => undefined)
  return helper
}

let stopping = false

export function stopHelper(): void {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = null
  if (!child) return
  stopping = true
  child.stdin.end()
  child.kill()
  child = null
}

/** Envoie une commande à l'aide (lancée au besoin) et attend sa réponse. */
export function helperRequest<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (Date.now() < pausedUntil) return Promise.reject(new Error('helper unavailable'))
  child ??= start()
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(stopHelper, IDLE_MS)
  const id = nextId++
  const helper = child
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('helper timeout'))
    }, TIMEOUT_MS)
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
    helper.stdin.write(`${JSON.stringify({ id, cmd, args })}\n`)
  })
}
