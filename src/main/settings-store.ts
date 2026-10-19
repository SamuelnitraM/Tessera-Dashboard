import { join } from 'node:path'
import { app } from 'electron'
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  sanitizeSettings,
  type Settings,
  type SettingsPatch
} from '@shared/settings'
import { readJsonFile, writeJsonFile } from './json-file'

type SettingsListener = (next: Settings, previous: Settings) => void

/** Délai avant écriture : plusieurs changements rapprochés (ex. sélecteur de couleur) = 1 écriture. */
const SAVE_DELAY_MS = 300

let settings: Settings = DEFAULT_SETTINGS
let saveTimer: NodeJS.Timeout | undefined
const listeners = new Set<SettingsListener>()

/** `%APPDATA%/Tessera Dashboard/settings.json` */
function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/** Charge les réglages depuis le disque. À appeler une fois, au démarrage. */
export function loadSettings(): Settings {
  settings = sanitizeSettings(readJsonFile(getSettingsPath()))
  return settings
}

export function getSettings(): Settings {
  return settings
}

/** Modifie les réglages, prévient les abonnés et programme la sauvegarde. */
export function updateSettings(patch: SettingsPatch): Settings {
  const previous = settings
  const next = applySettingsPatch(previous, patch)
  if (JSON.stringify(next) === JSON.stringify(previous)) return previous

  settings = next
  scheduleSave()
  for (const listener of listeners) listener(next, previous)
  return next
}

/** S'abonne aux changements de réglages. Renvoie la fonction de désabonnement. */
export function onSettingsChange(listener: SettingsListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Écrit immédiatement les changements en attente (appelé avant de quitter). */
export function flushSettings(): void {
  if (!saveTimer) return
  clearTimeout(saveTimer)
  saveTimer = undefined
  writeJsonFile(getSettingsPath(), settings)
}

function scheduleSave(): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSettings, SAVE_DELAY_MS)
}
