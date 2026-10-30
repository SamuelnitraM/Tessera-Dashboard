import { statfs } from 'node:fs/promises'
import { cpus, freemem, totalmem, uptime } from 'node:os'
import { basename } from 'node:path'
import { app } from 'electron'
import type {
  AppAudio,
  AudioFlow,
  AudioState,
  MediaCommand,
  MediaSession,
  SystemStats,
  TopProcess
} from '@shared/header-bar'
import { helperRequest } from './helper'
import type { MediaTimeline } from '@shared/spotify'

/**
 * Widgets Média, Son et Système de la barre des pages : lecture en cours, volume et
 * périphériques audio, processeur, mémoire, disque et réseau.
 */

/* ---------- Média en cours ---------- */

interface RawMedia {
  app: string
  title: string
  artist: string
  album: string
  playing: boolean
  canPrevious: boolean
  canNext: boolean
  hasThumb: boolean
}

/** Pochettes lues (par morceau) : la session en avant et celle de Spotify sont lues tour à tour. */
const thumbnails = new Map<string, string | null>()
const MAX_THUMBNAILS = 4

/** Nom lisible de l'application (`Spotify.exe`, `SpotifyAB.SpotifyMusic_…!Spotify` -> Spotify). */
function appName(id: string): string {
  const name =
    (id.split('!').pop() ?? id)
      .replace(/\.exe$/i, '')
      .split('.')
      .pop() ?? id
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Lecture en cours d'après Windows : la session qu'il met en avant, ou celle d'une application
 * (`app` : « Spotify »…), même si une autre est en avant.
 */
export async function getMediaSession(app = ''): Promise<MediaSession | null> {
  const raw = await helperRequest<RawMedia | null>('media.get', { app })
  if (!raw || (!raw.title && !raw.artist)) return null
  // Pochette lue seulement quand le morceau change
  const key = `${raw.app}\n${raw.title}\n${raw.artist}\n${raw.album}`
  if (!thumbnails.has(key)) {
    let thumbnail: string | null = null
    if (raw.hasThumb) {
      try {
        const image = await helperRequest<{ type: string; data: string } | null>('media.thumb', {
          app
        })
        const type = /^image\/(png|jpeg|gif|webp|bmp)$/.test(image?.type ?? '')
          ? image?.type
          : 'image/png'
        if (image?.data) thumbnail = `data:${type};base64,${image.data}`
      } catch {
        // Sans pochette
      }
    }
    thumbnails.set(key, thumbnail)
    for (const old of [...thumbnails.keys()].slice(0, -MAX_THUMBNAILS)) thumbnails.delete(old)
  }
  const thumbnail = thumbnails.get(key) ?? null
  return {
    app: appName(raw.app),
    title: raw.title,
    artist: raw.artist,
    album: raw.album,
    playing: raw.playing,
    canPrevious: raw.canPrevious,
    canNext: raw.canNext,
    thumbnail
  }
}

const MEDIA_COMMANDS: MediaCommand[] = ['play-pause', 'next', 'previous']

/** Commande à la session en avant, ou à celle d'une application (`app`). */
export async function sendMediaCommand(action: MediaCommand, app = ''): Promise<void> {
  if (!MEDIA_COMMANDS.includes(action)) return
  await helperRequest('media.command', { action, app })
}

/** Position et durée du titre en cours (session d'une application), ou `null`. */
export function getMediaTimeline(app: string): Promise<MediaTimeline | null> {
  return helperRequest<MediaTimeline | null>('media.timeline', { app })
}

/** Déplace la lecture du titre en cours (ms). */
export async function seekMedia(app: string, position: number): Promise<void> {
  if (!Number.isFinite(position) || position < 0) return
  await helperRequest('media.seek', { app, position: Math.round(position) })
}

/* ---------- Son ---------- */

export function getAudio(): Promise<AudioState> {
  return helperRequest<AudioState>('audio.get')
}

const isFlow = (flow: unknown): flow is AudioFlow => flow === 'output' || flow === 'input'

export async function setAudioVolume(flow: AudioFlow, value: number): Promise<void> {
  if (!isFlow(flow) || !Number.isFinite(value)) return
  await helperRequest('audio.volume', {
    flow,
    value: Math.round(Math.min(100, Math.max(0, value)))
  })
}

export async function setAudioMute(flow: AudioFlow, value: boolean): Promise<void> {
  if (!isFlow(flow)) return
  await helperRequest('audio.mute', { flow, value: value === true })
}

export async function setAudioDevice(id: string): Promise<void> {
  if (typeof id !== 'string' || !/^\{[0-9a-f.}{-]+$/i.test(id)) return
  await helperRequest('audio.default', { id })
}

/* ---------- Son des programmes ---------- */

interface AudibleSession {
  pid: number
  volume: number
  active: boolean
  peak: number
  path: string | null
  description: string | null
}

/** Un programme reste dans la liste ce temps après le dernier son entendu. */
const HEARD_MS = 20_000
/** Niveau en dessous duquel une session est silencieuse. */
const SILENCE = 0.0005

/** Dernier son entendu de chaque programme. */
const heardAt = new Map<string, number>()
/** Programmes coupés depuis Tessera : leur volume d'avant. */
const mutedApps = new Map<string, number>()
const icons = new Map<string, string | null>()
/** Sessions de chaque programme listé (pour régler son volume). */
let appPids = new Map<string, number[]>()

async function iconOf(path: string): Promise<string | null> {
  if (!icons.has(path)) {
    const icon = await app.getFileIcon(path, { size: 'small' }).catch(() => null)
    icons.set(path, icon && !icon.isEmpty() ? icon.toDataURL() : null)
  }
  return icons.get(path) ?? null
}

/**
 * Programmes qui jouent du son (sortie par défaut), regroupés par exécutable : ceux entendus il y a
 * peu, et ceux dont le volume a été baissé (sinon, coupés, ils disparaîtraient de la liste).
 */
export async function getAppAudio(): Promise<AppAudio[]> {
  const sessions =
    (await helperRequest<{ items: AudibleSession[] | null }>('sessions.audible')).items ?? []
  const now = Date.now()
  const groups = new Map<string, AudibleSession[]>()
  for (const session of sessions) {
    if (!session.path || !session.active) continue
    const id = session.path.toLowerCase()
    groups.set(id, [...(groups.get(id) ?? []), session])
  }
  const list: AppAudio[] = []
  const pids = new Map<string, number[]>()
  for (const [id, group] of groups) {
    if (group.some((session) => session.peak > SILENCE)) heardAt.set(id, now)
    const volume = Math.max(...group.map((session) => session.volume))
    const muted = mutedApps.has(id)
    const heard = now - (heardAt.get(id) ?? 0) < HEARD_MS
    if (!heard && volume >= 100 && !muted) continue
    const path = group[0].path!
    pids.set(
      id,
      group.map((session) => session.pid)
    )
    list.push({
      id,
      name: group[0].description?.trim() || basename(path).replace(/\.exe$/i, ''),
      icon: await iconOf(path),
      volume: muted ? (mutedApps.get(id) ?? volume) : volume,
      muted
    })
  }
  appPids = pids
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

/** Sessions audio d'un programme d'après son exécutable (`spotify.exe`), qu'il joue ou non. */
async function programSessions(exe: string): Promise<AudibleSession[]> {
  const sessions =
    (await helperRequest<{ items: AudibleSession[] | null }>('sessions.audible')).items ?? []
  return sessions.filter((session) => session.path && basename(session.path).toLowerCase() === exe)
}

/**
 * Volume d'un programme (bloc et widget Spotify), même en pause ; `null` s'il n'a pas de session
 * audio. La sourdine est celle du widget Son (même programme, même état).
 */
export async function getProgramVolume(
  exe: string
): Promise<{ volume: number; muted: boolean } | null> {
  const list = await programSessions(exe)
  if (list.length === 0) return null
  const id = list[0].path!.toLowerCase()
  const muted = mutedApps.has(id)
  return {
    volume: muted ? (mutedApps.get(id) ?? 100) : Math.max(...list.map((session) => session.volume)),
    muted
  }
}

export async function setProgramVolume(
  exe: string,
  change: { volume?: number; muted?: boolean }
): Promise<void> {
  const list = await programSessions(exe)
  if (list.length === 0) return
  const id = list[0].path!.toLowerCase()
  const pids = list.map((session) => session.pid)
  if (change.muted === true) {
    if (!mutedApps.has(id)) mutedApps.set(id, Math.max(...list.map((session) => session.volume)))
    await helperRequest('sessions.set', { pids, volume: 0 })
    return
  }
  const volume =
    typeof change.volume === 'number' && Number.isFinite(change.volume)
      ? change.volume
      : (mutedApps.get(id) ?? 100)
  mutedApps.delete(id)
  await helperRequest('sessions.set', {
    pids,
    volume: Math.round(Math.max(0, Math.min(100, volume)))
  })
}

/** Volume (0 à 100) ou sourdine d'un programme de la liste. */
export async function setAppVolume(
  id: string,
  change: { volume?: number; muted?: boolean }
): Promise<void> {
  const pids = typeof id === 'string' ? appPids.get(id) : undefined
  if (!pids) return
  if (change.muted === true) {
    const current = (await getAppAudio()).find((item) => item.id === id)
    mutedApps.set(id, current?.volume ?? 100)
    await helperRequest('sessions.set', { pids, volume: 0 })
    return
  }
  const volume =
    typeof change.volume === 'number' && Number.isFinite(change.volume)
      ? change.volume
      : (mutedApps.get(id) ?? 100)
  mutedApps.delete(id)
  await helperRequest('sessions.set', {
    pids,
    volume: Math.round(Math.max(0, Math.min(100, volume)))
  })
}

/* ---------- Système ---------- */

let previousCpu: { idle: number; total: number } | null = null
let previousNetwork: { received: number; sent: number; at: number } | null = null

/** Mesure du processeur : chaque seconde tant qu'on l'affiche, arrêtée sinon. */
const CPU_SAMPLE_MS = 1000
const CPU_IDLE_MS = 10_000
let cpuValue = 0
let cpuTimer: NodeJS.Timeout | null = null
let cpuWantedAt = 0
/** Première mesure après un arrêt (attendue par toutes les demandes qui arrivent ensemble). */
let cpuFirst: Promise<void> = Promise.resolve()

/** Charge du processeur : celle du Gestionnaire des tâches (aide système), sinon `os.cpus`. */
async function sampleCpu(): Promise<void> {
  try {
    cpuValue = await helperRequest<number>('cpu.get')
  } catch {
    cpuValue = cpuUsage()
  }
}

/**
 * Charge du processeur, mesurée une fois par seconde comme le Gestionnaire des tâches : la
 * barre des pages et les blocs Système montrent tous la même valeur (chacun la demandait avant
 * à son rythme, et obtenait la moyenne depuis la demande d'un autre).
 */
async function cpuLoad(): Promise<number> {
  cpuWantedAt = Date.now()
  if (!cpuTimer) {
    cpuTimer = setInterval(() => {
      if (Date.now() - cpuWantedAt > CPU_IDLE_MS && cpuTimer) {
        clearInterval(cpuTimer)
        cpuTimer = null
        return
      }
      void sampleCpu()
    }, CPU_SAMPLE_MS)
    cpuFirst = sampleCpu()
  }
  await cpuFirst
  return cpuValue
}

function cpuUsage(): number {
  let idle = 0
  let total = 0
  for (const cpu of cpus()) {
    idle += cpu.times.idle
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle
  }
  const previous = previousCpu
  previousCpu = { idle, total }
  if (!previous || total === previous.total) return 0
  return Math.round(100 * (1 - (idle - previous.idle) / (total - previous.total)))
}

async function networkRate(): Promise<SystemStats['network']> {
  try {
    const totals = await helperRequest<{ received: number; sent: number }>('net.get')
    const now = Date.now()
    const previous = previousNetwork
    previousNetwork = { ...totals, at: now }
    if (!previous || now === previous.at) return null
    const seconds = (now - previous.at) / 1000
    return {
      down: Math.max(0, (totals.received - previous.received) / seconds),
      up: Math.max(0, (totals.sent - previous.sent) / seconds)
    }
  } catch {
    return null
  }
}

/** Programmes les plus gourmands (bloc Système agrandi). */
export async function getTopProcesses(sort: 'cpu' | 'memory'): Promise<TopProcess[]> {
  const result = await helperRequest<{ items: TopProcess[] }>('procs.top', { sort, limit: 12 })
  return result.items
}

/** `network` : débit réseau aussi (il passe par l'aide système). */
export async function getSystemStats(network: boolean): Promise<SystemStats> {
  const drive = process.env.SystemDrive || 'C:'
  const [cpu, disk, rate] = await Promise.all([
    cpuLoad(),
    statfs(`${drive}\\`)
      .then((stats) => ({
        drive,
        total: stats.blocks * stats.bsize,
        used: (stats.blocks - stats.bfree) * stats.bsize
      }))
      .catch(() => null),
    network ? networkRate() : Promise.resolve(null)
  ])
  return {
    cpu,
    memory: { used: totalmem() - freemem(), total: totalmem() },
    disk,
    network: rate,
    uptime: Math.round(uptime())
  }
}
