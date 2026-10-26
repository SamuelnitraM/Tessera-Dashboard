import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * Journal des applications installées : insertion, fenêtre masquée ou réaffichée, style ou
 * parent rétablis, réaffichage demandé… Il sert à comprendre un bloc resté vide. Fichier
 * `%APPDATA%\Tessera Dashboard\logs\applications.log`, 1 Mo au plus (l'ancien est gardé en
 * `.old`). Aucune donnée personnelle : identifiants des applications et état des fenêtres.
 */

const MAX_SIZE = 1_000_000

let file: string | null = null

export function logDocking(message: string): void {
  try {
    if (!file) {
      const folder = join(app.getPath('userData'), 'logs')
      mkdirSync(folder, { recursive: true })
      file = join(folder, 'applications.log')
    }
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
