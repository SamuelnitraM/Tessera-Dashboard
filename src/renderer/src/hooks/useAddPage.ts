import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '../stores/dashboard'
import { useNavigationStore } from '../stores/navigation'

/** Crée une page et l'ouvre directement en mode édition. */
export function useAddPage(): () => void {
  const { t } = useTranslation()
  const pages = useDashboardStore((state) => state.dashboard.pages)
  const addPage = useDashboardStore((state) => state.addPage)
  const navigate = useNavigationStore((state) => state.navigate)
  const setEditing = useNavigationStore((state) => state.setEditing)
  return () => {
    const pageId = addPage(t('pages.defaultName', { n: pages.length + 1 }))
    navigate({ type: 'page', pageId })
    setEditing(true)
  }
}
