import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
}

/** En-tête commun à toutes les vues (pages, paramètres…). */
export function PageHeader({ title }: PageHeaderProps): React.JSX.Element {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
    </header>
  )
}
