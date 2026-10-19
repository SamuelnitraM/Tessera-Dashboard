import { create } from 'zustand'
import type { SystemPreferences } from '@shared/ipc'
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  resolveAccentColor,
  resolveLanguage,
  type Settings,
  type SettingsPatch
} from '@shared/settings'

interface SettingsState {
  settings: Settings
  system: SystemPreferences
  /** Modifie les réglages : appliqué tout de suite à l'écran, puis confirmé par le processus principal. */
  update: (patch: SettingsPatch) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  system: { languages: [], accentColor: null },
  update: async (patch) => {
    set({ settings: applySettingsPatch(get().settings, patch) })
    set({ settings: await window.tessera.settings.update(patch) })
  }
}))

/**
 * Charge les réglages et les préférences Windows, puis reste à l'écoute de leurs changements
 * (par exemple si un réglage est modifié depuis une autre fenêtre ou depuis Windows).
 */
export async function initSettingsStore(): Promise<void> {
  const [settings, system] = await Promise.all([
    window.tessera.settings.get(),
    window.tessera.system.getPreferences()
  ])
  useSettingsStore.setState({ settings, system })

  window.tessera.settings.onChange((settings) => useSettingsStore.setState({ settings }))
  window.tessera.system.onPreferencesChange((system) => useSettingsStore.setState({ system }))
}

/** Langue effective (résout « Langue du système »). */
export function useResolvedLanguage() {
  return useSettingsStore((state) =>
    resolveLanguage(state.settings.general.language, state.system.languages)
  )
}

/** Couleur d'accent effective (résout « Couleur Windows »). */
export function useResolvedAccentColor() {
  return useSettingsStore((state) =>
    resolveAccentColor(state.settings.appearance.accentColor, state.system.accentColor)
  )
}
