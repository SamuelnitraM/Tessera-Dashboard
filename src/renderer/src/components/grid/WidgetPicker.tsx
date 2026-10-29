import { useState } from 'react'
import { AppWindow, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isBrowserProcess } from '@shared/browsers'
import { BROWSER_WIDGET, DESKTOP_APP_WIDGET } from '@shared/desktop-apps'
import { localize, type PluginCategory } from '@shared/plugins'
import { groupByCategory, matchesSearch } from '../../lib/catalog'
import { listAvailableWidgets, WEB_APP_WIDGET, type RegisteredWidget } from '../../plugins/registry'
import { useDashboardStore } from '../../stores/dashboard'
import { useModules } from '../../stores/modules'
import { pickInstalledApp } from '../../stores/programPicker'
import { useResolvedLanguage, useSettingsStore } from '../../stores/settings'
import { AppIcon } from '../AppIcon'
import { PluginIcon } from '../PluginIcon'
import { Dialog } from '../ui/Dialog'
import { SearchField } from '../ui/SearchField'
import styles from './WidgetPicker.module.css'

interface BlockPickerProps {
  pageId: string
  open: boolean
  onClose: () => void
}

interface Option {
  key: string
  icon: React.ReactNode
  name: string
  description: string
  /** Catégorie (widgets et modules), aussi cherchée par la recherche. */
  category?: PluginCategory
  onClick: () => void
}

interface CategoryGroup {
  /** Nom de la catégorie, ou `null` : liste sans sous-titre. */
  title: string | null
  options: Option[]
}

/**
 * Fenêtre « Ajouter un bloc », avec une recherche, en trois parties :
 * - Widgets : fournis avec Tessera, rangés par catégorie
 * - Applications : celles de Paramètres → Applications (web ou installées), un autre site, ou
 *   un autre programme du PC
 * - Modules : développés par d'autres, rangés par catégorie
 */
export function WidgetPicker({ pageId, open, onClose }: BlockPickerProps): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const userApps = useSettingsStore((state) => state.settings.apps.items)
  // Se réaffiche quand un module est installé ou désinstallé
  useModules()
  const addWidget = useDashboardStore((state) => state.addWidget)
  const [query, setQuery] = useState('')
  const close = (): void => {
    setQuery('')
    onClose()
  }

  // La page défile : il y a toujours une place libre pour un nouveau bloc
  const add = (key: string, config?: Record<string, unknown>): void => {
    addWidget(pageId, key, config)
    close()
  }

  const available = listAvailableWidgets(disabledPlugins)
  const webAppsEnabled = available.some((widget) => widget.key === WEB_APP_WIDGET)
  const desktopAppsEnabled = available.some((widget) => widget.key === DESKTOP_APP_WIDGET)

  const option = (widget: RegisteredWidget): Option => ({
    key: widget.key,
    icon: <PluginIcon name={widget.manifest.icon} />,
    name: localize(widget.manifest.name, language),
    description: localize(widget.manifest.description, language),
    category: widget.category,
    onClick: () => add(widget.key)
  })
  const visible = (item: Option): boolean =>
    matchesSearch(query, [
      item.name,
      item.description,
      item.category ? t(`blocks.categories.${item.category}`) : ''
    ])
  const grouped = (options: Option[]): CategoryGroup[] =>
    groupByCategory(
      options.filter(visible),
      (item) => item.category ?? 'other',
      (item) => item.name
    ).map(({ category, items }) => ({ title: t(`blocks.categories.${category}`), options: items }))

  const widgets = grouped(
    available
      .filter(
        (widget) =>
          widget.builtIn && widget.key !== WEB_APP_WIDGET && widget.key !== DESKTOP_APP_WIDGET
      )
      .map(option)
  )
  const modules = grouped(available.filter((widget) => !widget.builtIn).map(option))
  const apps: Option[] = [
    ...userApps
      .filter((app) => (app.kind === 'web' ? webAppsEnabled : desktopAppsEnabled))
      .map((app) => ({
        key: app.id,
        icon: <AppIcon app={app} size={20} />,
        name: app.name,
        description: app.kind === 'web' ? hostOf(app.url) : t('blocks.picker.installedApp'),
        // Un navigateur va dans un bloc Navigateur
        onClick: () =>
          add(
            app.kind === 'web'
              ? WEB_APP_WIDGET
              : isBrowserProcess(app.processName)
                ? BROWSER_WIDGET
                : DESKTOP_APP_WIDGET,
            { appId: app.id }
          )
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
                (app) =>
                  app &&
                  add(isBrowserProcess(app.processName) ? BROWSER_WIDGET : DESKTOP_APP_WIDGET, {
                    appId: app.id
                  })
              )
          }
        ]
      : [])
  ].filter(visible)

  // Pendant une recherche, les parties sans résultat disparaissent
  const searching = query.trim() !== ''
  const nothing = widgets.length === 0 && modules.length === 0 && apps.length === 0

  return (
    <Dialog title={t('blocks.picker.title')} open={open} onClose={close}>
      <div className={styles.searchBar}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t('blocks.picker.search')}
          autoFocus
        />
      </div>

      {searching && nothing && (
        <p className={styles.empty}>{t('blocks.picker.noResults', { query: query.trim() })}</p>
      )}

      {(!searching || widgets.length > 0) && (
        <Section
          title={t('blocks.picker.widgets')}
          empty={t('blocks.picker.noWidgets')}
          groups={widgets}
        />
      )}

      {(webAppsEnabled || desktopAppsEnabled) && apps.length > 0 && (
        <Section title={t('blocks.picker.apps')} groups={[{ title: null, options: apps }]} />
      )}

      {(!searching || modules.length > 0) && (
        <Section
          title={t('blocks.picker.modules')}
          empty={t('blocks.picker.noModules')}
          groups={modules}
        />
      )}
    </Dialog>
  )
}

function Section({
  title,
  groups,
  empty
}: {
  title: string
  groups: CategoryGroup[]
  empty?: string
}): React.JSX.Element {
  return (
    <section className={styles.category}>
      <h3 className={styles.categoryTitle}>{title}</h3>
      {groups.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        groups.map((group) => (
          <div key={group.title ?? ''} className={styles.group}>
            {group.title && <h4 className={styles.groupTitle}>{group.title}</h4>}
            <ul className={styles.list}>
              {group.options.map((item) => (
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
          </div>
        ))
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
