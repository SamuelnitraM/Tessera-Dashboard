import { app } from 'electron'
import { APP_ID } from '@shared/app'
import { IpcChannels } from '@shared/ipc'
import { broadcast } from './broadcast'
import { flushDashboard, loadDashboard } from './dashboard-store'
import { initDocking, releaseAllApps, releaseRemovedApps } from './desktop/docking'
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
import { createTray, refreshAppIcons, refreshTrayMenu } from './tray'
import { flushWebPermissions, loadWebPermissions, watchWebContents } from './web'
import { createMainWindow, getMainWindow, markAppAsQuitting, showMainWindow } from './window'

// Une seule instance de l'app à la fois : un second lancement réaffiche la fenêtre existante
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)

  app.on('before-quit', () => {
    markAppAsQuitting()
    // Les applications installées retrouvent leur fenêtre normale
    releaseAllApps()
    flushSettings()
    flushDashboard()
    flushProcessApprovals()
    flushWebPermissions()
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
    loadWebPermissions()
    watchWebContents()

    registerIpcHandlers()
    initDocking(createMainWindow(), {
      changed: (appId, state) => broadcast(IpcChannels.desktopAppsChanged, appId, state),
      // Une application demande à s'afficher : Tessera s'ouvre sur son bloc ou son onglet
      reveal: (appId) => {
        showMainWindow()
        getMainWindow()?.webContents.send(IpcChannels.desktopAppsReveal, appId)
      }
    })
    createTray()

    onSettingsChange((next, previous) => {
      if (next.appearance.theme !== previous.appearance.theme) applyTheme(next.appearance.theme)
      if (next.general.language !== previous.general.language) refreshTrayMenu()
      if (
        next.appearance.accentColor !== previous.appearance.accentColor ||
        next.appearance.accentIcon !== previous.appearance.accentIcon
      ) {
        refreshAppIcons()
      }
      if (next.apps.items !== previous.apps.items) releaseRemovedApps()
      broadcast(IpcChannels.settingsChanged, next)
    })

    setPluginFilesListener((pluginId) => broadcast(IpcChannels.pluginFilesChanged, pluginId))
    setProcessListeners({
      changed: (pluginId, run) => broadcast(IpcChannels.processesChanged, pluginId, run),
      output: (pluginId, runId, text) =>
        broadcast(IpcChannels.processesOutput, pluginId, runId, text)
    })

    watchSystemPreferences((preferences) => {
      // La couleur d'accent de Windows a changé : icônes à redessiner si elles la suivent
      if (getSettings().appearance.accentColor === 'system') refreshAppIcons()
      broadcast(IpcChannels.systemPreferencesChanged, preferences)
    })
  })
}
