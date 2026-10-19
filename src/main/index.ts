import { app } from 'electron'
import { APP_ID } from '@shared/app'
import { registerIpcHandlers } from './ipc'
import { createTray } from './tray'
import { createMainWindow, markAppAsQuitting, showMainWindow } from './window'

// Une seule instance de l'app à la fois : un second lancement réaffiche la fenêtre existante
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)

  app.on('before-quit', markAppAsQuitting)

  // L'app vit dans la barre des tâches : fermer toutes les fenêtres ne la quitte pas
  app.on('window-all-closed', () => {})

  void app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)
    registerIpcHandlers()
    createMainWindow()
    createTray()
  })
}
