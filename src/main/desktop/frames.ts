import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable, Writable } from 'node:stream'
import { join } from 'node:path'
import type {
  FrameActive,
  FrameFocus,
  FrameMiddle,
  FrameCommand,
  FramePan,
  FrameReply,
  FrameWheel
} from '../frame-host/protocol'
import type { SavedWindow } from './saved-window'
import type { Hwnd } from './win32'

/**
 * Cadres des applications installées, créés par l'hébergeur (src/main/frame-host) : un
 * processus séparé, lancé à la première application affichée.
 */

let host: ChildProcessByStdio<Writable, Readable, null> | null = null
let nextId = 1
const pending = new Map<number, (frame: Hwnd) => void>()
let onHostLost: () => void = () => {}
let onPan: (pan: FramePan) => void = () => {}
let onWheel: (wheel: FrameWheel) => void = () => {}
let onActive: (active: FrameActive) => void = () => {}
let onFocus: (focus: FrameFocus) => void = () => {}
let onMiddle: (middle: FrameMiddle) => void = () => {}

/** Clic molette sur le cadre d'une vidéo en plein écran. */
export function setFrameMiddleListener(listener: (middle: FrameMiddle) => void): void {
  onMiddle = listener
}

/** Clavier refusé par une fenêtre insérée (journal). */
export function setFrameFocusListener(listener: (focus: FrameFocus) => void): void {
  onFocus = listener
}

/** Appelé si l'hébergeur s'arrête alors que Tessera tourne (ses cadres ont disparu). */
export function setFrameHostLostListener(listener: () => void): void {
  onHostLost = listener
}

/** Clic gauche + droit sur un cadre rogné : l'utilisateur déplace le contenu. */
export function setFramePanListener(listener: (pan: FramePan) => void): void {
  onPan = listener
}

/** Molette retenue au-dessus d'un cadre, et clic dans son application (bloc actif). */
export function setFrameWheelListeners(listeners: {
  wheel: (wheel: FrameWheel) => void
  active: (active: FrameActive) => void
}): void {
  onWheel = listeners.wheel
  onActive = listeners.active
}

function ensureHost(): ChildProcessByStdio<Writable, Readable, null> {
  if (host) return host
  const child = spawn(process.execPath, [join(import.meta.dirname, 'frame-host.js')], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true,
    // Hors du « job » de Tessera : l'hébergeur doit survivre à un plantage de Tessera
    detached: true
  })
  child.unref()
  // Hébergeur arrêté avant que Tessera ne le sache : une écriture échoue (EPIPE) sans planter
  child.stdin.on('error', () => {})
  let buffer = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk
    for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 1)
      let message: FrameReply
      try {
        message = JSON.parse(line) as FrameReply
      } catch {
        // Ligne illisible : ignorée (relue en boucle, elle bloquait toutes les réponses)
        continue
      }
      if ('pan' in message) {
        onPan(message)
      } else if ('wheel' in message) {
        onWheel(message)
      } else if ('active' in message) {
        onActive(message)
      } else if ('middle' in message) {
        onMiddle(message)
      } else if ('focus' in message) {
        onFocus(message)
      } else if ('id' in message) {
        pending.get(message.id)?.(message.frame)
        pending.delete(message.id)
      }
    }
  })
  child.on('exit', () => {
    host = null
    for (const resolve of pending.values()) resolve(0)
    pending.clear()
    onHostLost()
  })
  // Le canal ne doit pas retenir Tessera à la fermeture
  ;(child.stdin as unknown as { unref?: () => void }).unref?.()
  ;(child.stdout as unknown as { unref?: () => void }).unref?.()
  host = child
  return child
}

/** Tessera en plein écran : chaque cadre créé l'est aussi pour la barre des tâches. */
let fullScreen = false

export function setFramesFullScreen(value: boolean): void {
  fullScreen = value
  if (host) send({ cmd: 'fullScreen', value })
}

function send(command: FrameCommand): void {
  ensureHost().stdin.write(`${JSON.stringify(command)}\n`)
}

/** Nouveau cadre masqué, propriété de la fenêtre de Tessera. `0` si l'hébergeur a échoué. */
export function createFrame(
  owner: Hwnd,
  rect: { x: number; y: number; width: number; height: number }
): Promise<Hwnd> {
  return new Promise((resolve) => {
    const id = nextId++
    pending.set(id, resolve)
    send({ cmd: 'create', id, owner, ...rect, fullScreen })
  })
}

/** La fenêtre est dans son cadre : l'hébergeur la rendra si Tessera disparaît. */
export const adoptWindow = (window: Hwnd, frame: Hwnd, saved: SavedWindow): void =>
  send({ cmd: 'adopt', window, frame, saved })

/** Fenêtre rognée ou non : le clic gauche + droit déplace son contenu. */
export function setFramePannable(frame: Hwnd, value: boolean): void {
  if (host) send({ cmd: 'pannable', frame, value })
}

/**
 * Cadre d'un bloc d'une page qui défile : sa molette fait défiler la page (`always` : même après
 * un clic dans l'application).
 */
export function setFrameWheel(frame: Hwnd, value: boolean, always = false): void {
  if (host) send({ cmd: 'wheel', frame, value, always })
}

/** Cadre d'une vidéo en plein écran : son clic molette bascule la molette page / vidéo. */
export function setFrameMiddle(frame: Hwnd, value: boolean): void {
  if (host) send({ cmd: 'middle', frame, value })
}

/** Tessera a repris la fenêtre : le cadre est détruit (rien à faire si l'hébergeur est arrêté). */
export function releaseFrame(window: Hwnd, frame: Hwnd): void {
  if (host) send({ cmd: 'release', window, frame })
}
