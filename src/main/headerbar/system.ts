import { statfs } from 'node:fs/promises'
import { cpus, freemem, totalmem, uptime } from 'node:os'
import type {
  AudioFlow,
  AudioState,
  MediaCommand,
  MediaSession,
  SystemStats,
  TopProcess
} from '@shared/header-bar'
import { helperRequest } from './helper'

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

let thumbnailKey = ''
let thumbnail: string | null = null

/** Nom lisible de l'application (`Spotify.exe`, `SpotifyAB.SpotifyMusic_…!Spotify` -> Spotify). */
function appName(id: string): string {
  const name =
    (id.split('!').pop() ?? id)
      .replace(/\.exe$/i, '')
      .split('.')
      .pop() ?? id
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export async function getMediaSession(): Promise<MediaSession | null> {
  const raw = await helperRequest<RawMedia | null>('media.get')
  if (!raw || (!raw.title && !raw.artist)) return null
  // Pochette lue seulement quand le morceau change
  const key = `${raw.app}\n${raw.title}\n${raw.artist}\n${raw.album}`
  if (key !== thumbnailKey) {
    thumbnailKey = key
    thumbnail = null
    if (raw.hasThumb) {
      try {
        const image = await helperRequest<{ type: string; data: string } | null>('media.thumb')
        const type = /^image\/(png|jpeg|gif|webp|bmp)$/.test(image?.type ?? '')
          ? image?.type
          : 'image/png'
        if (image?.data) thumbnail = `data:${type};base64,${image.data}`
      } catch {
        // Sans pochette
      }
    }
  }
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

export async function sendMediaCommand(action: MediaCommand): Promise<void> {
  if (!MEDIA_COMMANDS.includes(action)) return
  await helperRequest('media.command', { action })
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
