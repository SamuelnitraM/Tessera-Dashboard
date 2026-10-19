import { app } from 'electron'
import { APP_ID } from '@shared/app'
import { IpcChannels } from '@shared/ipc'
import { broadcast } from './broadcast'
import { flushDashboard, loadDashboard } from './dashboard-store'
import { registerIpcHandlers } from './ipc'
import { setPluginFilesListener } from './plugins/files'
import {
  flushProcessApprovals,
  loadProcessApprovals,
  setProcessListeners,
  stopCapturedProcesses
} from './plugins/processes'
import { flushSettings, getSettings, loadSettings, onSettingsChange } from './settings-store'
import { applyTheme, watchSystemPreferences } from './system'
import { createTray, refreshTrayMenu } from './tray'
import { createMainWindow, markAppAsQuitting, showMainWindow } from './window'

// Une seule instance de l'app à la fois : un second lancement réaffiche la fenêtre existante
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)

  app.on('before-quit', () => {
    markAppAsQuitting()
    flushSettings()
    flushDashboard()
    flushProcessApprovals()
    stopCapturedProcesses()
  })

  // Avec l'arrière-plan activé, la fenêtre est seulement masquée (window.ts) : cet événement
  // n'arrive donc que si l'utilisateur a choisi de quitter l'app en fermant la fenêtre
  app.on('window-all-closed', () => {
    if (!getSettings().window.closeToTray) app.quit()
  })

  void app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)

    // Les réglages sont chargés avant la fenêtre : thème et taille sont connus dès l'ouverture
    const settings = loadSettings()
    applyTheme(settings.appearance.theme)
    loadDashboard()
    loadProcessApprovals()

    registerIpcHandlers()
    createMainWindow()
    createTray()

    onSettingsChange((next, previous) => {
      if (next.appearance.theme !== previous.appearance.theme) applyTheme(next.appearance.theme)
      if (next.general.language !== previous.general.language) refreshTrayMenu()
      broadcast(IpcChannels.settingsChanged, next)
    })

    setPluginFilesListener((pluginId) => broadcast(IpcChannels.pluginFilesChanged, pluginId))
    setProcessListeners({
      changed: (pluginId, run) => broadcast(IpcChannels.processesChanged, pluginId, run),
      output: (pluginId, runId, text) =>
        broadcast(IpcChannels.processesOutput, pluginId, runId, text)
    })

    watchSystemPreferences((preferences) => {
      broadcast(IpcChannels.systemPreferencesChanged, preferences)
    })
  })
}
