import { createInterface } from 'node:readline'
import { initCom } from './com'
import {
  audibleSessions,
  getAudio,
  listSessions,
  setDefault,
  setMute,
  setSessions,
  setVolume
} from './audio'
import { getMedia, getThumbnail, mediaCommand } from './media'
import { cpuUsage, networkTotals, processesUnder, processInfos, topProcesses } from './processes'

/**
 * Aide système de Tessera (widgets Média, Son et Système de la barre, modules Jeux et Services
 * locaux) : un petit processus Node (l'exécutable de Tessera en mode Node, sans Chromium) qui
 * appelle Windows directement (Core Audio, contrôles multimédias, noyau) au lieu de PowerShell.
 * Lancée par src/main/headerbar/helper.ts ; une requête JSON par ligne sur l'entrée standard,
 * une réponse JSON par ligne sur la sortie. S'arrête quand Tessera ferme l'entrée.
 */

initCom()

type Args = Record<string, unknown>

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const flowOf = (args: Args): 0 | 1 => (args.flow === 'input' ? 1 : 0)
const numbers = (value: unknown): number[] =>
  (Array.isArray(value) ? value : [value]).map(Number).filter((n) => Number.isInteger(n) && n > 0)

const commands: Record<string, (args: Args) => unknown> = {
  'media.get': (args) => getMedia(text(args.app)),
  'media.thumb': (args) => getThumbnail(text(args.app)),
  'media.command': (args) => mediaCommand(text(args.action), text(args.app)),
  'audio.get': () => getAudio(),
  'audio.volume': (args) => (setVolume(flowOf(args), Number(args.value) || 0), true),
  'audio.mute': (args) => (setMute(flowOf(args), args.value === true), true),
  'audio.default': (args) => (setDefault(text(args.id)), true),
  'sessions.list': () => listSessions(),
  'sessions.audible': () => audibleSessions(),
  'sessions.set': (args) => (setSessions(numbers(args.pids), Number(args.volume) || 0), true),
  'procs.under': (args) =>
    processesUnder(
      (Array.isArray(args.folders) ? args.folders : [args.folders]).map(text).filter(Boolean)
    ),
  'procs.info': (args) => processInfos(numbers(args.pids)),
  'cpu.get': () => cpuUsage(),
  'procs.top': (args) => topProcesses(args.sort === 'memory', Number(args.limit) || 12),
  'net.get': () => networkTotals()
}

function reply(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

async function handle(line: string): Promise<void> {
  let id: unknown = null
  try {
    const request = JSON.parse(line) as { id?: unknown; cmd?: unknown; args?: unknown }
    id = request.id
    const run = commands[String(request.cmd)]
    if (!run) throw new Error(`unknown command ${String(request.cmd)}`)
    const args =
      typeof request.args === 'object' && request.args !== null ? (request.args as Args) : {}
    reply({ id, ok: true, data: (await run(args)) ?? null })
  } catch (error) {
    reply({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

reply({ ready: true })
createInterface({ input: process.stdin }).on('line', (line) => {
  if (line.trim()) void handle(line)
})
// Tessera a fermé l'entrée (ou s'est arrêté) : plus rien ne doit tourner
process.stdin.on('end', () => process.exit(0))
