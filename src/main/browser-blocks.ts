import { isBrowserProcess } from '@shared/browsers'
import { BROWSER_WIDGET, DESKTOP_APP_WIDGET } from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { getDashboard, saveDashboard } from './dashboard-store'
import { logApp } from './log'
import { getSettings } from './settings-store'

/**
 * Blocs « Application installée » qui affichent un navigateur (Brave, Chrome…) : convertis en
 * blocs « Navigateur », à la même place, avec les mêmes réglages. Au lancement.
 */
export function convertBrowserBlocks(): void {
  const browsers = new Set(
    getSettings()
      .apps.items.filter(isDesktopApp)
      .filter((app) => isBrowserProcess(app.processName))
      .map((app) => app.id)
  )
  if (browsers.size === 0) return
  const dashboard = getDashboard()
  let converted = 0
  const pages = dashboard.pages.map((page) => ({
    ...page,
    widgets: page.widgets.map((widget) => {
      if (widget.type !== DESKTOP_APP_WIDGET) return widget
      if (typeof widget.config.appId !== 'string' || !browsers.has(widget.config.appId)) {
        return widget
      }
      converted++
      return { ...widget, type: BROWSER_WIDGET }
    })
  }))
  if (converted === 0) return
  saveDashboard({ ...dashboard, pages })
  logApp(`blocs Application installée convertis en blocs Navigateur : ${converted}`)
}
