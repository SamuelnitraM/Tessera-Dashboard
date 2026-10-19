import { useEffect, useState } from 'react'
import { Check, Maximize, Pencil, Plus, Rows3, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MAIN_PAGE_ID, type DashboardPage } from '@shared/dashboard'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { usePageName } from '../../hooks/usePageName'
import { useDashboardStore } from '../../stores/dashboard'
import { useNavigationStore } from '../../stores/navigation'
import styles from './PageView.module.css'

/** Délai pendant lequel le bouton « Confirmer la suppression » reste affiché. */
const CONFIRM_DELAY_MS = 4000

interface PageToolbarProps {
  page: DashboardPage
  editing: boolean
  onAddWidget: () => void
}

/** En-tête d'une page : titre et bouton « Modifier », ou outils du mode édition. */
export function PageToolbar({ page, editing, onAddWidget }: PageToolbarProps): React.JSX.Element {
  const { t } = useTranslation()
  const name = usePageName(page)
  const renamePage = useDashboardStore((state) => state.renamePage)
  const setFitMode = useDashboardStore((state) => state.setFitMode)
  const deletePage = useDashboardStore((state) => state.deletePage)
  const navigate = useNavigationStore((state) => state.navigate)
  const setEditing = useNavigationStore((state) => state.setEditing)

  // Suppression en deux clics : le premier demande confirmation
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  useEffect(() => {
    if (!confirmingDelete) return
    const timer = window.setTimeout(() => setConfirmingDelete(false), CONFIRM_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [confirmingDelete])

  if (!editing) {
    return (
      <PageHeader title={name}>
        <Button icon={Pencil} onClick={() => setEditing(true)}>
          {t('pages.edit')}
        </Button>
      </PageHeader>
    )
  }

  const handleDelete = (): void => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deletePage(page.id)
    navigate({ type: 'page', pageId: MAIN_PAGE_ID })
  }

  return (
    <PageHeader
      title={
        <input
          className={styles.nameInput}
          value={page.name}
          placeholder={name}
          maxLength={60}
          aria-label={t('pages.name')}
          onChange={(event) => renamePage(page.id, event.target.value)}
        />
      }
    >
      <SegmentedControl
        aria-label={t('pages.fitMode.label')}
        value={page.fitMode}
        onChange={(fitMode) => setFitMode(page.id, fitMode)}
        options={[
          { value: 'fit', label: t('pages.fitMode.fit'), icon: Maximize },
          { value: 'scroll', label: t('pages.fitMode.scroll'), icon: Rows3 }
        ]}
      />
      <Button icon={Plus} onClick={onAddWidget}>
        {t('pages.addBlock')}
      </Button>
      {!page.isMain && (
        <Button variant="danger" icon={Trash2} onClick={handleDelete}>
          {confirmingDelete ? t('pages.confirmDelete') : t('pages.delete')}
        </Button>
      )}
      <Button variant="primary" icon={Check} onClick={() => setEditing(false)}>
        {t('pages.done')}
      </Button>
    </PageHeader>
  )
}
