import { createHash, randomUUID } from 'node:crypto'
import { clipboard, ClipboardItem, nativeImage, type NativeImage } from 'electron'
import koffi from 'koffi'
import { toolboxWidgetType, type ClipboardEntry } from '@shared/header-bar'
import { broadcast } from '../broadcast'
import { IpcChannels } from '@shared/ipc'
import { JsonStore } from '../json-store'
import { getDashboard, onDashboardChange } from '../dashboard-store'
import { getSettings, onSettingsChange } from '../settings-store'

/**
 * Historique du presse-papiers (widget de la barre des pages) : textes et images copiés,
 * gardés en mémoire seulement (effacés à la fermeture de Tessera ou quand le widget est retiré),
 * sauf les éléments épinglés. Ce que les gestionnaires de mots de passe marquent comme à ne pas
 * garder est ignoré.
 */

const MAX_ENTRIES = 50
const MAX_PINS = 30
const MAX_TEXT = 100_000
/** Images gardées en mémoire (PNG) : au-delà, les plus anciennes sont oubliées. */
const MAX_IMAGE_BYTES = 120_000_000
const MAX_PINNED_IMAGE = 6_000_000
const POLL_MS = 500

const GetClipboardSequenceNumber = koffi
  .load('user32.dll')
  .func('uint32_t __stdcall GetClipboardSequenceNumber()') as () => number

interface Entry extends ClipboardEntry {
  /** Texte complet, ou image PNG. */
  data: string | Buffer
  hash: string
}

interface StoredPin {
  id: string
  kind: 'text' | 'image'
  text: string
  /** Image PNG (base64). */
  png: string
  copiedAt: number
}

function sanitizePins(input: unknown): StoredPin[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (pin): pin is StoredPin =>
        typeof pin === 'object' &&
        pin !== null &&
        typeof pin.id === 'string' &&
        (pin.kind === 'text' || pin.kind === 'image') &&
        typeof pin.text === 'string' &&
        typeof pin.png === 'string' &&
        typeof pin.copiedAt === 'number'
    )
    .slice(0, MAX_PINS)
}

const pins = new JsonStore<StoredPin[]>('clipboard-pins.json', sanitizePins)

let entries: Entry[] = []
let timer: NodeJS.Timeout | null = null
let lastSequence = 0

const hashOf = (data: string | Buffer): string => createHash('sha1').update(data).digest('hex')

function toEntry(pin: StoredPin): Entry | null {
  if (pin.kind === 'text') {
    return {
      ...pin,
      preview: null,
      size: null,
      pinned: true,
      data: pin.text,
      hash: hashOf(pin.text)
    }
  }
  const png = Buffer.from(pin.png, 'base64')
  const image = nativeImage.createFromBuffer(png)
  if (image.isEmpty()) return null
  return {
    id: pin.id,
    kind: 'image',
    text: '',
    preview: image.resize({ height: 72 }).toDataURL(),
    size: image.getSize(),
    pinned: true,
    copiedAt: pin.copiedAt,
    data: png,
    hash: hashOf(png)
  }
}

function savePins(): void {
  pins.set(
    entries
      .filter((entry) => entry.pinned)
      .map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        text: entry.kind === 'text' ? (entry.data as string) : '',
        png: entry.kind === 'image' ? (entry.data as Buffer).toString('base64') : '',
        copiedAt: entry.copiedAt
      }))
  )
}

function publish(): void {
  broadcast(IpcChannels.headerBarClipboardChanged, listClipboard())
}

/** Format brut de Windows (nom de format enregistré). */
const windowsFormat = (name: string): string => `electron application/osclipboard;format="${name}"`

/**
 * Copie marquée « à ne pas garder » par l'application qui l'a faite (gestionnaires de mots de
 * passe…) : formats reconnus par l'historique du presse-papiers de Windows.
 */
async function isExcluded(): Promise<boolean> {
  const flags = await Promise.all(
    [
      'ExcludeClipboardContentFromMonitorProcessing',
      'Clipboard Viewer Ignore',
      'CanIncludeInClipboardHistory'
    ].map((name) => clipboard.has(windowsFormat(name)).catch(() => false))
  )
  return flags.some(Boolean)
}

async function readImage(): Promise<NativeImage | null> {
  const items = await clipboard.read()
  for (const item of items) {
    const type = item.types.includes('image/png')
      ? 'image/png'
      : item.types.find((candidate) => candidate.startsWith('image/'))
    if (!type) continue
    const blob = await item.getType(type)
    if (!(blob instanceof Blob)) continue
    const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()))
    if (!image.isEmpty()) return image
  }
  return null
}

export function writeClipboardImage(image: NativeImage): Promise<void> {
  const png = image.toPNG()
  return clipboard.write([
    new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })
  ])
}

async function readClipboard(): Promise<void> {
  if (await isExcluded()) return
  let entry: Omit<Entry, 'id' | 'pinned' | 'copiedAt'> | null = null
  const image = await readImage()
  if (image) {
    const png = image.toPNG()
    entry = {
      kind: 'image',
      text: '',
      preview: image.resize({ height: 72 }).toDataURL(),
      size: image.getSize(),
      data: png,
      hash: hashOf(png)
    }
  }
  if (!entry) {
    const text = (await clipboard.readText()).slice(0, MAX_TEXT)
    if (!text.trim()) return
    entry = {
      kind: 'text',
      text: text.slice(0, 2000),
      preview: null,
      size: null,
      data: text,
      hash: ''
    }
    entry.hash = hashOf(text)
  }
  const hash = entry.hash
  // Déjà dans l'historique : remonte en tête
  const existing = entries.find((item) => item.hash === hash)
  entries = [
    existing
      ? { ...existing, copiedAt: Date.now() }
      : { ...entry, id: randomUUID(), pinned: false, copiedAt: Date.now() },
    ...entries.filter((item) => item.hash !== hash)
  ]
  trim()
  publish()
}

/** Garde au plus 50 éléments non épinglés, et une taille d'images raisonnable. */
function trim(): void {
  let count = 0
  let imageBytes = 0
  entries = entries.filter((entry) => {
    if (entry.pinned) return true
    count += 1
    if (entry.kind === 'image') imageBytes += (entry.data as Buffer).length
    return count <= MAX_ENTRIES && imageBytes <= MAX_IMAGE_BYTES
  })
}

let reading = false

function poll(): void {
  const sequence = GetClipboardSequenceNumber()
  if (sequence === lastSequence || reading) return
  lastSequence = sequence
  reading = true
  readClipboard()
    // Presse-papiers occupé par une autre application : lu au prochain changement
    .catch(() => undefined)
    .finally(() => {
      reading = false
    })
}

function setWatching(watching: boolean): void {
  if (watching === (timer !== null)) return
  if (watching) {
    lastSequence = GetClipboardSequenceNumber()
    timer = setInterval(poll, POLL_MS)
  } else {
    clearInterval(timer ?? undefined)
    timer = null
    // Widget retiré : l'historique (non épinglé) est oublié
    entries = entries.filter((entry) => entry.pinned)
    publish()
  }
}

/** Au démarrage : éléments épinglés, et surveillance si le widget est dans la barre ou en bloc. */
export function initClipboardHistory(): void {
  pins.load()
  entries = pins
    .get()
    .map(toEntry)
    .filter((entry): entry is Entry => entry !== null)
  // Widget dans la barre d'une page (la sienne, ou la barre commune), ou en bloc sur une page
  const block = toolboxWidgetType('clipboard')
  const update = (): void =>
    setWatching(
      getDashboard().pages.some(
        (page) =>
          (page.headerItems ?? getSettings().headerBar.items).includes('clipboard') ||
          page.widgets.some((widget) => widget.type === block)
      )
    )
  update()
  onSettingsChange(update)
  onDashboardChange(update)
}

export const flushClipboardPins = (): void => pins.flush()

export function listClipboard(): ClipboardEntry[] {
  return entries.map(({ id, kind, text, preview, size, pinned, copiedAt }) => ({
    id,
    kind,
    text,
    preview,
    size,
    pinned,
    copiedAt
  }))
}

export async function copyClipboardEntry(id: string): Promise<void> {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return
  if (entry.kind === 'text') await clipboard.writeText(entry.data as string)
  else await writeClipboardImage(nativeImage.createFromBuffer(entry.data as Buffer))
}

/** Épingle (gardé après la fermeture) ou désépingle ; `false` si la limite est atteinte. */
export function pinClipboardEntry(id: string, pinned: boolean): boolean {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return false
  if (entry.pinned === pinned) return true
  if (pinned) {
    const count = entries.filter((item) => item.pinned).length
    const tooBig = entry.kind === 'image' && (entry.data as Buffer).length > MAX_PINNED_IMAGE
    if (count >= MAX_PINS || tooBig) return false
  }
  entry.pinned = pinned
  savePins()
  publish()
  return true
}

export function removeClipboardEntry(id: string): void {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return
  entries = entries.filter((item) => item !== entry)
  if (entry.pinned) savePins()
  publish()
}

/** Vide l'historique (les éléments épinglés restent). */
export function clearClipboardHistory(): void {
  entries = entries.filter((entry) => entry.pinned)
  publish()
}
