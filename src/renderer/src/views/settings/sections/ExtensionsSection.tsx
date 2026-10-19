import { useEffect, useState } from 'react'
import { AppWindow, FolderLock, Globe, SquareTerminal, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { localize } from '@shared/plugins'
import { PluginIcon } from '../../../components/PluginIcon'
import { Switch } from '../../../components/ui/Switch'
import { getPlugins, type LoadedPlugin } from '../../../plugins/registry'
import { useResolvedLanguage, useSettingsStore } from '../../../stores/settings'
import styles from '../settings.module.css'

/** Liste des extensions installées, avec activation / désactivation. */
export function ExtensionsSection(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <p className={styles.sectionIntro}>{t('settings.extensions.intro')}</p>
      <ul className={styles.extensionList}>
        {getPlugins().map((plugin) => (
          <ExtensionCard key={plugin.id} plugin={plugin} />
        ))}
      </ul>
    </>
  )
}

/** Dossier auquel l'extension a accès (permission « files »). */
function FilesPermission({ pluginId }: { pluginId: string }): React.JSX.Element | null {
  const { t } = useTranslation()
  const [folder, setFolder] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    window.tessera.pluginFiles
      .getFolder(pluginId)
      .then((path) => active && setFolder(path))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [pluginId])

  if (!folder) return null
  return (
    <p className={styles.extensionPermission}>
      <FolderLock size={13} aria-hidden />
      {t('settings.extensions.filesPermission', { folder })}
    </p>
  )
}

function ExtensionCard({ plugin }: { plugin: LoadedPlugin }): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const update = useSettingsStore((state) => state.update)

  const { manifest } = plugin
  const name = manifest ? localize(manifest.name, language) : plugin.id
  const enabled = !disabledPlugins.includes(plugin.id)

  const toggle = (checked: boolean): void => {
    const disabled = checked
      ? disabledPlugins.filter((id) => id !== plugin.id)
      : [...disabledPlugins, plugin.id]
    void update({ plugins: { disabled } })
  }

  return (
    <li className={styles.extension} data-enabled={enabled && !plugin.error}>
      <span className={styles.extensionIcon}>
        {plugin.error ? (
          <TriangleAlert size={20} aria-hidden />
        ) : (
          <PluginIcon name={manifest?.widgets[0]?.icon} />
        )}
      </span>

      <div className={styles.extensionBody}>
        <div className={styles.extensionHeader}>
          <span className={styles.rowLabel}>{name}</span>
          {manifest && <span className={styles.extensionMeta}>v{manifest.version}</span>}
          <span className={styles.badge}>
            {plugin.builtIn ? t('settings.extensions.builtIn') : t('settings.extensions.module')}
          </span>
        </div>

        {plugin.error ? (
          <p className={styles.extensionError}>
            {t('settings.extensions.invalid')} — {plugin.error}
          </p>
        ) : (
          manifest && (
            <>
              <p className={styles.rowDescription}>{localize(manifest.description, language)}</p>
              <p className={styles.extensionMeta}>
                {t('settings.extensions.author', { author: manifest.author })} ·{' '}
                {t('settings.extensions.widgets', {
                  list: manifest.widgets.map((widget) => localize(widget.name, language)).join(', ')
                })}
              </p>
              {manifest.permissions.includes('files') && <FilesPermission pluginId={plugin.id} />}
              {manifest.permissions.includes('processes') && (
                <p className={styles.extensionPermission}>
                  <SquareTerminal size={13} aria-hidden />
                  {t('settings.extensions.processesPermission')}
                </p>
              )}
              {manifest.permissions.includes('web') && (
                <p className={styles.extensionPermission}>
                  <Globe size={13} aria-hidden />
                  {t('settings.extensions.webPermission')}
                </p>
              )}
              {manifest.permissions.includes('apps') && (
                <p className={styles.extensionPermission}>
                  <AppWindow size={13} aria-hidden />
                  {t('settings.extensions.appsPermission')}
                </p>
              )}
            </>
          )
        )}
      </div>

      {!plugin.error && (
        <Switch
          aria-label={t('settings.extensions.toggle', { name })}
          checked={enabled}
          onChange={toggle}
        />
      )}
    </li>
  )
}
