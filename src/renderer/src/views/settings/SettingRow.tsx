import { useId, type ReactNode } from 'react'
import styles from './settings.module.css'

interface SettingsCardProps {
  title?: string
  children: ReactNode
}

/** Bloc regroupant plusieurs réglages liés. */
export function SettingsCard({ title, children }: SettingsCardProps): React.JSX.Element {
  return (
    <section className={styles.card}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      {children}
    </section>
  )
}

interface SettingRowProps {
  label: string
  description?: string
  /** Reçoit les identifiants du libellé et de la description, pour l'accessibilité du contrôle. */
  children: (ids: { labelId: string; descriptionId: string }) => ReactNode
  /** Contrôle sous le libellé plutôt qu'à droite (pour les contrôles larges). */
  stacked?: boolean
}

/** Une ligne de réglage : libellé et description à gauche, contrôle à droite. */
export function SettingRow({
  label,
  description,
  children,
  stacked = false
}: SettingRowProps): React.JSX.Element {
  const labelId = useId()
  const descriptionId = useId()

  return (
    <div className={styles.row} data-stacked={stacked}>
      <div className={styles.rowText}>
        <span id={labelId} className={styles.rowLabel}>
          {label}
        </span>
        {description && (
          <span id={descriptionId} className={styles.rowDescription}>
            {description}
          </span>
        )}
      </div>
      <div className={styles.rowControl}>{children({ labelId, descriptionId })}</div>
    </div>
  )
}
