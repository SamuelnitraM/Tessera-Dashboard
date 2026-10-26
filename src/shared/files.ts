/**
 * Module Fichiers (gestionnaire de fichiers et dossiers favoris) : données échangées entre le
 * processus principal et les blocs.
 */

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  /** Taille (octets), `null` pour un dossier. */
  size: number | null
  /** Dernière modification (horodatage). */
  modifiedAt: number
  /** Extension en minuscules, sans le point (`pdf`), vide pour un dossier. */
  extension: string
  hidden: boolean
}

export interface FolderListing {
  path: string
  /** Dossier parent, `null` à la racine d'un lecteur. */
  parent: string | null
  entries: FileEntry[]
  /** Liste coupée (trop d'éléments). */
  truncated: boolean
}

/** Emplacement proposé dans le panneau de gauche (lecteur ou dossier de l'utilisateur). */
export interface FilePlace {
  kind: 'drive' | 'folder'
  /** `desktop`, `documents`… pour un dossier connu ; lettre pour un lecteur. */
  id: string
  name: string
  path: string
}

export interface FileFavorite {
  path: string
  name: string
  isDirectory: boolean
}

/** Résultat d'une ouverture : dans le bloc d'une application installée, ou hors de Tessera. */
export interface OpenResult {
  /** Application installée (affichée dans un bloc) qui a reçu le fichier. */
  appId: string | null
}

/** Résultat d'une opération sur plusieurs fichiers. */
export interface FileOperationResult {
  done: number
  /** Fichiers en échec, avec le message de l'erreur. */
  failed: { path: string; error: string }[]
}

/** Caractères interdits dans un nom de fichier Windows (et caractères de contrôle). */
const INVALID_NAME = /[<>:"/\\|?*]|^\.+$|[. ]$/

export function isValidFileName(name: string): boolean {
  return (
    name.trim().length > 0 &&
    name.length <= 255 &&
    !INVALID_NAME.test(name) &&
    ![...name].some((char) => char.charCodeAt(0) < 32)
  )
}
