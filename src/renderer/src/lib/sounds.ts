import type { SoundId } from '@shared/notifications'

/**
 * Sons des notifications, joués par l'interface :
 * - sons de Tessera (`chime`, `pop`, `bell`) : synthétisés, aucun fichier à fournir ;
 * - sons importés (`custom:<id>`) et son « Notification » de Windows (`system`, quand la
 *   notification s'affiche en bulle dans Tessera) : fichiers lus par le processus principal.
 * Avec une bannière Windows, le son de Windows est joué par la bannière elle-même.
 */

let context: AudioContext | null = null
const decoded = new Map<SoundId, AudioBuffer>()

function audio(): AudioContext {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

/** Note brève à l'enveloppe douce. */
function tone(
  ctx: AudioContext,
  output: AudioNode,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine'
): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(0.5, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  oscillator.connect(gain).connect(output)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

const BUILT_IN: Record<string, (ctx: AudioContext, output: AudioNode, now: number) => void> = {
  // Deux notes montantes
  chime: (ctx, output, now) => {
    tone(ctx, output, 880, now, 0.35)
    tone(ctx, output, 1318.5, now + 0.12, 0.5)
  },
  // Petite bulle
  pop: (ctx, output, now) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.frequency.setValueAtTime(400, now)
    oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.08)
    gain.gain.setValueAtTime(0.6, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    oscillator.connect(gain).connect(output)
    oscillator.start(now)
    oscillator.stop(now + 0.2)
  },
  // Clochette (harmoniques)
  bell: (ctx, output, now) => {
    tone(ctx, output, 1046.5, now, 1.2)
    tone(ctx, output, 2093, now, 0.6, 'triangle')
  }
}

async function load(sound: SoundId): Promise<AudioBuffer | null> {
  const cached = decoded.get(sound)
  if (cached) return cached
  const data = await window.tessera.notifications.getSound(sound)
  if (!data) return null
  // Copie : decodeAudioData prend possession du tampon
  const buffer = await audio().decodeAudioData(new Uint8Array(data).buffer)
  decoded.set(sound, buffer)
  return buffer
}

/** Joue un son de notification (volume de 0 à 100). */
export async function playSound(sound: SoundId, volume: number): Promise<void> {
  if (sound === 'none' || volume <= 0) return
  const ctx = audio()
  const output = ctx.createGain()
  output.gain.value = volume / 100
  output.connect(ctx.destination)
  const builtIn = BUILT_IN[sound]
  if (builtIn) return builtIn(ctx, output, ctx.currentTime + 0.02)
  const buffer = await load(sound)
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(output)
  source.start()
}

/** Oublie un son importé supprimé. */
export function forgetSound(sound: SoundId): void {
  decoded.delete(sound)
}
