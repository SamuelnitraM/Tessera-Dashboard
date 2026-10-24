import { execFile } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { open } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { app, dialog, type BrowserWindow } from 'electron'
import type { IntegrationErrorCode } from '@shared/integrations'
import { getTranslation } from '../../i18n'

/**
 * Dossier `%APPDATA%` où les autres applications rangent leurs données (variable d'environnement,
 * comme le fait l'Explorateur ; à défaut, celui de Windows).
 */
export const roamingAppData = (): string => process.env.APPDATA || app.getPath('appData')

/** Erreur lisible par l'interface (`getIntegrationErrorCode`). */
export function integrationError(code: IntegrationErrorCode, detail: string): Error {
  return new Error(`[${code}] ${detail}`)
}

/**
 * Lit un fichier JSON d'une autre application, sans jamais échouer : `undefined` s'il est absent,
 * illisible ou invalide (l'application peut être en train de l'écrire). Le BOM éventuel est ignoré.
 */
export function readJson(path: string): unknown {
  try {
    const text = readFileSync(path, 'utf8')
    // Fichiers écrits par .NET : marque d'ordre des octets (BOM) possible en tête
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
  } catch {
    return undefined
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Valeur d'un objet JSON, quelle que soit la casse de la clé (`RootFolders` ou `rootFolders`). */
export function field(source: unknown, key: string): unknown {
  if (!isRecord(source)) return undefined
  const lower = key.toLowerCase()
  const found = Object.keys(source).find((candidate) => candidate.toLowerCase() === lower)
  return found === undefined ? undefined : source[found]
}

export const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []

export const isDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

export const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/** Le programme tourne-t-il ? (recherche par nom d'image, visible même s'il est administrateur) */
export function isImageRunning(image: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'tasklist',
      ['/FI', `IMAGENAME eq ${image}`, '/FO', 'CSV', '/NH'],
      { windowsHide: true },
      (error, stdout) =>
        resolve(!error && stdout.toLowerCase().includes(`"${image.toLowerCase()}"`))
    )
  })
}

/** Taille maximale lue à la fin d'un journal (les dernières lignes suffisent). */
const TAIL_BYTES = 256 * 1024

/** Dernières lignes d'un fichier texte (UTF-8), sans le charger en entier. */
export async function tailLines(path: string, count: number): Promise<string[]> {
  const handle = await open(path, 'r')
  try {
    const { size } = await handle.stat()
    const length = Math.min(size, TAIL_BYTES)
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, size - length)
    const lines = buffer.toString('utf8').replace(/\r\n?/g, '\n').split('\n')
    // Première ligne incomplète si la lecture commence au milieu du fichier
    if (length < size) lines.shift()
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return lines.slice(-count)
  } finally {
    await handle.close()
  }
}

/** Nombre entier borné (nombre de lignes demandé par l'interface…). */
export const clampInteger = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback

/**
 * Fenêtre de sélection de Windows pour choisir l'exécutable d'une application.
 * `expected` : nom de fichier attendu (ex. `DevLauncher.exe`) ; `defaultPath` : proposition.
 */
export async function pickExecutable(
  window: BrowserWindow | null,
  expected: string,
  defaultPath: string | null
): Promise<string | null> {
  const text = getTranslation().dialogs
  const options: Electron.OpenDialogOptions = {
    title: text.pickProgram,
    defaultPath: defaultPath && existsSync(dirname(defaultPath)) ? defaultPath : expected,
    properties: ['openFile', 'dontAddToRecent'],
    filters: [{ name: expected, extensions: ['exe'] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const path = result.filePaths[0]
  if (result.canceled || !path) return null
  if (!/\.exe$/i.test(path) || !isFile(path)) throw integrationError('invalid', basename(path))
  return path
}
