import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { stageWheel } from '../../stores/videoStage'
import { screenStops, SNAP_ROWS, usePageScreensStore } from '../../stores/pageScreens'
import { useSettingsStore } from '../../stores/settings'
import { PageToolbar } from './PageToolbar'
import { ScreenButtons } from './ScreenButtons'
import styles from './PageView.module.css'

interface PageViewProps {
  pageId: string
}

/** Une page du tableau de bord : en-tête, puis grille de widgets. */
/** Défilement venu de la molette : dans ce délai après elle (ms). */
const WHEEL_SCROLL_MS = 250
/** La page se cale après ce délai sans défilement (ms). */
const SNAP_AFTER_MS = 160

/** L'élément peut encore défiler dans ce sens (molette vers le bas si `deltaY` est positif). */
function canScroll(node: Element, deltaY: number, root = false): boolean {
  if (node.scrollHeight <= node.clientHeight + 1) return false
  // Élément d'un cadre intégré : son style est lu dans sa propre page
  const overflow = (node.ownerDocument.defaultView ?? window).getComputedStyle(node).overflowY
  if (root ? overflow === 'hidden' : !/auto|scroll|overlay/.test(overflow)) return false
  return deltaY > 0
    ? node.scrollTop + node.clientHeight < node.scrollHeight - 1
    : node.scrollTop > 0
}

/**
 * Un élément entre `target` et son bloc peut-il encore défiler dans ce sens ? Un cadre intégré
 * du même site (texte d'un mail, qui rejoue sa molette sur le cadre) compte avec son contenu. Une
 * molette horizontale est laissée au bloc.
 */
function scrollsWithin(target: Element, block: Element, deltaY: number): boolean {
  if (deltaY === 0) return true
  for (let node: Element | null = target; node && node !== block.parentElement;) {
    const inner = node instanceof HTMLIFrameElement ? node.contentDocument?.scrollingElement : null
    if (canScroll(node, deltaY) || (inner && canScroll(inner, deltaY, true))) return true
    node = node.parentElement
  }
  return false
}

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
  const [area, setArea] = useState<HTMLDivElement | null>(null)
  const setGridArea = (element: HTMLDivElement | null): void => {
    scroller.current = element
    setArea(element)
    gridRef(element)
  }
  const screenButtons = useSettingsStore((state) => state.settings.appearance.screenButtons)
  const mode = size ? getLayoutMode(size.width) : 'wide'
  // Autre page : elle s'ouvre en haut (la zone de la grille reste la même d'une page à l'autre)
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [page.id])
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
      if (!block) return
      // Bloc qui a le focus : son contenu défile ; arrivé au bout (ou sans rien à faire
      // défiler), la page ne bouge pas
      if (block.dataset.blockId === useActiveBlockStore.getState().activeId) {
        if (!scrollsWithin(event.target as Element, block, event.deltaY)) event.preventDefault()
        return
      }
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? area.clientHeight : 1
      area.scrollTop += event.deltaY * unit
    }
    const onPageWheel = (event: Event): void => {
      const deltaY = (event as CustomEvent<number>).detail
      if (stageWheel(deltaY, area)) return
      area.scrollTop += deltaY
    }
    // Clic hors de tout bloc : plus aucun bloc actif
    const onPointerDown = (event: PointerEvent): void => {
      if (!(event.target as HTMLElement).closest('[data-block-id]')) setActiveBlock(null)
    }
    // Aimantation légère, à la molette seulement : la page arrêtée à moins de 2 lignes d'une
    // limite d'écran s'y cale doucement
    let lastWheel = 0
    let snapTimer = 0
    const onAnyWheel = (): void => {
      lastWheel = performance.now()
    }
    const snap = (): void => {
      const top = area.scrollTop
      const reach = SNAP_ROWS * usePageScreensStore.getState().rowStep
      const stop = screenStops().find((value) => {
        const distance = Math.abs(value - top)
        return distance >= 1 && distance < reach
      })
      if (stop !== undefined) area.scrollTo({ top: stop, behavior: 'smooth' })
    }
    const onScroll = (): void => {
      if (performance.now() - lastWheel > WHEEL_SCROLL_MS) return
      window.clearTimeout(snapTimer)
      snapTimer = window.setTimeout(snap, SNAP_AFTER_MS)
    }
    area.addEventListener('wheel', onWheel, { passive: false, capture: true })
    area.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onAnyWheel, { passive: true, capture: true })
    window.addEventListener(PAGE_WHEEL_EVENT, onAnyWheel)
    window.addEventListener(PAGE_WHEEL_EVENT, onPageWheel)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      observer.disconnect()
      window.clearTimeout(snapTimer)
      area.removeEventListener('wheel', onWheel, { capture: true })
      area.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onAnyWheel, { capture: true })
      window.removeEventListener(PAGE_WHEEL_EVENT, onAnyWheel)
      window.removeEventListener(PAGE_WHEEL_EVENT, onPageWheel)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [editing, page.id, measured])

  const openPicker = (): void => {
    setEditing(true)
    setPickerOpen(true)
  }

  const isEmpty = page.widgets.length === 0

  return (
    <div className={styles.page}>
      <PageToolbar
        page={page}
        editing={editing}
        mode={mode}
        onAddWidget={openPicker}
        screenButtons={screenButtons === 'toolbar' ? <ScreenButtons area={area} /> : null}
      />

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

      {/* Zone de la grille, et boutons d'écran posés dessus (ils ne défilent pas avec elle) */}
      <div className={styles.gridFrame}>
        <div ref={setGridArea} className={styles.gridArea} data-page-scroller>
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
        {screenButtons !== 'toolbar' && screenButtons !== 'hidden' && (
          <ScreenButtons area={area} floating={screenButtons} />
        )}
      </div>

      <WidgetPicker pageId={page.id} open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  )
}
