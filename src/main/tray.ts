import { app, Menu, nativeImage, Tray } from 'electron'
import { APP_NAME } from '@shared/app'
import { interpolate } from '@shared/i18n'
import { getTranslation } from './i18n'
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
  tray.on('click', toggleMainWindow)
  refreshTrayMenu()

  return tray
}

/** (Re)construit le menu du clic droit, par exemple après un changement de langue. */
export function refreshTrayMenu(): void {
  if (!tray) return
  const t = getTranslation().tray

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: interpolate(t.open, { appName: APP_NAME }), click: showMainWindow },
      { type: 'separator' },
      { label: t.quit, click: () => app.quit() }
    ])
  )
}
