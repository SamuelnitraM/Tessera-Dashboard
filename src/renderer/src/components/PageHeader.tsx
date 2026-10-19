import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  /** Titre affiché, ou un élément personnalisé (ex. champ de saisie du nom en mode édition). */
  title: ReactNode
  /** Boutons alignés à droite. */
  children?: ReactNode
}

/** En-tête commun à toutes les vues (pages, paramètres…). */
export function PageHeader({ title, children }: PageHeaderProps): React.JSX.Element {
  return (
    <header className={styles.header}>
      {typeof title === 'string' ? <h1 className={styles.title}>{title}</h1> : title}
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  )
}
