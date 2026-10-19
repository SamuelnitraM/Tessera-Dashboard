import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LayoutMode } from '@shared/dashboard'
import { localize } from '@shared/plugins'
import { listAvailableWidgets } from '../../plugins/registry'
import { useDashboardStore } from '../../stores/dashboard'
import { useResolvedLanguage, useSettingsStore } from '../../stores/settings'
import { PluginIcon } from '../PluginIcon'
import { Dialog } from '../ui/Dialog'
import styles from './WidgetPicker.module.css'

interface WidgetPickerProps {
  pageId: string
  mode: LayoutMode
  open: boolean
  onClose: () => void
}

/** Fenêtre de choix d'un widget à ajouter, parmi ceux des extensions activées. */
export function WidgetPicker({
  pageId,
  mode,
  open,
  onClose
}: WidgetPickerProps): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const addWidget = useDashboardStore((state) => state.addWidget)
  const [pageFull, setPageFull] = useState(false)

  // L'alerte « page pleine » est oubliée à la fermeture
  const close = (): void => {
    setPageFull(false)
    onClose()
  }

  const handleAdd = (key: string): void => {
    if (addWidget(pageId, key, mode) === 'page-full') setPageFull(true)
    else close()
  }

  const widgets = listAvailableWidgets(disabledPlugins)

  return (
    <Dialog title={t('widgets.picker.title')} open={open} onClose={close}>
      {pageFull && (
        <p className={styles.alert} role="alert">
          <CircleAlert size={16} aria-hidden />
          {t('pages.pageFull')}
        </p>
      )}

      {widgets.length === 0 ? (
        <p className={styles.empty}>{t('widgets.picker.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {widgets.map(({ key, manifest }) => (
            <li key={key}>
              <button type="button" className={styles.option} onClick={() => handleAdd(key)}>
                <span className={styles.optionIcon}>
                  <PluginIcon name={manifest.icon} />
                </span>
                <span className={styles.optionText}>
                  <span className={styles.optionName}>{localize(manifest.name, language)}</span>
                  <span className={styles.optionDescription}>
                    {localize(manifest.description, language)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
