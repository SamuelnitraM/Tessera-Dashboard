import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import koffi from 'koffi'
import type {
  FrameActive,
  FrameCommand,
  FramePan,
  FrameReply,
  FrameWheel,
  MouseCommand
} from './protocol'

/**
 * Hébergeur des cadres des applications installées : un petit processus séparé, lancé par
 * Tessera avec son propre exécutable en mode Node (ELECTRON_RUN_AS_NODE, sans Chromium).
 *
 * Pourquoi un processus séparé ? Une fenêtre insérée dans un cadre est détruite avec lui. Si
 * le cadre appartenait à Tessera et que Tessera plantait, l'application perdrait sa fenêtre
 * (VS Code se fermait, au test). Ici, quand Tessera disparaît, son canal se ferme : l'hébergeur
 * rend leur fenêtre normale aux applications, puis s'arrête.
 *
 * Ce fil ne touche jamais aux fenêtres : il relaie les messages de Tessera au fil des cadres
 * (worker.ts) et au fil de la souris (mouse.ts, clic gauche + droit). Sa seule fonction système
 * vient de kernel32 (réveil des fils).
 */

const SetEvent = koffi.load('kernel32.dll').func('bool __stdcall SetEvent(intptr_t event)')

const worker = new Worker(join(import.meta.dirname, 'frame-worker.js'))
let wake = 0
const queued: FrameCommand[] = []

const mouse = new Worker(join(import.meta.dirname, 'frame-mouse.js'))
let mouseWake = 0
const mouseQueued: MouseCommand[] = []

function toMouse(command: MouseCommand): void {
  if (!mouseWake) {
    mouseQueued.push(command)
    return
  }
  mouse.postMessage(command)
  SetEvent(mouseWake)
}

function toWorker(command: FrameCommand): void {
  // Le clic gauche + droit relève du fil de la souris
  if (command.cmd === 'pannable' || command.cmd === 'wheel') return toMouse(command)
  if (command.cmd === 'release') {
    toMouse({ cmd: 'pannable', frame: command.frame, value: false })
    toMouse({ cmd: 'wheel', frame: command.frame, value: false })
  }
  if (command.cmd === 'restoreAll') toMouse({ cmd: 'stop' })
  if (!wake) {
    queued.push(command)
    return
  }
  worker.postMessage(command)
  SetEvent(wake)
}

mouse.on('message', (message: FramePan | FrameWheel | FrameActive | { wake: number }) => {
  if ('wake' in message) {
    mouseWake = message.wake
    for (const command of mouseQueued.splice(0)) toMouse(command)
  } else {
    process.stdout.write(`${JSON.stringify(message)}\n`)
  }
})
mouse.on('error', () => process.exit(1))

worker.on('message', (message: FrameReply) => {
  if ('wake' in message) {
    wake = message.wake
    for (const command of queued.splice(0)) toWorker(command)
  } else if ('restored' in message) {
    process.exit(0)
  } else {
    process.stdout.write(`${JSON.stringify(message)}\n`)
  }
})
worker.on('error', () => process.exit(1))

// Un message JSON par ligne (découpage à la main : readline bloquait à la fermeture du canal)
let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
    const line = buffer.slice(0, end)
    buffer = buffer.slice(end + 1)
    if (line.trim()) toWorker(JSON.parse(line) as FrameCommand)
  }
})

// Tessera a disparu (fermeture normale ou plantage)
let ended = false
const end = (): void => {
  if (ended) return
  ended = true
  toWorker({ cmd: 'restoreAll' })
}
process.stdin.on('end', end)
process.stdin.on('close', end)
process.stdin.on('error', end)
