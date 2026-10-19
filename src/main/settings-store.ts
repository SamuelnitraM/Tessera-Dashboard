import {
  applySettingsPatch,
  sanitizeSettings,
  type Settings,
  type SettingsPatch
} from '@shared/settings'
import { JsonStore } from './json-store'

/** Réglages de l'app : `%APPDATA%/Tessera Dashboard/settings.json` */
const store = new JsonStore<Settings>('settings.json', sanitizeSettings)

export const loadSettings = (): Settings => store.load()
export const getSettings = (): Settings => store.get()
export const flushSettings = (): void => store.flush()
export const onSettingsChange = store.onChange.bind(store)

/** Modifie une partie des réglages (le reste est conservé). */
export function updateSettings(patch: SettingsPatch): Settings {
  return store.set(applySettingsPatch(store.get(), patch))
}
