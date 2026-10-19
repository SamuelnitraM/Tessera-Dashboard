import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../settings.module.css'

interface ComingSoonSectionProps {
  icon: LucideIcon
  text: string
}

/** Section prévue dans une étape ultérieure de la feuille de route. */
export function ComingSoonSection({ icon: Icon, text }: ComingSoonSectionProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className={styles.comingSoon}>
      <Icon size={32} strokeWidth={1.5} aria-hidden />
      <h3>{t('settings.comingSoon.title')}</h3>
      <p>{text}</p>
    </div>
  )
}
