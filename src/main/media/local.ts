import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { dialog, protocol, shell, type BrowserWindow, type CustomScheme } from 'electron'
import {
  isLocalMediaId,
  isLocalMediaPath,
  LOCAL_AUDIO_EXTENSIONS,
  LOCAL_MEDIA_SCHEME,
  LOCAL_VIDEO_EXTENSIONS,
  localMediaExtension,
  type ExternalPlayer,
  type LocalMediaFile
} from '@shared/local-media'
import { errorText, getTranslation } from '../i18n'
import { JsonStore } from '../json-store'
import { hasPermission } from '../plugins/manifests'
import { systemProgram } from '../executables'

/**
 * Vidéos et musiques du PC (permission `videos`).
 *
 * Règle de sécurité : seuls les fichiers choisis par l'utilisateur (fenêtre de Windows ou
 * glisser-déposer) sont servis, sous un identifiant aléatoire (`tessera-file://<id>/`).
 * La liste est gardée dans `local-media.json` (fichiers récents, position de lecture) ; un
 * fichier retiré de la liste n'est plus lisible.
 */

interface StoredFile {
  id: string
  path: string
  position: number
  duration: number
  openedAt: number
  /** Extensions qui ont ouvert ce fichier : un module ne voit que les siens. */
  owners: string[]
}

/** Fichiers récents gardés (les plus anciens sont oubliés). */
const MAX_FILES = 40

const files = new JsonStore<StoredFile[]>('local-media.json', (input) => {
  if (!Array.isArray(input)) return []
  const number = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
  return input
    .filter(
      (item): item is StoredFile =>
        typeof item === 'object' &&
        item !== null &&
        isLocalMediaId(item.id) &&
        typeof item.path === 'string' &&
        isLocalMediaPath(item.path)
    )
    .map((item) => ({
      id: item.id,
      path: item.path,
      position: number(item.position),
      duration: number(item.duration),
      openedAt: number(item.openedAt),
      owners: Array.isArray(item.owners)
        ? item.owners.filter((owner): owner is string => typeof owner === 'string')
        : []
    }))
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_FILES)
})

export const loadLocalMedia = (): void => void files.load()
export const flushLocalMedia = (): void => files.flush()

function requirePermission(pluginId: string): void {
  if (!hasPermission(pluginId, 'videos')) {
    throw new Error(
      errorText('common', 'missingPermission', { plugin: pluginId, permission: 'videos' })
    )
  }
}

const AUDIO: readonly string[] = LOCAL_AUDIO_EXTENSIONS

function describe(file: StoredFile): LocalMediaFile {
  return {
    id: file.id,
    name: basename(file.path),
    folder: dirname(file.path),
    audio: AUDIO.includes(localMediaExtension(file.path)),
    position: file.position,
    duration: file.duration,
    openedAt: file.openedAt,
    missing: !existsSync(file.path)
  }
}

const samePath = (a: string, b: string): boolean =>
  resolve(a).toLowerCase() === resolve(b).toLowerCase()

/** Ajoute (ou remonte en tête) un fichier choisi par l'utilisateur. */
function remember(path: string, pluginId: string): LocalMediaFile {
  if (!isLocalMediaPath(path)) throw new Error(errorText('common', 'unsupportedFile'))
  if (!existsSync(path) || !statSync(path).isFile())
    throw new Error(errorText('common', 'fileNotFound'))
  const current = files.get()
  const existing = current.find((file) => samePath(file.path, path))
  const file: StoredFile = existing
    ? {
        ...existing,
        openedAt: Date.now(),
        owners: existing.owners.includes(pluginId)
          ? existing.owners
          : [...existing.owners, pluginId]
      }
    : {
        id: randomBytes(16).toString('hex'),
        path: resolve(path),
        position: 0,
        duration: 0,
        openedAt: Date.now(),
        owners: [pluginId]
      }
  files.set([file, ...current.filter((item) => item.id !== file.id)])
  return describe(file)
}

const find = (id: unknown): StoredFile | undefined =>
  isLocalMediaId(id) ? files.get().find((file) => file.id === id) : undefined

// ---------------------------------------------------------------------------
// Choix des fichiers
// ---------------------------------------------------------------------------

export async function openLocalMedia(
  pluginId: string,
  window: BrowserWindow | null
): Promise<LocalMediaFile | null> {
  requirePermission(pluginId)
  const text = getTranslation().dialogs
  const options: Electron.OpenDialogOptions = {
    title: text.pickMedia,
    properties: ['openFile'],
    filters: [
      { name: text.mediaFilter, extensions: [...LOCAL_VIDEO_EXTENSIONS, ...LOCAL_AUDIO_EXTENSIONS] }
    ]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const path = result.filePaths[0]
  if (result.canceled || !path) return null
  return remember(path, pluginId)
}

/** Fichier déposé sur le bloc (chemin donné par le préchargement, pas par la page). */
export function addDroppedMedia(pluginId: string, path: unknown): LocalMediaFile {
  requirePermission(pluginId)
  if (typeof path !== 'string' || !path) throw new Error(errorText('common', 'fileNotFound'))
  return remember(path, pluginId)
}

export function recentLocalMedia(pluginId: string): LocalMediaFile[] {
  requirePermission(pluginId)
  // Fichiers ouverts par ce module ; les anciens (sans propriétaire) : extensions de Tessera
  const builtin = pluginId.startsWith('tessera.')
  return files
    .get()
    .filter((file) => file.owners.includes(pluginId) || (file.owners.length === 0 && builtin))
    .map(describe)
}

export function getLocalMedia(pluginId: string, id: unknown): LocalMediaFile | null {
  requirePermission(pluginId)
  const file = find(id)
  return file ? describe(file) : null
}

export function forgetLocalMedia(pluginId: string, id: unknown): void {
  requirePermission(pluginId)
  files.set(files.get().filter((file) => file.id !== id))
}

/** Position de lecture, envoyée régulièrement par le lecteur (reprise au prochain lancement). */
export function saveLocalMediaPosition(id: unknown, position: unknown, duration: unknown): void {
  const file = find(id)
  if (!file || typeof position !== 'number' || typeof duration !== 'number') return
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return
  // Presque à la fin : le prochain lancement repart du début
  const finished = duration > 0 && position > duration - 5
  files.set(
    files
      .get()
      .map((item) =>
        item.id === file.id
          ? { ...item, position: finished ? 0 : Math.max(0, position), duration }
          : item
      )
  )
}

// ---------------------------------------------------------------------------
// « Ouvrir dans VLC »
// ---------------------------------------------------------------------------

let vlcPath: string | null | undefined

/** Chemin de VLC (dossiers d'installation habituels, sinon le registre), ou `null`. */
function findVlc(): string | null {
  if (vlcPath !== undefined && (vlcPath === null || existsSync(vlcPath))) return vlcPath
  const folders = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(
    (folder): folder is string => !!folder
  )
  vlcPath =
    folders.map((folder) => join(folder, 'VideoLAN', 'VLC', 'vlc.exe')).find(existsSync) ?? null
  if (!vlcPath) {
    try {
      const output = execFileSync(
        systemProgram('reg.exe'),
        ['query', 'HKLM\\SOFTWARE\\VideoLAN\\VLC', '/ve'],
        {
          encoding: 'utf8',
          windowsHide: true
        }
      )
      const found = output.match(/REG_SZ\s+(.+?vlc\.exe)\s*$/im)?.[1]
      if (found && existsSync(found)) vlcPath = found
    } catch {
      // VLC n'est pas installé
    }
  }
  return vlcPath
}

export function hasVlc(pluginId: string): boolean {
  requirePermission(pluginId)
  return findVlc() !== null
}

/**
 * Ouvre le fichier dans VLC, à la position donnée (sans VLC : le lecteur par défaut de
 * Windows, depuis le début).
 */
export async function openLocalMediaExternally(
  pluginId: string,
  id: unknown,
  position: unknown
): Promise<ExternalPlayer> {
  requirePermission(pluginId)
  const file = find(id)
  if (!file || !existsSync(file.path)) throw new Error(errorText('common', 'fileNotFound'))
  const vlc = findVlc()
  if (vlc) {
    const start = typeof position === 'number' && position > 0 ? Math.floor(position) : 0
    const args = [...(start ? [`--start-time=${start}`] : []), file.path]
    spawn(vlc, args, { detached: true, stdio: 'ignore', windowsHide: false }).unref()
    return 'vlc'
  }
  const error = await shell.openPath(file.path)
  if (error) throw new Error(error)
  return 'default'
}

// ---------------------------------------------------------------------------
// Adresse tessera-file://
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  ts: 'video/mp2t',
  m2ts: 'video/mp2t',
  '3gp': 'video/3gpp',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg'
}

/**
 * Déclaration du protocole, à passer à `registerSchemesAsPrivileged` avant `app.whenReady`
 * (voir index.ts) : le lecteur doit pouvoir avancer dans le fichier.
 */
export const localMediaScheme: CustomScheme = {
  scheme: LOCAL_MEDIA_SCHEME,
  privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true }
}

/** Sert les fichiers choisis, par morceaux (déplacement dans la vidéo). */
export function handleLocalMediaProtocol(): void {
  protocol.handle(LOCAL_MEDIA_SCHEME, (request) => {
    const file = find(new URL(request.url).hostname)
    if (!file || !existsSync(file.path)) return new Response(null, { status: 404 })
    const size = statSync(file.path).size
    const headers: Record<string, string> = {
      'Content-Type': MIME[localMediaExtension(file.path)] ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes'
    }
    const range = request.headers.get('Range')?.match(/^bytes=(\d*)-(\d*)$/)
    if (!range) {
      const stream = Readable.toWeb(createReadStream(file.path)) as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: { ...headers, 'Content-Length': String(size) }
      })
    }
    // « bytes=-500 » : les 500 derniers octets
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    const stream = Readable.toWeb(createReadStream(file.path, { start, end })) as ReadableStream
    return new Response(stream, {
      status: 206,
      headers: {
        ...headers,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`
      }
    })
  })
}
