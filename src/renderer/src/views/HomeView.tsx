import { LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/PageHeader'
import styles from './HomeView.module.css'

/** Page principale. La grille de widgets la remplacera à l'étape 3. */
export function HomeView(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <PageHeader title={t('nav.home')} />
      <div className={styles.empty}>
        <LayoutGrid className={styles.emptyIcon} size={40} strokeWidth={1.5} aria-hidden />
        <h2 className={styles.emptyTitle}>{t('home.emptyTitle')}</h2>
        <p className={styles.emptyText}>{t('home.emptyText')}</p>
      </div>
    </div>
  )
}
