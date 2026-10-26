import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Plus, RotateCcw, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardGrid } from '../../components/grid/DashboardGrid'
import { WidgetPicker } from '../../components/grid/WidgetPicker'
import { Button } from '../../components/ui/Button'
import { useElementSize } from '../../hooks/useElementSize'
import { getLayoutMode } from '../../lib/grid'
import { PAGE_WHEEL_EVENT, setActiveBlock, useActiveBlockStore } from '../../stores/activeBlock'
import { useDashboardStore } from '../../stores/dashboard'
import { useCoverDesktopApps } from '../../stores/desktopApps'
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
  // Mode édition : les fenêtres des applications installées laissent place à leur image
  useCoverDesktopApps(editing, 'mode édition')

  const [gridRef, size] = useElementSize<HTMLDivElement>()
  const scroller = useRef<HTMLDivElement | null>(null)
  const setGridArea = (element: HTMLDivElement | null): void => {
    scroller.current = element
    gridRef(element)
  }
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

  const measured = size !== null
  // Hors édition, la molette fait défiler la page, pas l'intérieur des blocs (sauf le bloc
  // actif, où l'on a cliqué). Les pages web et les applications installées envoient leur
  // molette par PAGE_WHEEL_EVENT.
  useEffect(() => {
    const area = scroller.current
    if (!area) return
    const scrolls = (): boolean => area.scrollHeight > area.clientHeight + 1
    const update = (): void => useActiveBlockStore.setState({ pageScrolls: scrolls() })
    const observer = new ResizeObserver(update)
    observer.observe(area)
    if (area.firstElementChild) observer.observe(area.firstElementChild)
    update()
    const onWheel = (event: WheelEvent): void => {
      if (editing || !scrolls()) return
      const block = (event.target as HTMLElement).closest<HTMLElement>('[data-block-id]')
      if (!block || block.dataset.blockId === useActiveBlockStore.getState().activeId) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? area.clientHeight : 1
      area.scrollTop += event.deltaY * unit
    }
    const onPageWheel = (event: Event): void => {
      area.scrollTop += (event as CustomEvent<number>).detail
    }
    // Clic hors de tout bloc : plus aucun bloc actif
    const onPointerDown = (event: PointerEvent): void => {
      if (!(event.target as HTMLElement).closest('[data-block-id]')) setActiveBlock(null)
    }
    area.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener(PAGE_WHEEL_EVENT, onPageWheel)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      observer.disconnect()
      area.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener(PAGE_WHEEL_EVENT, onPageWheel)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [editing, page.id, measured])

  // Mode édition ou autre page : plus de bloc actif. Le focus reste (bloc d'une notification
  // dont la page s'ouvre) ; en mode édition, les blocs ne l'affichent pas.
  useEffect(() => useActiveBlockStore.setState({ activeId: null }), [editing, page.id])

  const openPicker = (): void => {
    setEditing(true)
    setPickerOpen(true)
  }

  const isEmpty = page.widgets.length === 0

  return (
    <div className={styles.page}>
      <PageToolbar page={page} editing={editing} mode={mode} onAddWidget={openPicker} />

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

      <div ref={setGridArea} className={styles.gridArea}>
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

      <WidgetPicker pageId={page.id} open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  )
}
