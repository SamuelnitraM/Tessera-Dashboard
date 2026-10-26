import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, ipcMain, nativeImage, shell } from 'electron'
import { BuiltinChannels } from '@shared/builtin-ipc'
import type { Game, GameStatus } from '@shared/games'
import { launchApp } from '../desktop/docking'
import { addApp, iconOf } from '../desktop/programs'
import * as w from '../desktop/win32'
import { helperRequest } from '../headerbar/helper'

/**
 * Module Jeux : bibliothèques Steam et Epic Games installées sur le PC. Les jeux se lancent
 * toujours hors de Tessera (par leur lanceur) ; le bloc règle le volume du jeu lui-même (ses
 * sessions audio, pas le volume de Windows).
 */

const CACHE_MS = 60_000
/** Outils de Steam qui ne sont pas des jeux. */
const STEAM_TOOLS = new Set(['228980', '1070560', '1391110', '1628350', '1493710', '250820'])

/* ---------- Format VDF de Steam (clés et valeurs entre guillemets, blocs entre accolades) ---------- */

type Vdf = { [key: string]: string | Vdf }

export function parseVdf(text: string): Vdf {
  const tokens = text.match(/"((?:\\.|[^"\\])*)"|[{}]/g) ?? []
  let index = 0
  const read = (): Vdf => {
    const object: Vdf = {}
    while (index < tokens.length) {
      const token = tokens[index++]
      if (token === '}') break
      const key = token.slice(1, -1).toLowerCase()
      const next = tokens[index++]
      if (next === '{') object[key] = read()
      else if (next !== undefined) object[key] = next.slice(1, -1).replace(/\\\\/g, '\\')
    }
    return object
  }
  return read()
}

/** Images du cache de Steam déjà lues (réduites une fois par lancement). */
const steamImages = new Map<string, Promise<string | null>>()

/** Image du cache de Steam (petite, en `data:`), ou `null` si Steam ne l'a pas. */
function steamCachedImage(root: string, appId: string, file: string): Promise<string | null> {
  const key = `${appId}/${file}`
  let image = steamImages.get(key)
  if (!image) {
    image = readSteamImage(root, appId, file)
    steamImages.set(key, image)
  }
  return image
}

async function readSteamImage(root: string, appId: string, file: string): Promise<string | null> {
  const folder = join(root, 'appcache', 'librarycache', appId)
  // Steam range ses images dans le dossier du jeu, parfois dans un sous-dossier
  const candidates = [join(folder, file)]
  try {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(join(folder, entry.name, file))
    }
  } catch {
    return null
  }
  const found = candidates.find((path) => existsSync(path))
  if (!found) return null
  const image = nativeImage.createFromPath(found)
  if (image.isEmpty()) return null
  return image.resize({ width: 300, quality: 'good' }).toDataURL()
}

const child = (vdf: Vdf | string | undefined, key: string): Vdf | undefined =>
  typeof vdf === 'object' ? (vdf[key] as Vdf | undefined) : undefined
const value = (vdf: Vdf | string | undefined, key: string): string =>
  typeof vdf === 'object' && typeof vdf[key] === 'string' ? (vdf[key] as string) : ''

function steamPath(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      'reg',
      ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'],
      { windowsHide: true, timeout: 5000 },
      (_error, stdout) => {
        const match = /SteamPath\s+REG_SZ\s+(.+)/.exec(stdout ?? '')
        const path = match?.[1].trim().replace(/\//g, '\\') ?? null
        resolve(path && existsSync(path) ? path : null)
      }
    )
  })
}

/** Temps de jeu (minutes) et dernière partie, d'après le profil Steam le plus récent. */
async function steamPlaytimes(
  root: string
): Promise<Map<string, { minutes: number; last: number }>> {
  const result = new Map<string, { minutes: number; last: number }>()
  const userdata = join(root, 'userdata')
  let users: string[]
  try {
    users = await readdir(userdata)
  } catch {
    return result
  }
  const configs = await Promise.all(
    users.map(async (user) => {
      const path = join(userdata, user, 'config', 'localconfig.vdf')
      try {
        return { path, time: (await stat(path)).mtimeMs }
      } catch {
        return null
      }
    })
  )
  const latest = configs
    .filter((item): item is { path: string; time: number } => item !== null)
    .sort((a, b) => b.time - a.time)[0]
  if (!latest) return result
  const vdf = parseVdf(await readFile(latest.path, 'utf8'))
  const apps = child(
    child(child(child(child(vdf, 'userlocalconfigstore'), 'software'), 'valve'), 'steam'),
    'apps'
  )
  for (const [appId, entry] of Object.entries(apps ?? {})) {
    if (typeof entry !== 'object') continue
    result.set(appId, {
      minutes: Number(value(entry, 'playtime')) || 0,
      last: (Number(value(entry, 'lastplayed')) || 0) * 1000
    })
  }
  return result
}

async function steamGames(): Promise<Game[]> {
  const root = await steamPath()
  if (!root) return []
  let libraries: string[] = [root]
  try {
    const vdf = parseVdf(await readFile(join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8'))
    const folders = child(vdf, 'libraryfolders') ?? {}
    libraries = Object.values(folders)
      .map((folder) => value(folder, 'path'))
      .filter(Boolean)
  } catch {
    // Bibliothèque par défaut seulement
  }
  const playtimes = await steamPlaytimes(root)
  const games: Game[] = []
  for (const library of new Set(libraries.map((path) => path.toLowerCase()))) {
    const steamapps = join(library, 'steamapps')
    let names: string[]
    try {
      names = (await readdir(steamapps)).filter((name) => /^appmanifest_\d+\.acf$/.test(name))
    } catch {
      continue
    }
    for (const name of names) {
      try {
        const state = child(parseVdf(await readFile(join(steamapps, name), 'utf8')), 'appstate')
        const appId = value(state, 'appid')
        if (!appId || STEAM_TOOLS.has(appId)) continue
        const title = value(state, 'name')
        if (/redistributable|proton|steam linux runtime|steamvr/i.test(title)) continue
        const time = playtimes.get(appId)
        // Jaquettes du cache de Steam (toujours là pour un jeu installé), sinon son site : les
        // jeux récents n'ont plus d'image à l'adresse habituelle du site
        const cdn = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}`
        games.push({
          id: `steam:${appId}`,
          launcher: 'steam',
          name: title,
          installDir: join(steamapps, 'common', value(state, 'installdir')),
          cover:
            (await steamCachedImage(root, appId, 'library_600x900.jpg')) ??
            `${cdn}/library_600x900.jpg`,
          fallbackCover: (await steamCachedImage(root, appId, 'header.jpg')) ?? `${cdn}/header.jpg`,
          icon: null,
          sizeOnDisk: Number(value(state, 'sizeondisk')) || null,
          playtimeMinutes: time?.minutes ?? null,
          lastPlayed: time?.last || (Number(value(state, 'lastplayed')) || 0) * 1000 || null
        })
      } catch {
        // Manifeste illisible
      }
    }
  }
  return games
}

interface EpicManifest {
  DisplayName?: string
  AppName?: string
  CatalogNamespace?: string
  CatalogItemId?: string
  InstallLocation?: string
  LaunchExecutable?: string
  InstallSize?: number
  AppCategories?: string[]
  bIsIncompleteInstall?: boolean
}

async function epicGames(): Promise<Game[]> {
  const folder = join(
    process.env.ProgramData ?? 'C:\\ProgramData',
    'Epic',
    'EpicGamesLauncher',
    'Data',
    'Manifests'
  )
  let names: string[]
  try {
    names = (await readdir(folder)).filter((name) => name.endsWith('.item'))
  } catch {
    return []
  }
  const games: Game[] = []
  for (const name of names) {
    try {
      const item = JSON.parse(await readFile(join(folder, name), 'utf8')) as EpicManifest
      if (item.bIsIncompleteInstall || !item.AppName || !item.InstallLocation) continue
      if (item.AppCategories && !item.AppCategories.includes('games')) continue
      const executable = item.LaunchExecutable
        ? join(item.InstallLocation, item.LaunchExecutable)
        : null
      let icon: string | null = null
      if (executable && existsSync(executable)) {
        try {
          icon = (await app.getFileIcon(executable, { size: 'large' })).toDataURL()
        } catch {
          // Sans icône
        }
      }
      games.push({
        id: `epic:${item.CatalogNamespace}:${item.CatalogItemId}:${item.AppName}`,
        launcher: 'epic',
        name: item.DisplayName ?? item.AppName,
        installDir: item.InstallLocation,
        cover: null,
        fallbackCover: null,
        icon,
        sizeOnDisk: item.InstallSize ?? null,
        playtimeMinutes: null,
        lastPlayed: null
      })
    } catch {
      // Manifeste illisible
    }
  }
  return games
}

let cache: { games: Game[]; at: number } | null = null

export async function listGames(force = false): Promise<Game[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.games
  const games = [...(await steamGames()), ...(await epicGames())].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
  cache = { games, at: Date.now() }
  return games
}

/** Lance un jeu par son lanceur (hors de Tessera). */
export async function launchGame(id: string): Promise<void> {
  const game = (await listGames()).find((candidate) => candidate.id === id)
  if (!game) throw new Error('jeu inconnu')
  if (game.launcher === 'steam') {
    await shell.openExternal(`steam://rungameid/${id.slice('steam:'.length)}`)
  } else {
    const [, namespace, catalogItem, appName] = id.split(':')
    await shell.openExternal(
      `com.epicgames.launcher://apps/${encodeURIComponent(`${namespace}:${catalogItem}:${appName}`)}?action=launch&silent=true`
    )
  }
}

/** Volume coupé par Tessera : volume d'avant, pour le rétablir. */
const mutedVolumes = new Map<string, number>()
/** Derniers jeux en cours : le réglage du volume ne refait pas toute la recherche. */
let lastStatuses: { list: GameStatus[]; at: number } = { list: [], at: 0 }
const STATUS_REUSE_MS = 10_000

/** Jeux en cours (programme lancé depuis leur dossier) et leur volume. */
export async function gameStatuses(): Promise<GameStatus[]> {
  const games = await listGames()
  if (games.length === 0) return []
  const running = await helperRequest<{ items: [number, string][] | null }>('procs.under', {
    folders: games.map((game) => game.installDir)
  })
  const processes = (running.items ?? []).map(([pid, path]) => ({ pid, path: path.toLowerCase() }))
  if (processes.length === 0) {
    lastStatuses = { list: [], at: Date.now() }
    return []
  }
  const sessions = (
    await helperRequest<{ items: { pid: number; volume: number }[] | null }>('sessions.list')
  ).items
  const list = games.flatMap((game) => {
    const folder = `${game.installDir.toLowerCase().replace(/\\$/, '')}\\`
    const pids = processes.filter((process) => process.path.startsWith(folder)).map((p) => p.pid)
    if (pids.length === 0) return []
    const session = (sessions ?? []).find((item) => pids.includes(item.pid))
    const muted = mutedVolumes.has(game.id)
    return [
      {
        id: game.id,
        pids,
        hasAudio: !!session,
        volume: muted ? (mutedVolumes.get(game.id) ?? 100) : (session?.volume ?? 100),
        muted
      }
    ]
  })
  lastStatuses = { list, at: Date.now() }
  return list
}

/** Jeu en cours, d'après la dernière vérification si elle est récente. */
async function runningGame(id: string): Promise<GameStatus | undefined> {
  const recent = Date.now() - lastStatuses.at < STATUS_REUSE_MS
  const found = recent ? lastStatuses.list.find((item) => item.id === id) : undefined
  return found ?? (await gameStatuses()).find((item) => item.id === id)
}

/** Volume (0 à 100) ou sourdine d'un jeu en cours. */
export async function setGameVolume(
  id: string,
  change: { volume?: number; muted?: boolean }
): Promise<void> {
  const status = await runningGame(id)
  if (!status) return
  if (change.muted === true) {
    mutedVolumes.set(id, status.volume)
    await helperRequest('sessions.set', { pids: status.pids, volume: 0 })
    return
  }
  const volume =
    typeof change.volume === 'number' ? change.volume : (mutedVolumes.get(id) ?? status.volume)
  mutedVolumes.delete(id)
  await helperRequest('sessions.set', { pids: status.pids, volume: Math.round(volume) })
}

/** Fenêtre principale d'un jeu en cours (la plus grande de ses programmes), ou `null`. */
function gameWindow(status: GameStatus): { pid: number; path: string } | null {
  for (const pid of status.pids) {
    const path = w.getProcessPath(pid)
    if (!path) continue
    const found = w
      .findTopWindows(basename(path))
      .find(
        (candidate) => candidate.pid === pid && candidate.width >= 400 && candidate.height >= 300
      )
    if (found) return { pid, path }
  }
  return null
}

/**
 * « Afficher dans le bloc » : la fenêtre du jeu en cours devient une application installée de
 * Tessera (rendue au bureau, jamais fermée, quand le bloc ne l'affiche plus), insérée tout de
 * suite. Renvoie son identifiant, ou `null` si le jeu n'a pas (encore) de fenêtre.
 */
export async function captureGame(id: string): Promise<string | null> {
  const game = (await listGames()).find((item) => item.id === id)
  const status = (await gameStatuses()).find((item) => item.id === id)
  if (!game || !status) return null
  const found = gameWindow(status)
  if (!found) return null
  const desktopApp = addApp({
    name: game.name,
    path: found.path,
    args: '',
    processName: basename(found.path),
    icon: game.icon ?? (await iconOf(found.path)),
    release: 'desktop'
  })
  // Déjà ouvert : la fenêtre est insérée (même si elle avait été rendue au bureau avant)
  void launchApp(desktopApp.id)
  return desktopApp.id
}

export function registerGamesHandlers(): void {
  ipcMain.handle(BuiltinChannels.gamesCapture, (_event, id: string) => captureGame(String(id)))
  ipcMain.handle(BuiltinChannels.gamesList, (_event, force: boolean) => listGames(force === true))
  ipcMain.handle(BuiltinChannels.gamesLaunch, (_event, id: string) => launchGame(String(id)))
  ipcMain.handle(BuiltinChannels.gamesStatus, () => gameStatuses())
  ipcMain.handle(
    BuiltinChannels.gamesSetVolume,
    (_event, id: string, change: { volume?: number; muted?: boolean }) =>
      setGameVolume(String(id), {
        volume: typeof change?.volume === 'number' ? change.volume : undefined,
        muted: typeof change?.muted === 'boolean' ? change.muted : undefined
      })
  )
}
