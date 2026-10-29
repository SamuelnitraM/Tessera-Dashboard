import koffi from 'koffi'
import {
  call,
  createInstance,
  get,
  getObject,
  guid,
  GUID_NULL,
  propVariant,
  propVariantText,
  queryInterface,
  scoped,
  takeTaskString,
  type Pointer,
  type Scope
} from './com'
import { descriptionOf, pathOf } from './processes'

/**
 * Son : sortie et entrée par défaut (volume, sourdine, choix du périphérique) et sessions audio
 * des programmes (volume par programme, niveau du son joué), par Core Audio.
 */

const CLSID_ENUMERATOR = 'BCDE0395-E52F-467C-8E3D-C4579291692E'
const IID_ENUMERATOR = 'A95664D2-9614-4F35-A746-DE8DB63617E6'
const IID_ENDPOINT_VOLUME = '5CDF2C82-841E-4546-9722-0CF74078229A'
const IID_SESSION_MANAGER2 = '77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F'
const IID_SESSION_CONTROL2 = 'bfb7ff88-7239-4fc9-8fa2-07c950be9c6d'
const IID_CHANNEL_VOLUME = '1C158861-B533-4B30-B1CF-E853E51C59B8'
const IID_METER = 'C02216F6-8C67-4B5B-9D00-D008E73E0064'
// Interface non documentée de Windows (utilisée aussi par le panneau Son) pour choisir le
// périphérique par défaut ; stable depuis Windows 7
const CLSID_POLICY_CONFIG = '870AF99C-171D-4F9E-AF0D-E63DF40C2BC9'
const IID_POLICY_CONFIG = 'F8679F50-850A-41CF-9C72-430F290290C8'

const DEVICE_ACTIVE = 1
const CLSCTX_ALL = 23

koffi.struct('SYS_PROPERTYKEY', { fmtid: 'SYS_GUID', pid: 'uint32_t' })
const FRIENDLY_NAME = { fmtid: guid('a45c254e-df1c-4efd-8020-67d146a850e0'), pid: 14 }

/** 0 = sortie, 1 = entrée. */
type Flow = 0 | 1

interface Device {
  id: string
  name: string
  isDefault: boolean
}

interface Endpoint {
  devices: Device[]
  volume: number | null
  muted: boolean
}

function enumerator(scope: Scope): Pointer {
  return scope.add(createInstance(CLSID_ENUMERATOR, IID_ENUMERATOR))
}

/** Périphérique par défaut (rôle console), ou `null` s'il n'y en a pas. */
function defaultDevice(scope: Scope, devices: Pointer, flow: Flow): Pointer | null {
  const out: unknown[] = [null]
  const hr = koffiCall(devices, 4, ['int32_t', 'int32_t', '_Out_ void **'], [flow, 0, out])
  return hr >= 0 && out[0] ? scope.add(out[0]) : null
}

/** Appel dont l'échec est attendu (pas de périphérique) : renvoie le HRESULT. */
function koffiCall(self: Pointer, index: number, params: string[], args: unknown[]): number {
  try {
    return call(self, index, params, args, 'audio')
  } catch (error) {
    return (error as { hr?: number }).hr ?? -1
  }
}

function deviceId(device: Pointer): string {
  return takeTaskString(getObject(device, 5, 'IMMDevice.GetId')) ?? ''
}

function activate(scope: Scope, device: Pointer, iid: string): Pointer {
  const out: unknown[] = [null]
  call(
    device,
    3,
    ['SYS_GUID *', 'uint32_t', 'void *', '_Out_ void **'],
    [guid(iid), CLSCTX_ALL, null, out],
    'IMMDevice.Activate'
  )
  return scope.add(out[0])
}

function friendlyName(scope: Scope, device: Pointer): string | null {
  const store: unknown[] = [null]
  if (koffiCall(device, 4, ['int32_t', '_Out_ void **'], [0 /* STGM_READ */, store]) < 0)
    return null
  scope.add(store[0])
  const value = propVariant()
  if (
    koffiCall(store[0], 5, ['SYS_PROPERTYKEY *', '_Out_ uint8_t *'], [FRIENDLY_NAME, value]) < 0
  ) {
    return null
  }
  return propVariantText(value)
}

function endpointOf(flow: Flow): Endpoint {
  return scoped((scope) => {
    const devices = enumerator(scope)
    const fallback = defaultDevice(scope, devices, flow)
    const defaultId = fallback ? deviceId(fallback) : null
    const collection = scope.add(getCollection(devices, flow))
    const count = get<number>(collection, 3, 'uint32_t', 'IMMDeviceCollection.GetCount')
    const result: Endpoint = { devices: [], volume: null, muted: false }
    for (let index = 0; index < count; index++) {
      const out: unknown[] = [null]
      if (koffiCall(collection, 4, ['uint32_t', '_Out_ void **'], [index, out]) < 0) continue
      const device = scope.add(out[0])
      const id = deviceId(device)
      const isDefault = id === defaultId
      result.devices.push({ id, name: friendlyName(scope, device) ?? id, isDefault })
      if (isDefault) {
        const volume = activate(scope, device, IID_ENDPOINT_VOLUME)
        const level = get<number>(volume, 9, 'float', 'GetMasterVolumeLevelScalar')
        result.volume = Math.round(level * 100)
        result.muted = get<number>(volume, 15, 'int32_t', 'GetMute') !== 0
      }
    }
    return result
  })
}

function getCollection(devices: Pointer, flow: Flow): Pointer {
  const out: unknown[] = [null]
  call(
    devices,
    3,
    ['int32_t', 'uint32_t', '_Out_ void **'],
    [flow, DEVICE_ACTIVE, out],
    'EnumAudioEndpoints'
  )
  return out[0]
}

export function getAudio(): { output: Endpoint; input: Endpoint } {
  return { output: endpointOf(0), input: endpointOf(1) }
}

function withDefaultVolume(flow: Flow, run: (volume: Pointer) => void): void {
  scoped((scope) => {
    const device = defaultDevice(scope, enumerator(scope), flow)
    if (!device) throw new Error('no audio device')
    run(activate(scope, device, IID_ENDPOINT_VOLUME))
  })
}

export function setVolume(flow: Flow, percent: number): void {
  const level = Math.max(0, Math.min(100, percent)) / 100
  withDefaultVolume(flow, (volume) =>
    call(volume, 7, ['float', 'SYS_GUID *'], [level, GUID_NULL], 'SetMasterVolumeLevelScalar')
  )
}

export function setMute(flow: Flow, muted: boolean): void {
  withDefaultVolume(flow, (volume) =>
    call(volume, 14, ['int32_t', 'SYS_GUID *'], [muted ? 1 : 0, GUID_NULL], 'SetMute')
  )
}

/** Périphérique par défaut pour tous les usages (console, multimédia, communications). */
export function setDefault(id: string): void {
  scoped((scope) => {
    // Le périphérique doit exister
    const out: unknown[] = [null]
    call(enumerator(scope), 5, ['const char16_t *', '_Out_ void **'], [id, out], 'GetDevice')
    scope.add(out[0])
    const policy = scope.add(createInstance(CLSID_POLICY_CONFIG, IID_POLICY_CONFIG))
    for (let role = 0; role < 3; role++) {
      call(policy, 13, ['const char16_t *', 'int32_t'], [id, role], 'SetDefaultEndpoint')
    }
  })
}

// ---------------------------------------------------------------------------
// Sessions audio par programme
// ---------------------------------------------------------------------------

/** Sessions de la sortie par défaut (IAudioSessionControl), à libérer par le scope. */
function sessionsOf(scope: Scope): Pointer[] {
  const device = defaultDevice(scope, enumerator(scope), 0)
  if (!device) return []
  const manager = activate(scope, device, IID_SESSION_MANAGER2)
  const list = scope.add(getObject(manager, 5, 'GetSessionEnumerator'))
  if (!list) return []
  const count = get<number>(list, 3, 'int32_t', 'IAudioSessionEnumerator.GetCount')
  const sessions: Pointer[] = []
  for (let index = 0; index < count; index++) {
    const out: unknown[] = [null]
    if (koffiCall(list, 4, ['int32_t', '_Out_ void **'], [index, out]) >= 0 && out[0]) {
      sessions.push(scope.add(out[0]))
    }
  }
  return sessions
}

function processIdOf(scope: Scope, session: Pointer): number {
  const control = scope.add(queryInterface(session, IID_SESSION_CONTROL2))
  if (!control) return 0
  const pid: number[] = [0]
  return koffiCall(control, 14, ['_Out_ uint32_t *'], [pid]) >= 0 ? pid[0] : 0
}

/** Volume (0 à 100) : le plus fort des canaux de la session. */
function volumeOf(channels: Pointer | null): number {
  if (!channels) return 100
  const count: number[] = [0]
  if (koffiCall(channels, 3, ['_Out_ uint32_t *'], [count]) < 0 || count[0] === 0) return 100
  let max = 0
  for (let channel = 0; channel < count[0]; channel++) {
    const level: number[] = [0]
    if (koffiCall(channels, 5, ['uint32_t', '_Out_ float *'], [channel, level]) >= 0) {
      max = Math.max(max, level[0])
    }
  }
  return Math.round(max * 100)
}

export function listSessions(): { items: { pid: number; volume: number }[] } {
  return scoped((scope) => {
    const items: { pid: number; volume: number }[] = []
    for (const session of sessionsOf(scope)) {
      const pid = processIdOf(scope, session)
      if (pid === 0) continue
      items.push({ pid, volume: volumeOf(scope.add(queryInterface(session, IID_CHANNEL_VOLUME))) })
    }
    return { items }
  })
}

interface AudibleSession {
  pid: number
  volume: number
  active: boolean
  peak: number
  path: string | null
  description: string | null
}

/** Sessions des programmes sur la sortie par défaut, avec leur niveau de son. */
export function audibleSessions(): { items: AudibleSession[] } {
  return scoped((scope) => {
    const items: AudibleSession[] = []
    for (const session of sessionsOf(scope)) {
      const pid = processIdOf(scope, session)
      if (pid === 0) continue
      const control = scope.add(queryInterface(session, IID_SESSION_CONTROL2))
      const state: number[] = [0]
      if (!control || koffiCall(control, 3, ['_Out_ int32_t *'], [state]) < 0) state[0] = 0
      const meter = scope.add(queryInterface(session, IID_METER))
      const peak: number[] = [0]
      if (!meter || koffiCall(meter, 3, ['_Out_ float *'], [peak]) < 0) peak[0] = 0
      const path = pathOf(pid)
      items.push({
        pid,
        volume: volumeOf(scope.add(queryInterface(session, IID_CHANNEL_VOLUME))),
        active: state[0] === 1,
        peak: peak[0],
        path,
        description: path ? descriptionOf(path) : null
      })
    }
    return { items }
  })
}

/** Volume (0 à 100) de toutes les sessions de ces programmes, sur tous les canaux. */
export function setSessions(pids: number[], volume: number): void {
  const level = Math.max(0, Math.min(100, volume)) / 100
  scoped((scope) => {
    for (const session of sessionsOf(scope)) {
      if (!pids.includes(processIdOf(scope, session))) continue
      const channels = scope.add(queryInterface(session, IID_CHANNEL_VOLUME))
      if (!channels) continue
      const count: number[] = [0]
      if (koffiCall(channels, 3, ['_Out_ uint32_t *'], [count]) < 0) continue
      for (let channel = 0; channel < count[0]; channel++) {
        koffiCall(channels, 4, ['uint32_t', 'float', 'SYS_GUID *'], [channel, level, GUID_NULL])
      }
    }
  })
}
