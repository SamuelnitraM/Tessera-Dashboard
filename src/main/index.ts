// Vérification des expéditeurs IPC : avant tout autre module (ils enregistrent leurs canaux)
import './ipc-guard'
import { app, protocol } from 'electron'
import { APP_ID } from '@shared/app'
import { IpcChannels } from '@shared/ipc'
import { broadcast } from './broadcast'
import { flushDashboard, loadDashboard } from './dashboard-store'
import { convertBrowserBlocks } from './browser-blocks'
import {
  attachDockingWindow,
  closeRemovedApps,
  initDocking,
  releaseAllApps
} from './desktop/docking'
import { registerIpcHandlers } from './ipc'
import { logApp, watchCrashes } from './log'
import { flushMailState, initMail, stopMail } from './mail'
import { startCalendarReminders, stopCalendarReminders } from './calendar'
import { initMedia, stopMedia } from './media'
import {
  applyLaunchAtStartup,
  isLaunchedHidden,
  openPackage,
  packageFromArgs,
  setOpenedPackageListener
} from './startup'
import { initUpdater, setUpdateListener } from './updater'
import {
  flushLocalMedia,
  handleLocalMediaProtocol,
  loadLocalMedia,
  localMediaScheme
} from './media/local'
import { flushSecrets, loadSecrets } from './auth/secrets'
import { flushClipboardPins, initClipboardHistory } from './headerbar/clipboard'
import { stopHelper } from './headerbar/helper'
import { flushModulesData, loadModulesData } from './modules'
import {
  flushNotifications,
  loadNotifications,
  setNotificationListeners,
  watchWebNotifications
} from './notifications'
import { setPluginFilesListener } from './plugins/files'
import { handleModuleProtocol, moduleScheme, protectModuleSession } from './plugins/module-protocol'
import { flushModules, loadModules, setModulesListener } from './plugins/modules'
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
import {
  getMainWindow,
  markAppAsQuitting,
  setWindowCreatedListener,
  showMainWindow,
  showWindow
} from './window'
import { openStartupWindows, registerWindowHandlers, saveWindows, windowOfApp } from './windows'
import { toggleVideoWheel } from './video-stage'

// Protocoles de l'app, à déclarer en une fois avant qu'elle soit prête : vidéos du PC
// (tessera-file://) et code des modules tiers (tessera-module://)
protocol.registerSchemesAsPrivileged([localMediaScheme, moduleScheme])

// Une seule instance de l'app à la fois : un second lancement réaffiche la fenêtre existante

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  // Erreurs et plantages notés dans logs/tessera.log (Paramètres → À propos → Journal)
  watchCrashes()

  // Second lancement : la fenêtre existante s'affiche (et installe le .tessera ouvert, s'il y en a un)
  app.on('second-instance', (_event, argv) => {
    showMainWindow()
    const opened = packageFromArgs(argv)
    if (opened) void openPackage(opened)
  })

  app.on('before-quit', () => {
    markAppAsQuitting()
    // Chaque étape à part : une erreur n'empêche pas les suivantes (enregistrements, arrêts)
    const steps: (() => void)[] = [
      // Fenêtres et leurs pages, retrouvées au lancement suivant
      saveWindows,
      // Les applications installées sont fermées, ou rendues au bureau (réglage)
      () => releaseAllApps(getSettings().apps.onQuit),
      flushSettings,
      flushDashboard,
      flushProcessApprovals,
      flushWebPermissions,
      flushNotifications,
      flushSecrets,
      flushLocalMedia,
      flushModules,
      flushMailState,
      flushClipboardPins,
      flushModulesData,
      stopHelper,
      stopMail,
      stopCalendarReminders,
      stopMedia,
      stopCapturedProcesses
    ]
    for (const step of steps) {
      try {
        step()
      } catch (error) {
        console.error('[quitter]', error)
        logApp(`[quitter] ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  })

  // Avec l'arrière-plan activé, la dernière fenêtre est seulement masquée (window.ts) : cet
  // événement n'arrive donc que si l'utilisateur a choisi de quitter l'app en fermant la fenêtre
  app.on('window-all-closed', () => {
    if (!getSettings().window.closeToTray) app.quit()
  })

  void app.whenReady().then(() => {
    // Version de développement : un autre identifiant, pour que Windows ne confonde jamais
    // `electron.exe` avec Tessera installé (nom et logo « Electron » dans la barre des tâches
    // et les notifications de la version installée)
    app.setAppUserModelId(app.isPackaged ? APP_ID : `${APP_ID}.dev`)

    // Les réglages sont chargés avant la fenêtre : thème et taille sont connus dès l'ouverture
    const settings = loadSettings()
    applyTheme(settings.appearance.theme)
    loadDashboard()
    // Blocs Application installée qui affichent un navigateur : blocs Navigateur
    convertBrowserBlocks()
    loadProcessApprovals()
    loadWebPermissions()
    loadNotifications()
    loadSecrets()
    loadLocalMedia()
    handleLocalMediaProtocol()
    loadModules()
    handleModuleProtocol()
    protectModuleSession()
    watchWebContents()
    watchWebNotifications()
    initClipboardHistory()
    loadModulesData()

    registerIpcHandlers()
    registerWindowHandlers()
    // Applications installées : chaque événement va à la fenêtre de Tessera de son bloc
    initDocking({
      changed: (appId, state) => broadcast(IpcChannels.desktopAppsChanged, appId, state),
      // Une application demande à s'afficher : Tessera s'ouvre sur son bloc ou son onglet
      reveal: (appId) => {
        const window = windowOfApp(appId) ?? getMainWindow()
        if (!window) return
        showWindow(window)
        window.webContents.send(IpcChannels.desktopAppsReveal, appId)
      },
      pan: (window, pan) => window.webContents.send(IpcChannels.desktopAppsPan, pan),
      moved: (window) => window.webContents.send(IpcChannels.desktopAppsUnstretch),
      wheel: (window, hostId, deltaY) =>
        window.webContents.send(IpcChannels.desktopAppsWheel, { hostId, deltaY }),
      activate: (window, hostId) =>
        window
          ? window.webContents.send(IpcChannels.desktopAppsActivate, hostId)
          : broadcast(IpcChannels.desktopAppsActivate, null),
      fullScreen: (window, appId, value) =>
        window.webContents.send(IpcChannels.desktopAppsFullScreen, { appId, value }),
      middleClick: () => toggleVideoWheel(),
      tabDrag: (window, drag) => window.webContents.send(IpcChannels.desktopAppsTabDrag, drag)
    })
    setWindowCreatedListener(attachDockingWindow)
    // Lancée avec Windows : Tessera reste dans la zone de notification
    openStartupWindows(isLaunchedHidden())
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
      if (next.window.launchAtStartup !== previous.window.launchAtStartup) applyLaunchAtStartup()
      broadcast(IpcChannels.settingsChanged, next)
    })

    setPluginFilesListener((pluginId) => broadcast(IpcChannels.pluginFilesChanged, pluginId))
    setModulesListener((modules) => broadcast(IpcChannels.modulesChanged, modules))
    setOpenedPackageListener(() => {
      showMainWindow()
      getMainWindow()?.webContents.send(IpcChannels.modulesOpened)
    })
    setUpdateListener((state) => broadcast(IpcChannels.updatesChanged, state))
    initUpdater()
    applyLaunchAtStartup()
    const opened = packageFromArgs(process.argv)
    if (opened) void openPackage(opened)
    setNotificationListeners({
      changed: (list) => broadcast(IpcChannels.notificationsChanged, list),
      // Une seule fenêtre joue le son (sinon il sonnerait une fois par fenêtre)
      play: (sound, volume) =>
        getMainWindow()?.webContents.send(IpcChannels.notificationsPlay, sound, volume),
      // Clic sur une bannière : Tessera s'ouvre sur l'application qui l'a envoyée
      activate: (notification) => {
        showMainWindow()
        getMainWindow()?.webContents.send(IpcChannels.notificationsActivated, notification)
      }
    })
    initMail({
      changed: (accountId, state, fresh) =>
        broadcast(IpcChannels.mailChanged, accountId, state, fresh)
    })
    // Rappels de Google Agenda : notifications, tant que Tessera est ouvert
    startCalendarReminders()
    initMedia({
      status: (status) => broadcast(IpcChannels.mediaStatusChanged, status),
      live: (streams) => broadcast(IpcChannels.mediaLiveChanged, streams)
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
