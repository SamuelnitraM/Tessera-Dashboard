import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  appSource,
  pluginSource,
  TESSERA_SOURCE,
  WEB_SOURCE,
  type NotificationSource
} from '@shared/notifications'
import { localize } from '@shared/plugins'
import { getPlugins } from '../plugins/registry'
import { useResolvedLanguage, useSettingsStore } from '../stores/settings'

export interface SourceInfo {
  source: NotificationSource
  name: string
  /** Icône de l'application (image `data:`), ou `null`. */
  icon: string | null
  /** Nom d'icône Lucide d'un widget (manifeste), ou `null`. */
  pluginIcon: string | null
}

/**
 * Sources de notifications (nom et icône) : applications web, pages web, widgets et modules
 * autorisés, et Tessera.
 */
export function useNotificationSources(): {
  sources: SourceInfo[]
  describe: (source: NotificationSource) => SourceInfo
} {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const apps = useSettingsStore((state) => state.settings.apps.items)

  const sources = useMemo<SourceInfo[]>(() => {
    const list: SourceInfo[] = apps
      .filter((app) => app.kind === 'web')
      .map((app) => ({
        source: appSource(app.id),
        name: app.name,
        icon: app.icon,
        pluginIcon: 'globe'
      }))
    list.push({
      source: WEB_SOURCE,
      name: t('notifications.sources.web'),
      icon: null,
      pluginIcon: 'globe'
    })
    for (const plugin of getPlugins()) {
      if (!plugin.manifest?.permissions.includes('notifications')) continue
      list.push({
        source: pluginSource(plugin.id),
        name: localize(plugin.manifest.name, language),
        icon: null,
        pluginIcon: plugin.manifest.widgets[0]?.icon ?? null
      })
    }
    list.push({
      source: TESSERA_SOURCE,
      name: t('notifications.sources.tessera'),
      icon: null,
      pluginIcon: null
    })
    return list
  }, [apps, language, t])

  const describe = useCallback(
    (source: NotificationSource): SourceInfo =>
      sources.find((info) => info.source === source) ?? {
        source,
        name: source.replace(/^\w+:/, ''),
        icon: null,
        pluginIcon: null
      },
    [sources]
  )

  return { sources, describe }
}
