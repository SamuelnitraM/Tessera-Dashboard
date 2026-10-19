import { useEffect, useState } from 'react'
import { LayoutGrid, Plus, RotateCcw, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardGrid } from '../../components/grid/DashboardGrid'
import { WidgetPicker } from '../../components/grid/WidgetPicker'
import { Button } from '../../components/ui/Button'
import { useElementSize } from '../../hooks/useElementSize'
import { getLayoutMode } from '../../lib/grid'
import { useDashboardStore } from '../../stores/dashboard'
import { useNavigationStore } from '../../stores/navigation'
import { PageToolbar } from './PageToolbar'
import styles from './PageView.module.css'

interface PageViewProps {
  pageId: string
}

/** Une page du tableau de bord : en-tête, puis grille de widgets. */
export function PageView({ pageId }: PageViewProps): React.JSX.Element {
  const { t } = useTranslation()
  // Page introuvable (ex. supprimée) : on affiche la page principale
  const page = useDashboardStore(
    (state) =>
      state.dashboard.pages.find((candidate) => candidate.id === pageId) ?? state.dashboard.pages[0]
  )
  const resetCompactLayout = useDashboardStore((state) => state.resetCompactLayout)
  const editing = useNavigationStore((state) => state.editing)
  const setEditing = useNavigationStore((state) => state.setEditing)

  const [gridRef, size] = useElementSize<HTMLDivElement>()
  const mode = size ? getLayoutMode(size.width) : 'wide'
  const [pickerOpen, setPickerOpen] = useState(false)

  // Échap quitte le mode édition (sauf si la fenêtre d'ajout est ouverte : elle se ferme d'abord)
  useEffect(() => {
    if (!editing || pickerOpen) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setEditing(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing, pickerOpen, setEditing])

  const openPicker = (): void => {
    setEditing(true)
    setPickerOpen(true)
  }

  const isEmpty = page.widgets.length === 0

  return (
    <div className={styles.page}>
      <PageToolbar page={page} editing={editing} onAddWidget={openPicker} />

      {editing && mode === 'compact' && (
        <div className={styles.notice}>
          <Smartphone size={16} aria-hidden />
          <span>{t('pages.compactNotice')}</span>
          {page.layouts.compact && (
            <Button variant="ghost" icon={RotateCcw} onClick={() => resetCompactLayout(page.id)}>
              {t('pages.resetCompact')}
            </Button>
          )}
        </div>
      )}

      <div
        ref={gridRef}
        className={styles.gridArea}
        data-scroll={mode === 'compact' || page.fitMode === 'scroll'}
      >
        {isEmpty ? (
          <div className={styles.empty}>
            <LayoutGrid className={styles.emptyIcon} size={40} strokeWidth={1.5} aria-hidden />
            <h2 className={styles.emptyTitle}>{t('pages.emptyTitle')}</h2>
            <p className={styles.emptyText}>{t('pages.emptyText')}</p>
            <Button variant="primary" icon={Plus} onClick={openPicker}>
              {t('pages.addBlock')}
            </Button>
          </div>
        ) : (
          size && (
            <DashboardGrid
              page={page}
              editing={editing}
              mode={mode}
              width={size.width}
              height={size.height}
            />
          )
        )}
      </div>

      <WidgetPicker
        pageId={page.id}
        mode={mode}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
