import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Lit un fichier JSON. Renvoie `undefined` s'il n'existe pas ou s'il est illisible :
 * l'appelant retombe alors sur ses valeurs par défaut.
 */
export function readJsonFile(path: string): unknown {
  try {
    // Retire l'éventuel BOM UTF-8 (ajouté par certains éditeurs comme le Bloc-notes)
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(
        `[json-file] Lecture impossible de ${path}, valeurs par défaut utilisées.`,
        error
      )
    }
    return undefined
  }
}

/**
 * Écrit un fichier JSON de façon atomique : on écrit d'abord un fichier temporaire, puis on le
 * renomme. Si l'app plante pendant l'écriture, l'ancien fichier reste intact.
 */
export function writeJsonFile(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tempPath, path)
}
