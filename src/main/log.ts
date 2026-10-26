import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { open } from 'node:fs/promises'
import { join } from 'node:path'
import { app, shell } from 'electron'
import type { LogName } from '@shared/ipc'

/**
 * Journaux de Tessera, dans `%APPDATA%\Tessera Dashboard\logs\`, 2 Mo au plus chacun (l'ancien
 * est gardé en `.old`). Aucune donnée personnelle : identifiants des applications, état des
 * fenêtres, type et cause des plantages.
 * - `applications.log` : applications installées (insertion, fenêtre masquée ou réaffichée,
 *   style ou parent rétablis…). Il sert à comprendre un bloc resté vide.
 * - `tessera.log` : erreurs et plantages (processus principal, pages, processus enfants),
 *   erreurs des mises à jour.
 */

const MAX_SIZE = 2_000_000
/** Fin du journal montrée dans les paramètres (octets). */
const READ_SIZE = 256_000

const FILES: Record<LogName, string> = {
  tessera: 'tessera.log',
  applications: 'applications.log'
}

const folder = (): string => join(app.getPath('userData'), 'logs')

let folderReady = false

function writeLog(name: LogName, message: string): void {
  try {
    if (!folderReady) {
      mkdirSync(folder(), { recursive: true })
      folderReady = true
    }
    const file = join(folder(), FILES[name])
    try {
      if (statSync(file).size > MAX_SIZE) renameSync(file, `${file}.old`)
    } catch {
      // Pas encore de journal
    }
    appendFileSync(file, `${new Date().toISOString()} ${message}\n`)
  } catch {
    // Le journal est facultatif : une erreur d'écriture n'empêche rien
  }
}

export const logDocking = (message: string): void => writeLog('applications', message)

export const logApp = (message: string): void => writeLog('tessera', message)

/** Fin du journal (les dernières lignes entières), vide s'il n'existe pas encore. */
export async function readLog(name: LogName): Promise<string> {
  let handle: Awaited<ReturnType<typeof open>> | null = null
  try {
    handle = await open(join(folder(), FILES[name]), 'r')
    const { size } = await handle.stat()
    const start = Math.max(0, size - READ_SIZE)
    const buffer = Buffer.alloc(size - start)
    await handle.read(buffer, 0, buffer.length, start)
    const text = buffer.toString('utf8')
    // Coupé au milieu d'une ligne : elle est retirée
    return start > 0 ? text.slice(text.indexOf('\n') + 1) : text
  } catch {
    return ''
  } finally {
    await handle?.close()
  }
}

export async function openLogsFolder(): Promise<void> {
  mkdirSync(folder(), { recursive: true })
  await shell.openPath(folder())
}

/** Erreurs et plantages notés dans `tessera.log` (sans changer leur traitement habituel). */
export function watchCrashes(): void {
  // Observateur seulement : Electron affiche toujours son message d'erreur habituel
  process.on('uncaughtExceptionMonitor', (error, origin) =>
    logApp(`[principal] ${origin} : ${error.stack ?? error.message}`)
  )
  app.on('render-process-gone', (_event, contents, details) =>
    logApp(`[page] ${contents.getType()} arrêtée : ${details.reason} (code ${details.exitCode})`)
  )
  app.on('child-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return
    logApp(
      `[processus] ${details.name ?? details.type} arrêté : ${details.reason} (code ${details.exitCode})`
    )
  })
}
