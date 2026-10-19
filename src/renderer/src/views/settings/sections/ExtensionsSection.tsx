import { TriangleAlert } from 'lucide-react'
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
          {plugin.builtIn && (
            <span className={styles.badge}>{t('settings.extensions.builtIn')}</span>
          )}
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
