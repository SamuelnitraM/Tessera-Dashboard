import { app } from 'electron'
import { APP_ID } from '@shared/app'
import { IpcChannels } from '@shared/ipc'
import { broadcast } from './broadcast'
import { flushDashboard, loadDashboard } from './dashboard-store'
import { closeRemovedApps, initDocking, releaseAllApps } from './desktop/docking'
import { registerIpcHandlers } from './ipc'
import {
  flushNotifications,
  loadNotifications,
  setNotificationListeners,
  watchWebNotifications
} from './notifications'
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
    // Les applications installées sont fermées, ou rendues au bureau (réglage)
    releaseAllApps(getSettings().apps.onQuit)
    flushSettings()
    flushDashboard()
    flushProcessApprovals()
    flushWebPermissions()
    flushNotifications()
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
    loadNotifications()
    watchWebContents()
    watchWebNotifications()

    registerIpcHandlers()
    initDocking(createMainWindow(), {
      changed: (appId, state) => broadcast(IpcChannels.desktopAppsChanged, appId, state),
      // Une application demande à s'afficher : Tessera s'ouvre sur son bloc ou son onglet
      reveal: (appId) => {
        showMainWindow()
        getMainWindow()?.webContents.send(IpcChannels.desktopAppsReveal, appId)
      },
      pan: (pan) => getMainWindow()?.webContents.send(IpcChannels.desktopAppsPan, pan)
    })
    createTray()

    onSettingsChange((next, previous) => {
      if (next.appearance.theme !== previous.appearance.theme) applyTheme(next.appearance.theme)
      if (
        next.general.language !== previous.general.language ||
        next.notifications.doNotDisturb !== previous.notifications.doNotDisturb
      ) {
        refreshTrayMenu()
      }
      if (
        next.appearance.accentColor !== previous.appearance.accentColor ||
        next.appearance.accentIcon !== previous.appearance.accentIcon
      ) {
        refreshAppIcons()
      }
      if (next.apps.items !== previous.apps.items) closeRemovedApps()
      broadcast(IpcChannels.settingsChanged, next)
    })

    setPluginFilesListener((pluginId) => broadcast(IpcChannels.pluginFilesChanged, pluginId))
    setNotificationListeners({
      changed: (list) => broadcast(IpcChannels.notificationsChanged, list),
      play: (sound, volume) => broadcast(IpcChannels.notificationsPlay, sound, volume),
      // Clic sur une bannière : Tessera s'ouvre sur l'application qui l'a envoyée
      activate: (notification) => {
        showMainWindow()
        getMainWindow()?.webContents.send(IpcChannels.notificationsActivated, notification)
      }
    })
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
