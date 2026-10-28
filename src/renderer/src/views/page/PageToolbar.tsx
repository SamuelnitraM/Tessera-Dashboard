import { useEffect, useState, type ReactNode } from 'react'
import { Check, LayoutDashboard, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MAIN_PAGE_ID, type DashboardPage, type LayoutMode } from '@shared/dashboard'
import { HeaderBar } from '../../components/headerbar/HeaderBar'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import { usePageName } from '../../hooks/usePageName'
import { useDashboardStore } from '../../stores/dashboard'
import { useNavigationStore } from '../../stores/navigation'
import styles from './PageView.module.css'

/** Délai pendant lequel le bouton « Confirmer la suppression » reste affiché. */
const CONFIRM_DELAY_MS = 4000

interface PageToolbarProps {
  page: DashboardPage
  editing: boolean
  /** Disposition affichée (« Ajuster » range celle-ci). */
  mode: LayoutMode
  onAddWidget: () => void
  /** Boutons écran précédent / suivant, s'ils vont dans la barre. */
  screenButtons?: ReactNode
}

/** En-tête d'une page : titre et bouton « Modifier », ou outils du mode édition. */
export function PageToolbar({
  page,
  editing,
  mode,
  onAddWidget,
  screenButtons
}: PageToolbarProps): React.JSX.Element {
  const { t } = useTranslation()
  const name = usePageName(page)
  const renamePage = useDashboardStore((state) => state.renamePage)
  const setAutoArrange = useDashboardStore((state) => state.setAutoArrange)
  const arrangePage = useDashboardStore((state) => state.arrangePage)
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
        <HeaderBar editing={false} />
        {screenButtons}
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
      <HeaderBar editing />
      <Button
        icon={LayoutDashboard}
        title={t('pages.arrange.hint')}
        disabled={page.autoArrange}
        onClick={() => arrangePage(page.id, mode)}
      >
        {t('pages.arrange.label')}
      </Button>
      <label className={styles.autoArrange} title={t('pages.autoArrange.hint')}>
        <Switch
          aria-label={t('pages.autoArrange.label')}
          checked={page.autoArrange}
          onChange={(value) => setAutoArrange(page.id, value)}
        />
        {t('pages.autoArrange.label')}
      </label>
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
