import { join } from 'node:path'
import { app } from 'electron'

/**
 * Dossier des ressources (icônes, sons…).
 * En développement : le dossier `resources/` du projet.
 * Une fois packagée : le dossier `resources/` à côté de l'exécutable.
 */
export function getResourcePath(...segments: string[]): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(app.getAppPath(), 'resources')
  return join(base, ...segments)
}
