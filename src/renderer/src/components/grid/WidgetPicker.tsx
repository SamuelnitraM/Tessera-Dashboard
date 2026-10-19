import { useEffect, useRef, useState } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LayoutMode } from '@shared/dashboard'
import { useDashboardStore } from '../../stores/dashboard'
import { WIDGETS } from '../../widgets/registry'
import styles from './WidgetPicker.module.css'

interface WidgetPickerProps {
  pageId: string
  mode: LayoutMode
  open: boolean
  onClose: () => void
}

/** Fenêtre de choix d'un widget à ajouter sur la page. */
export function WidgetPicker({
  pageId,
  mode,
  open,
  onClose
}: WidgetPickerProps): React.JSX.Element {
  const { t } = useTranslation()
  const addWidget = useDashboardStore((state) => state.addWidget)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pageFull, setPageFull] = useState(false)

  // <dialog> natif : gère le fond, le focus et la touche Échap
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setPageFull(false)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleAdd = (type: string): void => {
    if (addWidget(pageId, type, mode) === 'page-full') {
      setPageFull(true)
    } else {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="widget-picker-title"
      onClose={onClose}
      // Clic sur le fond assombri = fermer
      onClick={(event) => event.target === dialogRef.current && onClose()}
    >
      <header className={styles.header}>
        <h2 id="widget-picker-title">{t('widgets.picker.title')}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label={t('widgets.picker.close')}
          onClick={onClose}
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      {pageFull && (
        <p className={styles.alert} role="alert">
          <CircleAlert size={16} aria-hidden />
          {t('pages.pageFull')}
        </p>
      )}

      <ul className={styles.list}>
        {WIDGETS.map(({ type, icon: Icon }) => (
          <li key={type}>
            <button type="button" className={styles.option} onClick={() => handleAdd(type)}>
              <span className={styles.optionIcon}>
                <Icon size={20} aria-hidden />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionName}>{t(`widgets.${type}.name`)}</span>
                <span className={styles.optionDescription}>{t(`widgets.${type}.description`)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
