import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import { connect as tlsConnect } from 'node:tls'
import { stat } from 'node:fs/promises'
import { ipcMain, shell } from 'electron'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import {
  MONITOR_INTERVALS,
  type DockerContainer,
  type LocalService,
  type LocalServicesState,
  type MonitoredSite,
  type SiteCheck,
  type SiteStatus
} from '@shared/devtools'
import { helperRequest } from '../headerbar/helper'
import { JsonStore } from '../json-store'
import { notifyFromPlugin } from '../notifications'
import { findProgram, systemProgram } from '../executables'

/**
 * Modules Services locaux (ports en écoute, programme et projet, conteneurs Docker) et
 * Surveillance de sites (disponibilité, temps de réponse, certificat HTTPS, notifications).
 */

function exec(command: string, args: string[], timeout = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    // Chemin complet (System32 ou PATH), jamais un programme du dossier courant
    const executable = command === 'netstat' ? systemProgram('netstat.exe') : findProgram(command)
    if (!executable) {
      reject(new Error('ENOENT'))
      return
    }
    execFile(
      executable,
      args,
      { windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              (error as NodeJS.ErrnoException).code === 'ENOENT'
                ? 'ENOENT'
                : String(stderr || error.message)
                    .trim()
                    .split(/\r?\n/)[0]
            )
          )
        } else resolve(stdout)
      }
    )
  })
}

/* ---------- Services locaux ---------- */

/** Programmes de Windows qu'on ne propose pas d'arrêter. */
const SYSTEM = new Set([
  'system',
  'svchost.exe',
  'lsass.exe',
  'wininit.exe',
  'services.exe',
  'csrss.exe',
  'smss.exe',
  'spoolsv.exe',
  'winlogon.exe',
  'msmpeng.exe',
  'searchindexer.exe',
  'idle'
])

async function listening(): Promise<{ port: number; address: string; pid: number }[]> {
  const output = await exec('netstat', ['-ano', '-p', 'TCP']).catch(() => '')
  const output6 = await exec('netstat', ['-ano', '-p', 'TCPv6']).catch(() => '')
  const found = new Map<string, { port: number; address: string; pid: number }>()
  for (const line of `${output}\n${output6}`.split(/\r?\n/)) {
    // Port en écoute : adresse distante « 0.0.0.0:0 » ou « [::]:0 » (le mot LISTENING est
    // traduit dans certaines versions de Windows : ABHÖREN…)
    const match = /^\s*TCP\s+(\S+):(\d+)\s+(?:0\.0\.0\.0|\[::\]|\*):0\s+\S+\s+(\d+)/i.exec(line)
    if (!match) continue
    const port = Number(match[2])
    const pid = Number(match[3])
    const key = `${port}:${pid}`
    // IPv4 et IPv6 sur le même port : une seule ligne
    if (!found.has(key)) found.set(key, { port, address: match[1], pid })
  }
  return [...found.values()].sort((a, b) => a.port - b.port)
}

/** Dossier du projet d'après la ligne de commande (`C:\projet\node_modules\vite\bin\vite.js`). */
function projectOf(command: string | null, path: string | null): string | null {
  const text = command ?? ''
  const modules = /"?([a-z]:\\[^"]*?)\\node_modules\\/i.exec(text)
  if (modules) return modules[1]
  const script = /"?([a-z]:\\[^"\s]+\.(?:js|mjs|cjs|ts|py|php|rb))"?/i.exec(text)
  if (script) return dirname(script[1])
  // Programme installé (Windows, Program Files, AppData…) : pas un projet
  return path && !/\\(windows|program files[^\\]*|programdata|appdata)\\/i.test(path)
    ? dirname(path)
    : null
}

async function dockerContainers(): Promise<{
  list: DockerContainer[] | null
  error: string | null
}> {
  try {
    const output = await exec('docker', ['ps', '-a', '--format', '{{json .}}'], 10_000)
    const list = output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, string>)
      .map((item) => ({
        id: item.ID,
        name: item.Names,
        image: item.Image,
        state: item.State,
        status: item.Status,
        ports: item.Ports ?? ''
      }))
    return { list, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return message === 'ENOENT' ? { list: null, error: null } : { list: [], error: message }
  }
}

export async function localServices(): Promise<LocalServicesState> {
  const ports = await listening()
  const pids = [...new Set(ports.map((item) => item.pid))].filter((pid) => pid > 4)
  let infos: { pid: number; name: string | null; path: string | null; command: string | null }[] =
    []
  try {
    infos =
      (await helperRequest<{ items: typeof infos | null }>('procs.info', { pids })).items ?? []
  } catch {
    // Sans détails (aide système indisponible)
  }
  const services: LocalService[] = ports.map((item) => {
    const info = infos.find((candidate) => candidate.pid === item.pid)
    const name = info?.name ?? (item.pid === 4 ? 'System' : `PID ${item.pid}`)
    return {
      port: item.port,
      address: item.address,
      pid: item.pid,
      name,
      path: info?.path ?? null,
      command: info?.command ?? null,
      project: projectOf(info?.command ?? null, info?.path ?? null),
      system:
        item.pid <= 4 || SYSTEM.has(name.toLowerCase()) || /\\windows\\/i.test(info?.path ?? '')
    }
  })
  const docker = await dockerContainers()
  return { services, docker: docker.list, dockerError: docker.error }
}

export async function stopProcess(pid: unknown): Promise<void> {
  const id = Math.floor(Number(pid))
  if (!Number.isInteger(id) || id <= 4 || id === process.pid) throw new Error('Programme protégé.')
  const state = await localServices()
  const service = state.services.find((item) => item.pid === id)
  if (!service) throw new Error('Ce programme n’écoute plus sur aucun port.')
  if (service.system) throw new Error('Programme de Windows : il ne peut pas être arrêté ici.')
  process.kill(id)
}

export async function dockerAction(id: unknown, action: unknown): Promise<void> {
  if (typeof id !== 'string' || !/^[a-f0-9]{6,64}$/i.test(id))
    throw new Error('Conteneur invalide.')
  if (action !== 'start' && action !== 'stop' && action !== 'restart')
    throw new Error('Action inconnue.')
  await exec('docker', [action, id], 60_000)
}

/* ---------- Surveillance de sites ---------- */

const PLUGIN = 'tessera.monitor'
const MAX_CHECKS = 288

interface MonitorData {
  sites: MonitoredSite[]
  checks: Record<string, SiteCheck[]>
}

function sanitizeMonitor(input: unknown): MonitorData {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const sites = (Array.isArray(raw.sites) ? raw.sites : [])
    .filter(
      (site): site is MonitoredSite =>
        typeof site === 'object' &&
        site !== null &&
        typeof site.id === 'string' &&
        typeof site.url === 'string' &&
        /^https?:\/\//.test(site.url)
    )
    .slice(0, 100)
    .map((site) => ({
      id: site.id,
      url: site.url,
      name:
        typeof site.name === 'string' && site.name
          ? site.name.slice(0, 100)
          : new URL(site.url).host,
      interval: (MONITOR_INTERVALS as readonly number[]).includes(site.interval)
        ? site.interval
        : 5,
      keyword: typeof site.keyword === 'string' ? site.keyword.slice(0, 200) : ''
    }))
  const checks: Record<string, SiteCheck[]> = {}
  const rawChecks =
    typeof raw.checks === 'object' && raw.checks ? (raw.checks as Record<string, unknown>) : {}
  for (const site of sites) {
    const list = rawChecks[site.id]
    if (Array.isArray(list))
      checks[site.id] = (list as SiteCheck[])
        .filter((item) => typeof item?.at === 'number')
        .slice(-MAX_CHECKS)
  }
  return { sites, checks }
}

const monitor = new JsonStore<MonitorData>('monitor.json', sanitizeMonitor)
const certificates = new Map<string, { days: number | null; at: number }>()
const timers = new Map<string, NodeJS.Timeout>()

function certificateDays(url: string): Promise<number | null> {
  const { hostname, port, protocol } = new URL(url)
  if (protocol !== 'https:') return Promise.resolve(null)
  return new Promise((resolve) => {
    const socket = tlsConnect(
      // Sans vérification : un certificat expiré doit donner un nombre de jours négatif, pas une
      // erreur (la page elle-même est vérifiée normalement par `fetch`)
      {
        host: hostname,
        port: Number(port) || 443,
        servername: hostname,
        timeout: 10_000,
        rejectUnauthorized: false
      },
      () => {
        const validTo = socket.getPeerCertificate()?.valid_to
        socket.end()
        resolve(validTo ? Math.floor((Date.parse(validTo) - Date.now()) / 86_400_000) : null)
      }
    )
    socket.on('error', () => resolve(null))
    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })
  })
}

async function check(site: MonitoredSite): Promise<SiteCheck> {
  const started = Date.now()
  let result: SiteCheck
  try {
    const response = await fetch(site.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Tessera Dashboard (surveillance)' }
    })
    const body = site.keyword ? await response.text() : ''
    // Corps non lu : la connexion est libérée tout de suite
    if (!site.keyword) await response.body?.cancel().catch(() => undefined)
    const ms = Date.now() - started
    const keywordOk = !site.keyword || body.includes(site.keyword)
    result = {
      at: Date.now(),
      ok: response.status < 400 && keywordOk,
      status: response.status,
      ms,
      error:
        response.status >= 400
          ? `HTTP ${response.status}`
          : keywordOk
            ? null
            : 'Texte attendu absent'
    }
  } catch (error) {
    result = {
      at: Date.now(),
      ok: false,
      status: null,
      ms: null,
      error:
        error instanceof Error
          ? error.cause instanceof Error
            ? error.cause.message
            : error.message
          : String(error)
    }
  }
  // Certificat vérifié au plus une fois par jour
  const certificate = certificates.get(site.id)
  if (!certificate || Date.now() - certificate.at > 86_400_000) {
    certificates.set(site.id, {
      days: await certificateDays(site.url).catch(() => null),
      at: Date.now()
    })
  }
  const data = monitor.get()
  const previous = data.checks[site.id]?.at(-1)
  monitor.set({
    ...data,
    checks: {
      ...data.checks,
      [site.id]: [...(data.checks[site.id] ?? []), result].slice(-MAX_CHECKS)
    }
  })
  // Changement d'état : notification (pas au premier contrôle)
  if (previous && previous.ok !== result.ok) {
    void notifyFromPlugin(PLUGIN, {
      title: result.ok ? `${site.name} est de nouveau en ligne` : `${site.name} ne répond plus`,
      body: result.ok ? `${result.ms} ms` : (result.error ?? ''),
      tag: `monitor-${site.id}`
    }).catch(() => undefined)
  }
  return result
}

function scheduleSite(site: MonitoredSite): void {
  const existing = timers.get(site.id)
  if (existing) clearInterval(existing)
  timers.set(
    site.id,
    setInterval(() => void check(site), site.interval * 60_000)
  )
}

export function loadMonitor(): void {
  monitor.load()
  for (const site of monitor.get().sites) {
    scheduleSite(site)
    void check(site)
  }
}

export const flushMonitor = (): void => monitor.flush()

export function monitorState(): SiteStatus[] {
  const data = monitor.get()
  return data.sites.map((site) => ({
    ...site,
    checks: (data.checks[site.id] ?? []).slice(-96),
    certificateDays: certificates.get(site.id)?.days ?? null
  }))
}

export async function saveSite(input: Partial<MonitoredSite>): Promise<SiteStatus[]> {
  let url = typeof input.url === 'string' ? input.url.trim() : ''
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    new URL(url)
  } catch {
    throw new Error('Adresse invalide.')
  }
  const data = monitor.get()
  const id =
    typeof input.id === 'string' && data.sites.some((site) => site.id === input.id)
      ? input.id
      : randomUUID()
  const site: MonitoredSite = {
    id,
    url,
    name:
      typeof input.name === 'string' && input.name.trim()
        ? input.name.trim().slice(0, 100)
        : new URL(url).host,
    interval: (MONITOR_INTERVALS as readonly number[]).includes(input.interval ?? 0)
      ? (input.interval as number)
      : 5,
    keyword: typeof input.keyword === 'string' ? input.keyword.slice(0, 200) : ''
  }
  monitor.set({
    ...data,
    sites: data.sites.some((item) => item.id === id)
      ? data.sites.map((item) => (item.id === id ? site : item))
      : [...data.sites, site]
  })
  certificates.delete(id)
  scheduleSite(site)
  await check(site)
  return monitorState()
}

export function removeSite(id: unknown): SiteStatus[] {
  const data = monitor.get()
  const checks = { ...data.checks }
  delete checks[id as string]
  monitor.set({ sites: data.sites.filter((site) => site.id !== id), checks })
  const timer = timers.get(id as string)
  if (timer) clearInterval(timer)
  timers.delete(id as string)
  return monitorState()
}

export async function checkNow(id: unknown): Promise<SiteStatus[]> {
  const site = monitor.get().sites.find((item) => item.id === id)
  if (site) await check(site)
  return monitorState()
}

export function registerDevtoolsHandlers(): void {
  ipcMain.handle(C.servicesState, () => localServices())
  ipcMain.handle(C.servicesStop, (_event, pid: unknown) => stopProcess(pid))
  ipcMain.handle(C.servicesDocker, (_event, id: unknown, action: unknown) =>
    dockerAction(id, action)
  )
  ipcMain.handle(C.servicesShowFolder, async (_event, path: unknown) => {
    // Un dossier seulement (un .exe serait lancé par openPath)
    if (typeof path !== 'string' || !/^[a-z]:\\/i.test(path)) return
    const info = await stat(path).catch(() => null)
    if (info?.isDirectory()) await shell.openPath(path)
  })
  ipcMain.handle(C.monitorState, () => monitorState())
  ipcMain.handle(C.monitorSave, (_event, input: Partial<MonitoredSite>) => saveSite(input ?? {}))
  ipcMain.handle(C.monitorRemove, (_event, id: unknown) => removeSite(id))
  ipcMain.handle(C.monitorCheck, (_event, id: unknown) => checkNow(id))
}
