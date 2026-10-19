import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCoverDesktopApps } from '../../stores/desktopApps'
import styles from './Dialog.module.css'

interface DialogProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Fenêtre modale basée sur l'élément natif <dialog> :
 * fond assombri, focus piégé et touche Échap gérés par le navigateur.
 */
export function Dialog({ title, open, onClose, children }: DialogProps): React.JSX.Element {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Les fenêtres des applications installées passeraient devant : remplacées par leur image
  useCoverDesktopApps(open)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      // `no-drag` : une fenêtre ouverte depuis un widget ne doit pas déclencher son déplacement
      className={`${styles.dialog} no-drag`}
      aria-labelledby={titleId}
      onClose={onClose}
      // Clic sur le fond assombri = fermer
      onClick={(event) => event.target === dialogRef.current && onClose()}
    >
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <X size={18} aria-hidden />
        </button>
      </header>
      {open && <div className={styles.body}>{children}</div>}
    </dialog>
  )
}
