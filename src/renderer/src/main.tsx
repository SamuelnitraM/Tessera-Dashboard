import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { resolveAccentColor, resolveLanguage } from '@shared/settings'
import { App } from './App'
import i18n from 'i18next'
import { initI18n } from './i18n'
import { registerPluginTranslations } from './plugins/registry'
import { applyAccentColor } from './lib/appearance'
import { initDashboardStore } from './stores/dashboard'
import { initDesktopAppsStore } from './stores/desktopApps'
import { initMailStore } from './stores/mail'
import { initNotificationsStore } from './stores/notifications'
import { initSettingsStore, useSettingsStore } from './stores/settings'
import './styles/global.css'

// Langue et couleurs sont appliquées avant le premier affichage : pas de clignotement
await Promise.all([initSettingsStore(), initDashboardStore()])
await Promise.all([initDesktopAppsStore(), initNotificationsStore(), initMailStore()])
const { settings, system } = useSettingsStore.getState()
applyAccentColor(resolveAccentColor(settings.appearance.accentColor, system.accentColor))
await initI18n(resolveLanguage(settings.general.language, system.languages))
registerPluginTranslations(i18n)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
