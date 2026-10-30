import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { resolveAccentColor, resolveLanguage } from '@shared/settings'
import { App } from './App'
import i18n from 'i18next'
import { initI18n } from './i18n'
import { loadPluginCode, registerPluginTranslations } from './plugins/registry'
import { applyAccentColor } from './lib/appearance'
import { homePageId, initWindows } from './lib/windows'
import { initDashboardStore, useDashboardStore } from './stores/dashboard'
import { initDesktopAppsStore } from './stores/desktopApps'
import { initMailStore } from './stores/mail'
import { initMediaStatusStore } from './stores/mediaStatus'
import { initModulesStore } from './stores/modules'
import { initUpdatesStore } from './stores/updates'
import { initNotificationsStore } from './stores/notifications'
import { initSettingsStore, useSettingsStore } from './stores/settings'
import './styles/global.css'

// Langue et couleurs sont appliquées avant le premier affichage : pas de clignotement
await Promise.all([initSettingsStore(), initDashboardStore()])
// Pages de cette fenêtre (Tessera peut en avoir plusieurs)
await initWindows()

// Code des extensions : celles de l'accueil de la fenêtre et de la barre, chargées pendant le reste de
// l'initialisation et attendues avant le premier affichage (pas de bloc vide un instant) ; celles
// des autres pages quand l'interface est au repos
const pluginOf = (type: string): string => type.split('/')[0]
const { pages } = useDashboardStore.getState().dashboard
const home = pages.find((page) => page.id === homePageId()) ?? pages[0]
const homeCode = loadPluginCode([
  ...(home?.widgets ?? []).map((widget) => pluginOf(widget.type)),
  ...useSettingsStore
    .getState()
    .settings.headerBar.items.filter((item) => item.includes('/'))
    .map(pluginOf)
])

await Promise.all([
  initDesktopAppsStore(),
  initNotificationsStore(),
  initMailStore(),
  initMediaStatusStore(),
  initModulesStore(),
  initUpdatesStore()
])
const { settings, system } = useSettingsStore.getState()
applyAccentColor(resolveAccentColor(settings.appearance.accentColor, system.accentColor))
await initI18n(resolveLanguage(settings.general.language, system.languages))
registerPluginTranslations(i18n)
await homeCode

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

window.requestIdleCallback(
  () => void loadPluginCode(pages.flatMap((page) => page.widgets.map((w) => pluginOf(w.type)))),
  { timeout: 5000 }
)
