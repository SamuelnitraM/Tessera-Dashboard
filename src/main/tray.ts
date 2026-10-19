import { app, Menu, nativeImage, Tray } from 'electron'
import { APP_NAME } from '@shared/app'
import { getResourcePath } from './paths'
import { showMainWindow, toggleMainWindow } from './window'

// Référence gardée au niveau du module : sinon le ramasse-miettes supprime l'icône
let tray: Tray | null = null

/** Crée l'icône dans la zone de notification de Windows (à côté de l'horloge). */
export function createTray(): Tray {
  // Electron choisit automatiquement tray-icon@1.5x / @2x selon la mise à l'échelle de l'écran
  const icon = nativeImage.createFromPath(getResourcePath('tray-icon.png'))
  tray = new Tray(icon)
  tray.setToolTip(APP_NAME)

  // Les libellés seront traduits (FR/EN) à l'étape 2
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Ouvrir ${APP_NAME}`, click: showMainWindow },
      { type: 'separator' },
      { label: 'Quitter', click: () => app.quit() }
    ])
  )

  tray.on('click', toggleMainWindow)

  return tray
}
