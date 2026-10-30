import { app, Menu, Tray } from 'electron'
import { APP_NAME } from '@shared/app'
import { interpolate } from '@shared/i18n'
import { getTranslation } from './i18n'
import { getAppIcons } from './app-icon'
import { setDoNotDisturb } from './notifications'
import { getSettings } from './settings-store'
import { setWindowsIcon, showMainWindow, toggleMainWindow } from './window'

// Référence gardée au niveau du module : sinon le ramasse-miettes supprime l'icône
let tray: Tray | null = null

/** Crée l'icône dans la zone de notification de Windows (à côté de l'horloge). */
export function createTray(): Tray {
  tray = new Tray(getAppIcons().tray)
  tray.setToolTip(APP_NAME)
  tray.on('click', toggleMainWindow)
  refreshTrayMenu()

  return tray
}

let iconTimer: NodeJS.Timeout | undefined

/**
 * Redessine les icônes (fenêtre et zone de notification), ex. après un changement d'accent.
 * Légèrement différé : le sélecteur de couleur libre envoie de nombreux changements d'affilée.
 */
export function refreshAppIcons(): void {
  clearTimeout(iconTimer)
  iconTimer = setTimeout(() => {
    const icons = getAppIcons()
    tray?.setImage(icons.tray)
    setWindowsIcon(icons.window)
  }, 200)
}

/** (Re)construit le menu du clic droit, par exemple après un changement de langue. */
export function refreshTrayMenu(): void {
  if (!tray) return
  const t = getTranslation().tray

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: interpolate(t.open, { appName: APP_NAME }), click: showMainWindow },
      {
        label: t.doNotDisturb,
        type: 'checkbox',
        checked: getSettings().notifications.doNotDisturb,
        click: (item) => setDoNotDisturb(item.checked)
      },
      { type: 'separator' },
      { label: t.quit, click: () => app.quit() }
    ])
  )
}
