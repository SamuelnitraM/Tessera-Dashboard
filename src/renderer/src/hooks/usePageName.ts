import { useTranslation } from 'react-i18next'
import type { DashboardPage } from '@shared/dashboard'

/** Nom affiché d'une page : son nom, ou « Accueil » / « Page sans titre » s'il est vide. */
export function usePageName(page: DashboardPage): string {
  const { t } = useTranslation()
  return page.name.trim() || (page.isMain ? t('nav.home') : t('pages.untitled'))
}
