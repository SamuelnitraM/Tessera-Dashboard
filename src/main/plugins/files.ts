import { watch, type FSWatcher } from 'node:fs'
import { constants } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve, sep } from 'node:path'
import { app, dialog, shell, type BrowserWindow } from 'electron'
import {
  isValidFileName,
  MAX_PLUGIN_FILE_SIZE,
  type PluginFileEntry,
  type PluginFileErrorCode
} from '@shared/plugin-files'
import { PLUGIN_FILES_ROOT } from '@shared/plugins'
import { errorText, getTranslation } from '../i18n'
import { getPluginManifest, hasPermission } from './manifests'

/**
 * Fichiers des extensions.
 * Chaque extension ayant la permission `files` dispose de son propre dossier :
 * `Documents\Tessera Dashboard\<dossier déclaré dans son manifeste>`. Elle ne peut rien lire
 * ni écrire en dehors : les noms de fichiers sont validés et les chemins vérifiés.
 */

function fileError(code: PluginFileErrorCode, detail: string): Error {
  return new Error(`[${code}] ${detail}`)
}

/** Dossier de l'extension. Refuse si elle n'a pas demandé la permission. */
export function getPluginFolder(pluginId: string): string {
  const manifest = getPluginManifest(pluginId)
  if (!manifest?.files || !hasPermission(pluginId, 'files')) {
    throw fileError(
      'permission',
      errorText('common', 'missingPermission', { plugin: pluginId, permission: 'files' })
    )
  }
  return join(app.getPath('documents'), PLUGIN_FILES_ROOT, manifest.files.folder)
}

async function ensureFolder(pluginId: string): Promise<string> {
  const folder = getPluginFolder(pluginId)
  await mkdir(folder, { recursive: true })
  watchFolder(pluginId, folder)
  return folder
}

/** Chemin complet d'un fichier, après vérification qu'il reste dans le dossier de l'extension. */
async function resolveFile(pluginId: string, name: string): Promise<string> {
  if (typeof name !== 'string' || !isValidFileName(name)) {
    throw fileError('invalid-name', errorText('pluginFiles', 'invalidName', { name: String(name) }))
  }
  const folder = await ensureFolder(pluginId)
  const path = resolve(folder, name)
  if (!path.startsWith(folder + sep))
    throw fileError('invalid-name', errorText('pluginFiles', 'pathRejected'))
  return path
}

async function toEntry(path: string, name: string): Promise<PluginFileEntry> {
  const info = await stat(path)
  return { name, size: info.size, modifiedAt: info.mtimeMs }
}

/** Traduit les erreurs Node (ENOENT…) en codes compréhensibles par l'interface. */
async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Error && /^\[[a-z-]+\]/.test(error.message)) throw error
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') throw fileError('not-found', errorText('common', 'fileNotFound'))
    if (code === 'EEXIST') throw fileError('exists', errorText('pluginFiles', 'exists'))
    throw fileError('io', String(error))
  }
}

export function listFiles(pluginId: string): Promise<PluginFileEntry[]> {
  return guard(async () => {
    const folder = await ensureFolder(pluginId)
    const entries = await readdir(folder, { withFileTypes: true })
    const files = entries.filter((entry) => entry.isFile() && isValidFileName(entry.name))
    return Promise.all(files.map((entry) => toEntry(join(folder, entry.name), entry.name)))
  })
}

export function readPluginFile(pluginId: string, name: string): Promise<string> {
  return guard(async () => readFile(await resolveFile(pluginId, name), 'utf8'))
}

/** Écrit un fichier texte (UTF-8) de façon atomique : fichier temporaire, puis renommage. */
export function writePluginFile(
  pluginId: string,
  name: string,
  content: string
): Promise<PluginFileEntry> {
  return guard(async () => {
    if (typeof content !== 'string') throw fileError('io', errorText('pluginFiles', 'textExpected'))
    if (Buffer.byteLength(content, 'utf8') > MAX_PLUGIN_FILE_SIZE) {
      throw fileError('io', errorText('pluginFiles', 'tooLarge'))
    }
    const path = await resolveFile(pluginId, name)
    const tempPath = join(path, '..', `.${name}.tmp`)
    await writeFile(tempPath, content, 'utf8')
    await rename(tempPath, path)
    return toEntry(path, name)
  })
}

/** Renomme un fichier. Refuse d'écraser un fichier existant. */
export function renamePluginFile(
  pluginId: string,
  from: string,
  to: string
): Promise<PluginFileEntry> {
  return guard(async () => {
    const source = await resolveFile(pluginId, from)
    const target = await resolveFile(pluginId, to)
    // Windows ignore la casse : « Note » -> « note » est un simple changement de casse
    const sameFile = source.toLowerCase() === target.toLowerCase()
    if (!sameFile && (await exists(target))) {
      throw fileError('exists', errorText('pluginFiles', 'exists'))
    }
    await rename(source, target)
    return toEntry(target, to)
  })
}

/** Envoie un fichier à la Corbeille de Windows (récupérable). */
export function trashPluginFile(pluginId: string, name: string): Promise<void> {
  return guard(async () => shell.trashItem(await resolveFile(pluginId, name)))
}

/**
 * Importe des fichiers choisis par l'utilisateur (fenêtre de sélection de Windows) : ils sont
 * copiés dans le dossier de l'extension. Un nom déjà pris reçoit un suffixe « (2) », « (3) »…
 */
export function importPluginFiles(
  pluginId: string,
  window: BrowserWindow | null,
  extensions: unknown
): Promise<PluginFileEntry[]> {
  return guard(async () => {
    const folder = await ensureFolder(pluginId)
    const accepted = Array.isArray(extensions)
      ? extensions.filter(
          (ext): ext is string => typeof ext === 'string' && /^[a-z0-9]{1,10}$/i.test(ext)
        )
      : []
    if (accepted.length === 0)
      throw fileError('invalid-name', errorText('pluginFiles', 'noExtension'))

    const text = getTranslation().dialogs
    const options: Electron.OpenDialogOptions = {
      title: text.importFiles,
      properties: ['openFile', 'multiSelections', 'dontAddToRecent'],
      filters: [{ name: text.acceptedFiles, extensions: accepted }]
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled) return []

    const imported: PluginFileEntry[] = []
    for (const source of result.filePaths) {
      const extension = extname(source).slice(1).toLowerCase()
      if (!accepted.some((ext) => ext.toLowerCase() === extension)) continue
      if ((await stat(source)).size > MAX_PLUGIN_FILE_SIZE) continue

      const name = await freeName(folder, basename(source))
      if (!name) continue
      const target = join(folder, name)
      // COPYFILE_EXCL : ne remplace jamais un fichier existant
      await copyFile(source, target, constants.COPYFILE_EXCL)
      imported.push(await toEntry(target, name))
    }
    return imported
  })
}

/** Premier nom libre dans le dossier : « Note.md », sinon « Note (2).md »… */
async function freeName(folder: string, name: string): Promise<string | null> {
  if (!isValidFileName(name)) return null
  const extension = extname(name)
  const stem = name.slice(0, name.length - extension.length)
  for (let index = 1; index < 1000; index++) {
    const candidate = index === 1 ? name : `${stem} (${index})${extension}`
    if (!(await exists(join(folder, candidate)))) return candidate
  }
  return null
}

/** Ouvre le dossier de l'extension dans l'Explorateur Windows. */
export function openPluginFolder(pluginId: string): Promise<void> {
  return guard(async () => {
    const error = await shell.openPath(await ensureFolder(pluginId))
    if (error) throw fileError('io', error)
  })
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Surveillance des dossiers : prévient l'interface quand un fichier change, y compris
// depuis un autre programme (ex. une note modifiée dans le Bloc-notes de Windows).
// ---------------------------------------------------------------------------

const watchers = new Map<string, FSWatcher>()
let onFolderChange: (pluginId: string) => void = () => {}

export function setPluginFilesListener(listener: (pluginId: string) => void): void {
  onFolderChange = listener
}

function watchFolder(pluginId: string, folder: string): void {
  if (watchers.has(pluginId)) return
  let timer: NodeJS.Timeout | undefined
  try {
    const watcher = watch(folder, (_event, fileName) => {
      // Les fichiers temporaires d'écriture (.nom.tmp) ne comptent pas
      if (fileName?.startsWith('.')) return
      clearTimeout(timer)
      timer = setTimeout(() => onFolderChange(pluginId), 150)
    })
    watcher.on('error', () => {
      watcher.close()
      watchers.delete(pluginId)
    })
    watchers.set(pluginId, watcher)
  } catch (error) {
    console.warn(`[plugin-files] Surveillance impossible de ${folder}`, error)
  }
}
