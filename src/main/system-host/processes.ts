import { cpus } from 'node:os'
import koffi from 'koffi'

/**
 * Programmes, processeur et réseau : instantané des processus du noyau (nom, temps processeur,
 * mémoire), chemin et ligne de commande d'un processus, charge du processeur (compteur de
 * performances), octets reçus et envoyés par les cartes réseau.
 */

const kernel32 = koffi.load('kernel32.dll')
const ntdll = koffi.load('ntdll.dll')
const version = koffi.load('version.dll')
const iphlpapi = koffi.load('iphlpapi.dll')
const pdh = koffi.load('pdh.dll')

koffi.struct('SYS_PDH_VALUE', { status: 'uint32_t', value: 'double' })
koffi.struct('SYS_IF_ROW2', {
  InterfaceLuid: 'uint64_t',
  InterfaceIndex: 'uint32_t',
  InterfaceGuid: 'SYS_GUID',
  Alias: koffi.array('uint16_t', 257),
  Description: koffi.array('uint16_t', 257),
  PhysicalAddressLength: 'uint32_t',
  PhysicalAddress: koffi.array('uint8_t', 32),
  PermanentPhysicalAddress: koffi.array('uint8_t', 32),
  Mtu: 'uint32_t',
  Type: 'uint32_t',
  TunnelType: 'uint32_t',
  MediaType: 'uint32_t',
  PhysicalMediumType: 'uint32_t',
  AccessType: 'uint32_t',
  DirectionType: 'uint32_t',
  InterfaceAndOperStatusFlags: 'uint8_t',
  OperStatus: 'uint32_t',
  AdminStatus: 'uint32_t',
  MediaConnectState: 'uint32_t',
  NetworkGuid: 'SYS_GUID',
  ConnectionType: 'uint32_t',
  TransmitLinkSpeed: 'uint64_t',
  ReceiveLinkSpeed: 'uint64_t',
  InOctets: 'uint64_t',
  InUcastPkts: 'uint64_t',
  InNUcastPkts: 'uint64_t',
  InDiscards: 'uint64_t',
  InErrors: 'uint64_t',
  InUnknownProtos: 'uint64_t',
  InUcastOctets: 'uint64_t',
  InMulticastOctets: 'uint64_t',
  InBroadcastOctets: 'uint64_t',
  OutOctets: 'uint64_t',
  OutUcastPkts: 'uint64_t',
  OutNUcastPkts: 'uint64_t',
  OutDiscards: 'uint64_t',
  OutErrors: 'uint64_t',
  OutUcastOctets: 'uint64_t',
  OutMulticastOctets: 'uint64_t',
  OutBroadcastOctets: 'uint64_t',
  OutQLen: 'uint64_t'
})

/* eslint-disable @typescript-eslint/no-explicit-any -- signatures décrites par koffi */
const api = {
  OpenProcess: kernel32.func(
    'intptr_t __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'
  ),
  CloseHandle: kernel32.func('bool __stdcall CloseHandle(intptr_t handle)'),
  QueryFullProcessImageNameW: kernel32.func(
    'bool __stdcall QueryFullProcessImageNameW(intptr_t process, uint32_t flags, _Out_ uint8_t *name, _Inout_ uint32_t *size)'
  ),
  NtQuerySystemInformation: ntdll.func(
    'int32_t __stdcall NtQuerySystemInformation(uint32_t kind, void *buffer, uint32_t length, _Out_ uint32_t *returned)'
  ),
  NtQueryInformationProcess: ntdll.func(
    'int32_t __stdcall NtQueryInformationProcess(intptr_t process, uint32_t kind, void *buffer, uint32_t length, _Out_ uint32_t *returned)'
  ),
  GetFileVersionInfoSizeW: version.func(
    'uint32_t __stdcall GetFileVersionInfoSizeW(const char16_t *path, _Out_ uint32_t *handle)'
  ),
  GetFileVersionInfoW: version.func(
    'bool __stdcall GetFileVersionInfoW(const char16_t *path, uint32_t handle, uint32_t size, void *data)'
  ),
  VerQueryValueW: version.func(
    'bool __stdcall VerQueryValueW(void *block, const char16_t *sub, _Out_ void **value, _Out_ uint32_t *length)'
  ),
  GetAdaptersAddresses: iphlpapi.func(
    'uint32_t __stdcall GetAdaptersAddresses(uint32_t family, uint32_t flags, void *reserved, void *buffer, _Inout_ uint32_t *size)'
  ),
  GetIfEntry2: iphlpapi.func('uint32_t __stdcall GetIfEntry2(_Inout_ SYS_IF_ROW2 *row)'),
  PdhOpenQueryW: pdh.func(
    'uint32_t __stdcall PdhOpenQueryW(const char16_t *source, uintptr_t user, _Out_ void **query)'
  ),
  PdhAddEnglishCounterW: pdh.func(
    'uint32_t __stdcall PdhAddEnglishCounterW(void *query, const char16_t *path, uintptr_t user, _Out_ void **counter)'
  ),
  PdhCollectQueryData: pdh.func('uint32_t __stdcall PdhCollectQueryData(void *query)'),
  PdhGetFormattedCounterValue: pdh.func(
    'uint32_t __stdcall PdhGetFormattedCounterValue(void *counter, uint32_t format, _Out_ uint32_t *type, _Out_ SYS_PDH_VALUE *value)'
  )
} as Record<string, (...args: any[]) => any>

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
const STATUS_INFO_LENGTH_MISMATCH = -1073741820 // 0xC0000004

/** Types « tableau de N octets » (copie de la mémoire native), un par taille. */
const byteArrays = new Map<number, ReturnType<typeof koffi.array>>()

/**
 * Mémoire native (le noyau y écrit des pointeurs vers elle-même) : son adresse, et `read()` qui
 * en copie le contenu (Electron refuse les tampons JavaScript posés sur une mémoire externe).
 */
function withNative<T>(
  size: number,
  run: (memory: unknown, base: bigint, read: () => DataView) => T
): T {
  const memory = koffi.alloc('uint8_t', size)
  try {
    let type = byteArrays.get(size)
    if (!type) {
      type = koffi.array('uint8_t', size, 'Typed')
      byteArrays.set(size, type)
    }
    const read = (): DataView => {
      const bytes = koffi.decode(memory, type) as Uint8Array
      return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    }
    return run(memory, koffi.address(memory), read)
  } finally {
    koffi.free(memory)
  }
}

/** Texte UTF-16 de `length` octets à l'adresse `pointer` d'un bloc natif. */
function textAt(view: DataView, base: bigint, pointer: bigint, length: number): string {
  if (pointer === 0n || length === 0) return ''
  const offset = Number(pointer - base)
  return Buffer.from(view.buffer, view.byteOffset + offset, length).toString('utf16le')
}

// ---------------------------------------------------------------------------
// Instantané des processus
// ---------------------------------------------------------------------------

interface ProcessEntry {
  pid: number
  /** Nom de l'exécutable (`chrome.exe`). */
  image: string
  /** Temps processeur consommé (ms). */
  cpuMs: number
  /** Ensemble de travail (octets). */
  workingSet: number
}

/** Tous les processus en un appel (SystemProcessInformation), sans ouvrir aucun d'eux. */
function snapshot(): ProcessEntry[] {
  let size = 1 << 20
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = withNative(size, (memory, base, read) => {
      const returned: number[] = [0]
      const status = api.NtQuerySystemInformation(5, memory, size, returned) as number
      if (status === STATUS_INFO_LENGTH_MISMATCH) return returned[0] + 65_536
      if (status < 0) throw new Error(`NtQuerySystemInformation 0x${(status >>> 0).toString(16)}`)
      const view = read()
      const list: ProcessEntry[] = []
      // SYSTEM_PROCESS_INFORMATION (64 bits) : temps utilisateur 40, noyau 48, nom 56,
      // identifiant 80, ensemble de travail 144
      for (let offset = 0; ;) {
        const next = view.getUint32(offset, true)
        list.push({
          pid: Number(view.getBigUint64(offset + 80, true)),
          image: textAt(
            view,
            base,
            view.getBigUint64(offset + 64, true),
            view.getUint16(offset + 56, true)
          ),
          cpuMs:
            Number(view.getBigInt64(offset + 40, true) + view.getBigInt64(offset + 48, true)) /
            10_000,
          workingSet: Number(view.getBigUint64(offset + 144, true))
        })
        if (next === 0) break
        offset += next
      }
      return list
    })
    if (Array.isArray(result)) return result
    size = result
  }
  throw new Error('process snapshot too large')
}

function withProcess<T>(pid: number, run: (handle: number) => T | null): T | null {
  const handle = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) as number
  if (!handle) return null
  try {
    return run(handle)
  } finally {
    api.CloseHandle(handle)
  }
}

/** Chemin de l'exécutable d'un processus, ou `null` (processus protégé ou terminé). */
export function pathOf(pid: number): string | null {
  return withProcess(pid, (handle) => {
    const buffer = Buffer.alloc(2048)
    const size: number[] = [1024]
    if (!api.QueryFullProcessImageNameW(handle, 0, buffer, size)) return null
    return buffer.toString('utf16le', 0, size[0] * 2)
  })
}

/** Ligne de commande d'un processus (ProcessCommandLineInformation), ou `null`. */
function commandLineOf(pid: number): string | null {
  return withProcess(pid, (handle) => {
    let size = 4096
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = withNative(size, (memory, base, read) => {
        const returned: number[] = [0]
        const status = api.NtQueryInformationProcess(handle, 60, memory, size, returned) as number
        if (
          status === STATUS_INFO_LENGTH_MISMATCH ||
          status === -1073741789 /* BUFFER_TOO_SMALL */
        ) {
          return returned[0] + 64
        }
        if (status < 0) return null
        // UNICODE_STRING en tête : longueur (octets), puis adresse du texte
        const view = read()
        return textAt(view, base, view.getBigUint64(8, true), view.getUint16(0, true))
      })
      if (typeof result !== 'number') return result
      size = result
    }
    return null
  })
}

/** Descriptions des exécutables (« Discord »…), lues une fois par chemin. */
const descriptions = new Map<string, string | null>()

/** Description du fichier (ressource de version), comme dans le Gestionnaire des tâches. */
export function descriptionOf(path: string): string | null {
  if (descriptions.has(path)) return descriptions.get(path)!
  let description: string | null = null
  try {
    const size = api.GetFileVersionInfoSizeW(path, [0]) as number
    if (size > 0) {
      description = withNative(size, (memory) => {
        if (!api.GetFileVersionInfoW(path, 0, size, memory)) return null
        const value: unknown[] = [null]
        const length: number[] = [0]
        const languages: string[] = []
        if (
          api.VerQueryValueW(memory, '\\VarFileInfo\\Translation', value, length) &&
          length[0] >= 4
        ) {
          const [language, codePage] = koffi.decode(value[0], 'uint16_t', 2) as number[]
          languages.push(`${hex4(language)}${hex4(codePage)}`)
        }
        languages.push('040904b0', '040904e4', '04090000')
        for (const code of languages) {
          if (
            api.VerQueryValueW(
              memory,
              `\\StringFileInfo\\${code}\\FileDescription`,
              value,
              length
            ) &&
            length[0] > 0
          ) {
            const text = (koffi.decode(value[0], 'char16_t', -1) as string).trim()
            if (text) return text
          }
        }
        return null
      })
    }
  } catch {
    // Pas de ressource de version
  }
  descriptions.set(path, description)
  return description
}

const hex4 = (value: number): string => value.toString(16).padStart(4, '0')

/** Programmes dont l'exécutable est dans un des dossiers : [pid, chemin]. */
export function processesUnder(folders: string[]): { items: [number, string][] } {
  const prefixes = folders.map((folder) => `${folder.replace(/\\+$/, '')}\\`.toLowerCase())
  const items: [number, string][] = []
  for (const { pid } of snapshot()) {
    if (pid === 0) continue
    const path = pathOf(pid)
    if (path && prefixes.some((prefix) => path.toLowerCase().startsWith(prefix))) {
      items.push([pid, path])
    }
  }
  return { items }
}

/** Nom, chemin et ligne de commande de ces processus (ceux qui existent encore). */
export function processInfos(pids: number[]): {
  items: { pid: number; name: string; path: string | null; command: string | null }[]
} {
  if (pids.length === 0) return { items: [] }
  const wanted = new Set(pids)
  return {
    items: snapshot()
      .filter((entry) => wanted.has(entry.pid))
      .map((entry) => ({
        pid: entry.pid,
        name: entry.image || (entry.pid === 4 ? 'System' : ''),
        path: pathOf(entry.pid),
        command: commandLineOf(entry.pid)
      }))
  }
}

// ---------------------------------------------------------------------------
// Programmes les plus gourmands (bloc Système agrandi)
// ---------------------------------------------------------------------------

let previous = new Map<number, number>()
let previousAt = 0

/**
 * Processeur : temps consommé depuis la mesure précédente, par programme (onglets d'un
 * navigateur regroupés) ; mémoire : ensemble de travail.
 */
export function topProcesses(
  byMemory: boolean,
  limit: number
): { items: { name: string; cpu: number; memory: number; count: number }[] } {
  const now = Date.now()
  const elapsed = previousAt === 0 ? 0 : now - previousAt
  const cores = Math.max(1, cpus().length)
  const current = new Map<number, number>()
  const groups = new Map<string, { name: string; cpu: number; memory: number; count: number }>()
  for (const entry of snapshot()) {
    if (entry.pid === 0) continue
    current.set(entry.pid, entry.cpuMs)
    const before = previous.get(entry.pid)
    const cpu =
      elapsed > 0 && before !== undefined
        ? Math.max(0, ((entry.cpuMs - before) / elapsed / cores) * 100)
        : 0
    const name = entry.image.replace(/\.exe$/i, '') || (entry.pid === 4 ? 'System' : 'Idle')
    const key = name.toLowerCase()
    const group = groups.get(key) ?? { name, cpu: 0, memory: 0, count: 0 }
    group.cpu += cpu
    group.memory += entry.workingSet
    group.count++
    groups.set(key, group)
  }
  previous = current
  previousAt = now
  const list = [...groups.values()]
  for (const item of list) item.cpu = Math.round(Math.min(100, item.cpu) * 10) / 10
  if (byMemory) list.sort((a, b) => b.memory - a.memory)
  else list.sort((a, b) => b.cpu - a.cpu || b.memory - a.memory)
  return { items: list.slice(0, Math.max(0, limit)) }
}

// ---------------------------------------------------------------------------
// Processeur
// ---------------------------------------------------------------------------

let counter: { query: unknown; counter: unknown } | null = null

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Charge du processeur comme le Gestionnaire des tâches (« % Processor Utility », qui tient
 * compte de la fréquence réelle ; le temps processeur classique sous-estime beaucoup).
 */
export async function cpuUsage(): Promise<number> {
  if (!counter) {
    const query: unknown[] = [null]
    if (api.PdhOpenQueryW(null, 0, query) !== 0) throw new Error('PdhOpenQuery')
    const handle: unknown[] = [null]
    // « Processor Utility » n'existe pas sur certains PC : temps processeur classique
    if (
      api.PdhAddEnglishCounterW(
        query[0],
        '\\Processor Information(_Total)\\% Processor Utility',
        0,
        handle
      ) !== 0 &&
      api.PdhAddEnglishCounterW(query[0], '\\Processor(_Total)\\% Processor Time', 0, handle) !== 0
    ) {
      throw new Error('PdhAddCounter')
    }
    counter = { query: query[0], counter: handle[0] }
    api.PdhCollectQueryData(counter.query)
    await sleep(250)
  }
  api.PdhCollectQueryData(counter.query)
  const value: { status?: number; value?: number } = {}
  // PDH_FMT_DOUBLE | PDH_FMT_NOCAP100
  if (api.PdhGetFormattedCounterValue(counter.counter, 0x8200, [0], value) !== 0) return 0
  return Math.round(Math.min(100, Math.max(0, value.value ?? 0)))
}

// ---------------------------------------------------------------------------
// Réseau
// ---------------------------------------------------------------------------

const IF_TYPE_LOOPBACK = 24
const IF_TYPE_TUNNEL = 131
const IF_OPER_UP = 1

/**
 * Octets reçus et envoyés depuis le démarrage par les cartes réseau connectées (ni boucle locale,
 * ni tunnel), comme les statistiques de .NET : cartes de GetAdaptersAddresses, compteurs de
 * GetIfEntry2.
 */
export function networkTotals(): { received: number; sent: number } {
  // Sans adresses, serveurs DNS ni multidiffusion : seulement les cartes
  const flags = 0x1 | 0x2 | 0x4 | 0x8
  const size: number[] = [16_384]
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = withNative(size[0], (memory, base, read) => {
      const status = api.GetAdaptersAddresses(0, flags, null, memory, size) as number
      if (status === 111 /* ERROR_BUFFER_OVERFLOW */) return null
      if (status !== 0) return { received: 0, sent: 0 }
      const view = read()
      let received = 0
      let sent = 0
      // IP_ADAPTER_ADDRESSES (64 bits) : suivante 8, type 100, état 104, LUID 224
      for (let offset = 0; ;) {
        const type = view.getUint32(offset + 100, true)
        if (
          view.getUint32(offset + 104, true) === IF_OPER_UP &&
          type !== IF_TYPE_LOOPBACK &&
          type !== IF_TYPE_TUNNEL
        ) {
          const row: Record<string, unknown> = {
            InterfaceLuid: view.getBigUint64(offset + 224, true)
          }
          if (api.GetIfEntry2(row) === 0) {
            received += Number(row.InOctets)
            sent += Number(row.OutOctets)
          }
        }
        const next = view.getBigUint64(offset + 8, true)
        if (next === 0n) break
        offset = Number(next - base)
      }
      return { received, sent }
    })
    if (result) return result
  }
  return { received: 0, sent: 0 }
}
