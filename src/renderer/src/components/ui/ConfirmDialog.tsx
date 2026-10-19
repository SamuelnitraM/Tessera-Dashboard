import { Button } from './Button'
import { Dialog } from './Dialog'
import styles from './Dialog.module.css'

export interface ConfirmAction {
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  onClick: () => void
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Boutons, du moins au plus important (le dernier est mis en avant). */
  actions: ConfirmAction[]
  onClose: () => void
}

/** Fenêtre de confirmation : un message et quelques choix. */
export function ConfirmDialog({
  open,
  title,
  message,
  actions,
  onClose
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'secondary'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Dialog>
  )
}
