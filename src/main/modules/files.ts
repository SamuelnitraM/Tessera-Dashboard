import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, parse, resolve } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell, type WebContents } from 'electron'
import koffi from 'koffi'
import {
  isValidFileName,
  type FileEntry,
  type FileFavorite,
  type FileOperationResult,
  type FilePlace,
  type FolderListing,
  type OpenResult
} from '@shared/files'
import { BuiltinChannels } from '@shared/builtin-ipc'
import { isDesktopApp } from '@shared/user-apps'
import { broadcast } from '../broadcast'
import { getAppStates } from '../desktop/docking'
import { JsonStore } from '../json-store'
import { getSettings } from '../settings-store'

/**
 * Module Fichiers : parcourir, rechercher, copier, déplacer, renommer, mettre à la corbeille,
 * glisser-déposer avec l'Explorateur, dossiers favoris.
 *
 * Ouverture d'un fichier : son application habituelle (celle de Windows). Si cette application
 * est affichée dans un bloc de Tessera, le fichier lui est passé et s'ouvre dans le bloc ;
 * sinon il s'ouvre hors de Tessera.
 */

const MAX_ENTRIES = 5000
const MAX_RESULTS = 300
const SEARCH_DEPTH = 8

const kernel32 = koffi.load('kernel32.dll')
const shlwapi = koffi.load('shlwapi.dll')
const GetFileAttributesW = kernel32.func('uint32_t __stdcall GetFileAttributesW(str16 path)') as (
  path: string
) => number
const GetLogicalDrives = kernel32.func('uint32_t __stdcall GetLogicalDrives()') as () => number
const AssocQueryStringW = shlwapi.func(
  'int __stdcall AssocQueryStringW(uint32_t flags, int str, str16 assoc, str16 extra, _Out_ uint16_t *out, _Inout_ uint32_t *length)'
) as (
  flags: number,
  str: number,
  assoc: string,
  extra: string | null,
  out: Uint16Array,
  length: number[]
) => number

const FILE_ATTRIBUTE_HIDDEN = 0x2
const FILE_ATTRIBUTE_SYSTEM = 0x4
const INVALID_ATTRIBUTES = 0xffffffff
const ASSOCSTR_EXECUTABLE = 2

function isHidden(path: string, name: string): boolean {
  if (name.startsWith('.')) return true
  const attributes = GetFileAttributesW(path)
  return (
    attributes !== INVALID_ATTRIBUTES &&
    (attributes & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM)) !== 0
  )
}

/** Chemin absolu normalisé, ou erreur. */
function absolute(path: unknown): string {
  if (typeof path !== 'string' || !path.trim() || path.length > 4000) throw new Error('chemin')
  const full = resolve(path)
  if (!/^[a-z]:\\/i.test(full) && !full.startsWith('\\\\')) throw new Error('chemin')
  return full
}

function paths(list: unknown): string[] {
  return Array.isArray(list) ? list.slice(0, 2000).map(absolute) : []
}

async function entryOf(path: string, name: string): Promise<FileEntry | null> {
  try {
    const info = await stat(path)
    const isDirectory = info.isDirectory()
    return {
      name,
      path,
      isDirectory,
      size: isDirectory ? null : info.size,
      modifiedAt: info.mtimeMs,
      extension: isDirectory ? '' : extname(name).slice(1).toLowerCase(),
      hidden: isHidden(path, name)
    }
  } catch {
    // Fichier verrouillé ou supprimé entre-temps
    return null
  }
}

export async function listFolder(path: string): Promise<FolderListing> {
  const folder = absolute(path)
  const names = (await readdir(folder)).slice(0, MAX_ENTRIES + 1)
  const entries = (
    await Promise.all(names.slice(0, MAX_ENTRIES).map((name) => entryOf(join(folder, name), name)))
  ).filter((entry): entry is FileEntry => entry !== null)
  const parent = dirname(folder)
  return {
    path: folder,
    parent: parent === folder ? null : parent,
    entries,
    truncated: names.length > MAX_ENTRIES
  }
}

export function listPlaces(): FilePlace[] {
  const folders: FilePlace[] = (
    ['desktop', 'documents', 'downloads', 'pictures', 'music', 'videos', 'home'] as const
  ).flatMap((id) => {
    try {
      const path = app.getPath(id)
      return existsSync(path) ? [{ kind: 'folder' as const, id, name: basename(path), path }] : []
    } catch {
      return []
    }
  })
  const mask = GetLogicalDrives()
  const drives: FilePlace[] = []
  for (let index = 0; index < 26; index += 1) {
    if (!(mask & (1 << index))) continue
    const letter = String.fromCharCode(65 + index)
    drives.push({ kind: 'drive', id: letter, name: `${letter}:`, path: `${letter}:\\` })
  }
  return [...folders, ...drives]
}

/** Recherche par nom (sans accents ni majuscules), dans le dossier et ses sous-dossiers. */
export async function searchFiles(path: string, query: string): Promise<FileEntry[]> {
  const root = absolute(path)
  const normalize = (text: string): string =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  const words = normalize(String(query)).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const results: FileEntry[] = []
  const queue: { folder: string; depth: number }[] = [{ folder: root, depth: 0 }]
  const started = Date.now()
  while (queue.length > 0 && results.length < MAX_RESULTS && Date.now() - started < 8000) {
    const { folder, depth } = queue.shift()!
    let names: string[]
    try {
      names = await readdir(folder)
    } catch {
      continue
    }
    for (const name of names) {
      const full = join(folder, name)
      if (words.every((word) => normalize(name).includes(word))) {
        const entry = await entryOf(full, name)
        if (entry) results.push(entry)
        if (results.length >= MAX_RESULTS) break
      }
      if (depth < SEARCH_DEPTH && !name.startsWith('.') && name !== 'node_modules') {
        try {
          if ((await stat(full)).isDirectory()) queue.push({ folder: full, depth: depth + 1 })
        } catch {
          // Inaccessible
        }
      }
    }
  }
  return results
}

/** `rapport.pdf` déjà présent : `rapport (2).pdf`. */
function freeName(folder: string, name: string): string {
  if (!existsSync(join(folder, name))) return join(folder, name)
  const { name: stem, ext } = parse(name)
  for (let index = 2; ; index += 1) {
    const candidate = join(folder, `${stem} (${index})${ext}`)
    if (!existsSync(candidate)) return candidate
  }
}

async function eachPath(
  list: string[],
  run: (path: string) => Promise<void>
): Promise<FileOperationResult> {
  const result: FileOperationResult = { done: 0, failed: [] }
  for (const path of list) {
    try {
      await run(path)
      result.done += 1
    } catch (error) {
      result.failed.push({ path, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return result
}

/** Un dossier ne se copie ni ne se déplace dans lui-même. */
function insideItself(source: string, target: string): boolean {
  const from = source.toLowerCase()
  const to = target.toLowerCase()
  return to === from || to.startsWith(`${from}\\`)
}

export function copyFiles(sources: unknown, target: unknown): Promise<FileOperationResult> {
  const folder = absolute(target)
  return eachPath(paths(sources), async (source) => {
    if (insideItself(source, folder)) throw new Error('dossier dans lui-même')
    await cp(source, freeName(folder, basename(source)), {
      recursive: true,
      errorOnExist: true,
      force: false
    })
  })
}

export function moveFiles(sources: unknown, target: unknown): Promise<FileOperationResult> {
  const folder = absolute(target)
  return eachPath(paths(sources), async (source) => {
    if (dirname(source).toLowerCase() === folder.toLowerCase()) return
    if (insideItself(source, folder)) throw new Error('dossier dans lui-même')
    const destination = freeName(folder, basename(source))
    try {
      await rename(source, destination)
    } catch (error) {
      // Autre lecteur : copie puis suppression
      if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
      await cp(source, destination, { recursive: true, errorOnExist: true, force: false })
      await rm(source, { recursive: true, force: true })
    }
  })
}

export async function renameFile(path: unknown, name: unknown): Promise<string> {
  const source = absolute(path)
  if (typeof name !== 'string' || !isValidFileName(name)) throw new Error('nom')
  const destination = join(dirname(source), name.trim())
  if (destination.toLowerCase() !== source.toLowerCase() && existsSync(destination)) {
    throw new Error('existe')
  }
  await rename(source, destination)
  return destination
}

export async function createFolder(parent: unknown, name: unknown): Promise<string> {
  const folder = absolute(parent)
  if (typeof name !== 'string' || !isValidFileName(name)) throw new Error('nom')
  const path = freeName(folder, name.trim())
  await mkdir(path)
  return path
}

export function trashFiles(list: unknown): Promise<FileOperationResult> {
  return eachPath(paths(list), (path) => shell.trashItem(path))
}

/** Programme ouvert par Windows pour cette extension (`.pdf` -> `C:\…\firefox.exe`). */
function defaultProgram(extension: string): string | null {
  if (!extension) return null
  const out = new Uint16Array(1024)
  const length = [out.length]
  if (AssocQueryStringW(0, ASSOCSTR_EXECUTABLE, extension, 'open', out, length) !== 0) return null
  const path = String.fromCharCode(...out.subarray(0, Math.max(0, length[0] - 1)))
  return /\.exe$/i.test(path) && existsSync(path) ? path : null
}

/**
 * Ouvre un fichier ou un dossier. Fichier : dans le bloc de son application habituelle si elle
 * est affichée dans Tessera, sinon hors de Tessera.
 */
export async function openFile(path: unknown): Promise<OpenResult> {
  const full = absolute(path)
  if ((await stat(full)).isFile()) {
    const program = defaultProgram(extname(full).toLowerCase())
    if (program) {
      const states = getAppStates()
      const target = getSettings()
        .apps.items.filter(isDesktopApp)
        .find(
          (candidate) =>
            states[candidate.id]?.status === 'running' &&
            (candidate.path.toLowerCase() === program.toLowerCase() ||
              candidate.processName.toLowerCase() === basename(program).toLowerCase())
        )
      if (target) {
        // L'application déjà ouverte reçoit le fichier (navigateurs, éditeurs : nouvel onglet)
        const child = spawn(program, [full], { detached: true, stdio: 'ignore' })
        child.on('error', () => undefined)
        child.unref()
        return { appId: target.id }
      }
    }
  }
  const error = await shell.openPath(full)
  if (error) throw new Error(error)
  return { appId: null }
}

/* ---------- Icônes ---------- */

const icons = new Map<string, string | null>()

/** Icônes Windows (une par extension, sauf les programmes et raccourcis qui ont la leur). */
export async function fileIcons(list: unknown): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  for (const path of paths(list).slice(0, 400)) {
    const extension = extname(path).toLowerCase()
    const own = ['.exe', '.lnk', '.ico', '.url', ''].includes(extension)
    const key = own ? path.toLowerCase() : extension
    if (!icons.has(key)) {
      try {
        icons.set(key, (await app.getFileIcon(path, { size: 'small' })).toDataURL())
      } catch {
        icons.set(key, null)
      }
    }
    result[path] = icons.get(key) ?? null
  }
  return result
}

/** Aperçu réduit d'une image (vue en grille). */
export async function imageThumbnail(path: unknown): Promise<string | null> {
  try {
    const image = await nativeImage.createThumbnailFromPath(absolute(path), {
      width: 160,
      height: 120
    })
    return image.isEmpty() ? null : image.toDataURL()
  } catch {
    return null
  }
}

/** Glisser des fichiers vers l'Explorateur, une autre application ou un autre bloc. */
function startDrag(sender: WebContents, list: unknown): void {
  const files = paths(list).filter((path) => existsSync(path))
  if (files.length === 0) return
  // Icône du premier fichier si elle est déjà connue (la liste l'a demandée), sinon un point
  const extension = extname(files[0]).toLowerCase()
  const known = icons.get(extension) ?? icons.get(files[0].toLowerCase())
  sender.startDrag({
    file: files[0],
    files,
    icon: nativeImage.createFromDataURL(known ?? TRANSPARENT_PIXEL)
  })
}

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/* ---------- Favoris ---------- */

function sanitizeFavorites(input: unknown): FileFavorite[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (item): item is FileFavorite =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.path === 'string' &&
        typeof item.name === 'string' &&
        typeof item.isDirectory === 'boolean'
    )
    .slice(0, 100)
}

const favorites = new JsonStore<FileFavorite[]>('favorites.json', sanitizeFavorites)

export const loadFavorites = (): void => void favorites.load()
export const flushFavorites = (): void => favorites.flush()

async function setFavorite(path: unknown, on: boolean): Promise<void> {
  const full = absolute(path)
  const list = favorites.get().filter((item) => item.path.toLowerCase() !== full.toLowerCase())
  if (on) {
    const isDirectory = (await stat(full)).isDirectory()
    list.push({ path: full, name: basename(full) || full, isDirectory })
  }
  favorites.set(list)
  broadcast(BuiltinChannels.filesFavoritesChanged, favorites.get())
}

function reorderFavorites(list: unknown): void {
  const order = paths(list).map((path) => path.toLowerCase())
  const current = favorites.get()
  favorites.set(
    [...current].sort(
      (a, b) => order.indexOf(a.path.toLowerCase()) - order.indexOf(b.path.toLowerCase())
    )
  )
  broadcast(BuiltinChannels.filesFavoritesChanged, favorites.get())
}

export function registerFilesHandlers(): void {
  ipcMain.handle(BuiltinChannels.filesList, (_event, path: string) => listFolder(path))
  ipcMain.handle(BuiltinChannels.filesPlaces, () => listPlaces())
  ipcMain.handle(BuiltinChannels.filesSearch, (_event, path: string, query: string) =>
    searchFiles(path, query)
  )
  ipcMain.handle(BuiltinChannels.filesCopy, (_event, sources: unknown, target: unknown) =>
    copyFiles(sources, target)
  )
  ipcMain.handle(BuiltinChannels.filesMove, (_event, sources: unknown, target: unknown) =>
    moveFiles(sources, target)
  )
  ipcMain.handle(BuiltinChannels.filesRename, (_event, path: unknown, name: unknown) =>
    renameFile(path, name)
  )
  ipcMain.handle(BuiltinChannels.filesCreateFolder, (_event, parent: unknown, name: unknown) =>
    createFolder(parent, name)
  )
  ipcMain.handle(BuiltinChannels.filesTrash, (_event, list: unknown) => trashFiles(list))
  ipcMain.handle(BuiltinChannels.filesOpen, (_event, path: unknown) => openFile(path))
  ipcMain.handle(BuiltinChannels.filesShow, (_event, path: unknown) =>
    shell.showItemInFolder(absolute(path))
  )
  ipcMain.handle(BuiltinChannels.filesIcons, (_event, list: unknown) => fileIcons(list))
  ipcMain.handle(BuiltinChannels.filesThumbnail, (_event, path: unknown) => imageThumbnail(path))
  ipcMain.on(BuiltinChannels.filesDrag, (event, list: unknown) => startDrag(event.sender, list))
  ipcMain.handle(BuiltinChannels.filesFavorites, () => favorites.get())
  ipcMain.handle(BuiltinChannels.filesSetFavorite, (_event, path: unknown, on: boolean) =>
    setFavorite(path, on === true)
  )
  ipcMain.handle(BuiltinChannels.filesReorderFavorites, (_event, list: unknown) =>
    reorderFavorites(list)
  )
  ipcMain.handle(BuiltinChannels.filesPickFolder, async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    const options = { properties: ['openDirectory' as const] }
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
