/**
 * Accès aux fichiers des extensions : types et règles partagés entre le processus principal
 * (qui fait les opérations) et l'interface (qui les demande).
 */

/** Un fichier du dossier d'une extension. */
export interface PluginFileEntry {
  name: string
  size: number
  /** Date de dernière modification (millisecondes depuis 1970). */
  modifiedAt: number
}

/**
 * Codes d'erreur renvoyés au renderer, inclus dans le message sous la forme `[code] détail`.
 * - `permission` : l'extension n'a pas demandé la permission `files`
 * - `invalid-name` : nom de fichier refusé (voir `isValidFileName`)
 * - `not-found` : fichier introuvable
 * - `exists` : un fichier porte déjà ce nom
 * - `io` : autre erreur du système de fichiers
 */
export type PluginFileErrorCode = 'permission' | 'invalid-name' | 'not-found' | 'exists' | 'io'

/** Taille maximale d'un fichier écrit par une extension (10 Mo). */
export const MAX_PLUGIN_FILE_SIZE = 10 * 1024 * 1024

const FORBIDDEN_CHARACTERS = /[<>:"/\\|?*]/
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/**
 * Nom de fichier accepté : un simple nom (jamais un chemin), valide sous Windows,
 * qui ne commence pas par un point (réservé aux fichiers temporaires).
 */
export function isValidFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 150 &&
    !name.startsWith('.') &&
    !name.endsWith('.') &&
    name.trim() === name &&
    !FORBIDDEN_CHARACTERS.test(name) &&
    // Caractères de contrôle (tabulation, retour à la ligne…)
    ![...name].some((char) => char.charCodeAt(0) < 32) &&
    !RESERVED_NAMES.test(name)
  )
}

/** Extrait le code d'une erreur reçue du processus principal. */
export function getPluginFileErrorCode(error: unknown): PluginFileErrorCode {
  const match = /\[(permission|invalid-name|not-found|exists|io)\]/.exec(String(error))
  return (match?.[1] as PluginFileErrorCode | undefined) ?? 'io'
}
