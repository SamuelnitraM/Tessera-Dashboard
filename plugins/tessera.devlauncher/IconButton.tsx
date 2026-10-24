import type { LucideIcon } from 'lucide-react'
import styles from './DevLauncherWidget.module.css'

/** Petit bouton à icône seule (libellé en infobulle). */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`${styles.iconButton} no-drag`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}
