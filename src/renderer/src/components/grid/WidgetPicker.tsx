import { useState } from 'react'
import { AppWindow, CircleAlert, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LayoutMode } from '@shared/dashboard'
import { DESKTOP_APP_WIDGET } from '@shared/desktop-apps'
import { localize } from '@shared/plugins'
import { listAvailableWidgets, WEB_APP_WIDGET, type RegisteredWidget } from '../../plugins/registry'
import { useDashboardStore } from '../../stores/dashboard'
import { useModules } from '../../stores/modules'
import { pickInstalledApp } from '../../stores/programPicker'
import { useResolvedLanguage, useSettingsStore } from '../../stores/settings'
import { AppIcon } from '../AppIcon'
import { PluginIcon } from '../PluginIcon'
import { Dialog } from '../ui/Dialog'
import styles from './WidgetPicker.module.css'

interface BlockPickerProps {
  pageId: string
  mode: LayoutMode
  open: boolean
  onClose: () => void
}

/**
 * Fenêtre « Ajouter un bloc », en trois catégories :
 * - Widgets : fournis avec Tessera
 * - Applications : celles de Paramètres → Applications (web ou installées), un autre site, ou
 *   un autre programme du PC
 * - Modules : développés par d'autres
 */
export function WidgetPicker({ pageId, mode, open, onClose }: BlockPickerProps): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const userApps = useSettingsStore((state) => state.settings.apps.items)
  // Se réaffiche quand un module est installé ou désinstallé
  useModules()
  const addWidget = useDashboardStore((state) => state.addWidget)
  const [pageFull, setPageFull] = useState(false)

  // L'alerte « page pleine » est oubliée à la fermeture
  const close = (): void => {
    setPageFull(false)
    onClose()
  }

  const add = (key: string, config?: Record<string, unknown>): void => {
    if (addWidget(pageId, key, mode, config) === 'page-full') setPageFull(true)
    else close()
  }

  const available = listAvailableWidgets(disabledPlugins)
  const webAppsEnabled = available.some((widget) => widget.key === WEB_APP_WIDGET)
  const desktopAppsEnabled = available.some((widget) => widget.key === DESKTOP_APP_WIDGET)
  const widgets = available.filter(
    (widget) => widget.builtIn && widget.key !== WEB_APP_WIDGET && widget.key !== DESKTOP_APP_WIDGET
  )
  const apps = userApps.filter((app) => (app.kind === 'web' ? webAppsEnabled : desktopAppsEnabled))
  const modules = available.filter((widget) => !widget.builtIn)

  const option = (widget: RegisteredWidget): Option => ({
    key: widget.key,
    icon: <PluginIcon name={widget.manifest.icon} />,
    name: localize(widget.manifest.name, language),
    description: localize(widget.manifest.description, language),
    onClick: () => add(widget.key)
  })

  return (
    <Dialog title={t('blocks.picker.title')} open={open} onClose={close}>
      {pageFull && (
        <p className={styles.alert} role="alert">
          <CircleAlert size={16} aria-hidden />
          {t('pages.pageFull')}
        </p>
      )}

      <Category
        title={t('blocks.picker.widgets')}
        empty={t('blocks.picker.noWidgets')}
        options={widgets.map(option)}
      />

      {(webAppsEnabled || desktopAppsEnabled) && (
        <Category
          title={t('blocks.picker.apps')}
          options={[
            ...apps.map((app) => ({
              key: app.id,
              icon: <AppIcon app={app} size={20} />,
              name: app.name,
              description: app.kind === 'web' ? hostOf(app.url) : t('blocks.picker.installedApp'),
              onClick: () =>
                add(app.kind === 'web' ? WEB_APP_WIDGET : DESKTOP_APP_WIDGET, { appId: app.id })
            })),
            ...(webAppsEnabled
              ? [
                  {
                    key: 'other-site',
                    icon: <Plus size={20} aria-hidden />,
                    name: t('blocks.picker.otherSite'),
                    description: t('blocks.picker.otherSiteDescription'),
                    onClick: () => add(WEB_APP_WIDGET)
                  }
                ]
              : []),
            ...(desktopAppsEnabled
              ? [
                  {
                    key: 'other-program',
                    icon: <AppWindow size={20} aria-hidden />,
                    name: t('blocks.picker.otherProgram'),
                    description: t('blocks.picker.otherProgramDescription'),
                    // Choisi dans la liste des programmes, puis ajouté directement
                    onClick: () =>
                      void pickInstalledApp().then(
                        (app) => app && add(DESKTOP_APP_WIDGET, { appId: app.id })
                      )
                  }
                ]
              : [])
          ]}
        />
      )}

      <Category
        title={t('blocks.picker.modules')}
        empty={t('blocks.picker.noModules')}
        options={modules.map(option)}
      />
    </Dialog>
  )
}

interface Option {
  key: string
  icon: React.ReactNode
  name: string
  description: string
  onClick: () => void
}

function Category({
  title,
  options,
  empty
}: {
  title: string
  options: Option[]
  empty?: string
}): React.JSX.Element {
  return (
    <section className={styles.category}>
      <h3 className={styles.categoryTitle}>{title}</h3>
      {options.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.list}>
          {options.map((item) => (
            <li key={item.key}>
              <button type="button" className={styles.option} onClick={item.onClick}>
                <span className={styles.optionIcon}>{item.icon}</span>
                <span className={styles.optionText}>
                  <span className={styles.optionName}>{item.name}</span>
                  <span className={styles.optionDescription}>{item.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
