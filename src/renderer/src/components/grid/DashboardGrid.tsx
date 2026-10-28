import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactGridLayout, { getCompactor, type Layout, type LayoutItem } from 'react-grid-layout'
import { GridBackground } from 'react-grid-layout/extras'
import 'react-grid-layout/css/styles.css'
import { GRID, type DashboardPage, type GridItem, type LayoutMode } from '@shared/dashboard'
import {
  HEADER_WIDGET_DRAG,
  HEADER_WIDGETS,
  headerWidgetBlock,
  type HeaderWidget
} from '@shared/header-bar'
import {
  colsFor,
  layoutBottom,
  normalizeLayout,
  planMove,
  resolveLayout,
  sameLayout,
  toCompactMinSize,
  type MovePlan
} from '../../lib/grid'
import { leaveBlock, setActiveBlock, useActiveBlockStore } from '../../stores/activeBlock'
import { useDashboardStore } from '../../stores/dashboard'
import { fillsScreen, screenLines, usePageScreensStore } from '../../stores/pageScreens'
import { useSettingsStore } from '../../stores/settings'
import { getDefaultSize, getMinSize } from '../../plugins/registry'
import { getDraggedWidget } from '../headerbar/drag'
import { WidgetFrame } from './WidgetFrame'
import styles from './DashboardGrid.module.css'

// Pendant un déplacement ou un redimensionnement, rien ne bouge : le bloc tenu passe au-dessus
// des autres, et le plan (qui s'écarte, où) s'affiche en aperçu. Il s'applique au relâchement.
const FREE_COMPACTOR = getCompactor(null, true, false)

/** Hauteur minimale d'une ligne (px), même dans une très petite fenêtre. */
const MIN_ROW_HEIGHT = 24
/** Lignes libres affichées sous les blocs en mode édition (pour en poser plus bas). */
const EXTRA_EDIT_ROWS = 4
/** Bloc tenu près du bord haut ou bas de la zone (px) : la page défile toute seule. */
const EDGE_SCROLL = 56
/** Vitesse maximale de ce défilement (px par image). */
const EDGE_SPEED = 18

interface DashboardGridProps {
  page: DashboardPage
  editing: boolean
  mode: LayoutMode
  /** Taille de la zone disponible (px). */
  width: number
  height: number
}

/** Déplacement en cours : bloc tenu, case visée et plan au relâchement. */
interface Moving {
  id: string
  target: GridItem
  plan: MovePlan
}

const sameCell = (a: GridItem, b: GridItem): boolean =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

/**
 * Grille de widgets d'une page.
 * - Disposition large (24 colonnes) : 12 lignes qui remplissent la hauteur de la zone ; la page
 *   continue en dessous (elle défile) si des blocs dépassent.
 * - Disposition compacte (fenêtre étroite, 12 colonnes, cases carrées), modifiable séparément.
 */
export function DashboardGrid({
  page,
  editing,
  mode,
  width,
  height
}: DashboardGridProps): React.JSX.Element {
  const { t } = useTranslation()
  /** Taille d'un écran (lignes qui remplissent la zone visible, disposition large). */
  const screenRows = useSettingsStore((state) => state.settings.appearance.screenRows)
  const setLayout = useDashboardStore((state) => state.setLayout)
  const addWidget = useDashboardStore((state) => state.addWidget)
  const activeId = useActiveBlockStore((state) => state.activeId)
  const root = useRef<HTMLDivElement>(null)

  const cols = colsFor(mode)
  const gap = GRID.gap

  const layout = useMemo(
    () => resolveLayout(page, mode, (widget) => getDefaultSize(widget.type)),
    [page, mode]
  )

  const colWidth = (width - gap * (cols - 1)) / cols
  // Arrondi vers le bas : les 12 premières lignes ne dépassent jamais la hauteur disponible
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    Math.floor(mode === 'wide' ? (height - gap * (screenRows - 1)) / screenRows : colWidth)
  )

  const [moving, setMoving] = useState<Moving | null>(null)
  /** Widget de la barre des pages glissé sur la grille : case où il serait posé. */
  const [dropSpot, setDropSpot] = useState<GridItem | null>(null)
  /** Change après un déplacement : la grille reprend la disposition enregistrée. */
  const [revision, setRevision] = useState(0)

  // Taille minimale propre à chaque type de widget. Une application installée plus grande que
  // son bloc est rognée (on choisit la partie affichée) : elle n'impose pas la taille du bloc.
  const gridLayout = useMemo<Layout>(
    () =>
      layout.map((item) => {
        const type = page.widgets.find((widget) => widget.id === item.i)?.type ?? ''
        const min = mode === 'wide' ? getMinSize(type) : toCompactMinSize(getMinSize(type))
        return { ...item, minW: Math.min(min.w, cols), minH: min.h }
      }),
    // `revision` : nouvelle disposition (même identique) pour annuler la position du glisser
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, page.widgets, mode, cols, revision]
  )

  // Lignes affichées : au moins la hauteur de la zone, plus de la place libre en mode édition
  const bottom = Math.max(mode === 'wide' ? screenRows : 0, layoutBottom(layout))
  const rows = editing ? bottom + EXTRA_EDIT_ROWS : bottom

  // Écrans de la page (disposition large) : 12 lignes chacun. Limites coupées par un bloc
  // signalées en mode édition, sautées par la molette et les boutons d'écran.
  const lines = useMemo(
    () => (mode === 'wide' ? screenLines(layout, Math.max(rows, bottom + 1), screenRows) : []),
    [layout, mode, rows, bottom, screenRows]
  )
  useEffect(() => {
    if (mode !== 'wide') {
      usePageScreensStore.setState({ rowStep: 0, rows: [], screenBlocks: {} })
      return
    }
    const screenBlocks: Record<string, number> = {}
    for (const item of layout) {
      if (fillsScreen(item, cols, screenRows)) screenBlocks[item.i] = item.y + screenRows
    }
    usePageScreensStore.setState({
      rowStep: rowHeight + gap,
      rows: lines.filter((line) => !line.cut && line.row < bottom).map((line) => line.row),
      screenBlocks
    })
  }, [mode, layout, lines, rowHeight, gap, cols, bottom, screenRows])

  /** Taille « écran entier » : toute la largeur, 12 lignes, au début de son écran. */
  const fillScreen = (id: string): void => {
    const item = layout.find((entry) => entry.i === id)
    if (!item || mode !== 'wide') return
    const y = Math.floor(item.y / screenRows) * screenRows
    const target: GridItem = { i: id, x: 0, y, w: cols, h: screenRows }
    const next = normalizeLayout(planMove(layout, id, target, cols, page.autoArrange).layout)
    if (!sameLayout(next, layout)) setLayout(page.id, mode, next)
  }

  /** Case visée par le bloc tenu : plan au relâchement (recalculé seulement si elle change). */
  const preview = (item: LayoutItem | null): void => {
    if (!item) return
    const target: GridItem = { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }
    if (moving && moving.id === item.i && sameCell(moving.target, target)) return
    setMoving({
      id: item.i,
      target,
      plan: planMove(layout, item.i, target, cols, page.autoArrange)
    })
  }

  /** Relâchement : le plan s'applique (les blocs gênés s'écartent ou prennent la place libérée). */
  const finish = (item: LayoutItem | null): void => {
    setMoving(null)
    setRevision((value) => value + 1)
    if (!item) return
    const target: GridItem = { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }
    const next = normalizeLayout(planMove(layout, item.i, target, cols, page.autoArrange).layout)
    if (!sameLayout(next, layout)) setLayout(page.id, mode, next)
  }

  // Bloc tenu près du bord haut ou bas : la page défile ; la molette fonctionne aussi
  useEffect(() => {
    if (!moving) return
    const scroller = root.current?.parentElement
    if (!scroller) return
    let pointerY: number | null = null
    let frame = 0
    const onMove = (event: PointerEvent | MouseEvent): void => {
      pointerY = event.clientY
    }
    const step = (): void => {
      if (pointerY !== null) {
        const box = scroller.getBoundingClientRect()
        const above = box.top + EDGE_SCROLL - pointerY
        const below = pointerY - (box.bottom - EDGE_SCROLL)
        if (above > 0) scroller.scrollTop -= Math.ceil((above / EDGE_SCROLL) * EDGE_SPEED)
        else if (below > 0) scroller.scrollTop += Math.ceil((below / EDGE_SCROLL) * EDGE_SPEED)
      }
      frame = requestAnimationFrame(step)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('mousemove', onMove)
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('mousemove', onMove)
    }
    // Une seule boucle par geste (le plan change à chaque case)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving !== null])

  /** Position à l'écran d'une case de la grille (px, dans la grille). */
  const cellBox = (item: GridItem): React.CSSProperties => ({
    left: item.x * (colWidth + gap),
    top: item.y * (rowHeight + gap),
    width: item.w * colWidth + (item.w - 1) * gap,
    height: item.h * rowHeight + (item.h - 1) * gap
  })

  /** Case sous la souris pour un widget de la barre glissé (taille par défaut de son bloc). */
  const spotAt = (event: React.DragEvent): GridItem => {
    const box = root.current!.getBoundingClientRect()
    const block = headerWidgetBlock(getDraggedWidget() ?? 'datetime')
    const size = block.size ?? getDefaultSize(block.type)
    const w = Math.min(size.w, cols)
    return {
      i: '',
      x: Math.max(0, Math.min(cols - w, Math.floor((event.clientX - box.left) / (colWidth + gap)))),
      y: Math.max(0, Math.floor((event.clientY - box.top) / (rowHeight + gap))),
      w,
      h: size.h
    }
  }

  const acceptsDrop = (event: React.DragEvent): boolean =>
    editing && event.dataTransfer.types.includes(HEADER_WIDGET_DRAG)

  const onDragOver = (event: React.DragEvent): void => {
    if (!acceptsDrop(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    const spot = spotAt(event)
    if (!dropSpot || !sameCell(dropSpot, spot)) setDropSpot(spot)
  }

  const onDrop = (event: React.DragEvent): void => {
    setDropSpot(null)
    const widget = event.dataTransfer.getData(HEADER_WIDGET_DRAG) as HeaderWidget
    if (!acceptsDrop(event) || !HEADER_WIDGETS.includes(widget)) return
    event.preventDefault()
    const spot = spotAt(event)
    const block = headerWidgetBlock(widget)
    addWidget(
      page.id,
      block.type,
      block.config,
      mode === 'wide' ? { x: spot.x, y: spot.y } : undefined,
      block.size
    )
  }

  const displaced = new Set(moving?.plan.moved ?? [])
  // Mode « Automatique » : le bloc tenu sera rangé ailleurs que la case visée
  const finalOfMoving = moving?.plan.layout.find((item) => item.i === moving.id)
  const showFinal =
    page.autoArrange && moving && finalOfMoving && !sameCell(finalOfMoving, moving.target)

  return (
    <div
      ref={root}
      className={styles.grid}
      data-editing={editing}
      data-moving={moving !== null}
      style={editing ? { minHeight: rows * (rowHeight + gap) } : undefined}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSpot(null)
      }}
      onDrop={onDrop}
    >
      {editing && (
        <GridBackground
          className={styles.background}
          width={width}
          cols={cols}
          rowHeight={rowHeight}
          margin={[gap, gap]}
          containerPadding={[0, 0]}
          rows={rows}
          borderRadius={6}
        />
      )}
      {/* Limites d'écran : la hauteur de la zone visible ; clignote si un bloc la coupe */}
      {editing &&
        lines.map((line) => (
          <div
            key={line.row}
            className={styles.screenLine}
            data-cut={line.cut}
            style={{ top: line.row * (rowHeight + gap) - gap / 2 }}
            aria-hidden
          >
            <span>
              {line.cut
                ? t('pages.screenLineCut', { n: line.row / screenRows + 1 })
                : t('pages.screenLine', { n: line.row / screenRows + 1 })}
            </span>
          </div>
        ))}
      <ReactGridLayout
        width={width}
        layout={gridLayout}
        gridConfig={{
          cols,
          rowHeight,
          margin: [gap, gap],
          containerPadding: [0, 0],
          maxRows: Infinity
        }}
        dragConfig={{ enabled: editing, cancel: '.no-drag' }}
        resizeConfig={{ enabled: editing, handles: ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] }}
        compactor={FREE_COMPACTOR}
        onDrag={(_layout, _old, item) => preview(item)}
        onResize={(_layout, _old, item) => preview(item)}
        onDragStop={(_layout, _old, item) => finish(item)}
        onResizeStop={(_layout, _old, item) => finish(item)}
      >
        {page.widgets.map((widget) => (
          <div
            key={widget.id}
            data-block-id={widget.id}
            data-displaced={displaced.has(widget.id)}
            data-active={!editing && activeId === widget.id}
            // Clic dans le bloc : la molette fait défiler son contenu (jusqu'à la sortie)
            onPointerDownCapture={editing ? undefined : () => setActiveBlock(widget.id)}
            onMouseLeave={() => leaveBlock(widget.id)}
          >
            <WidgetFrame
              pageId={page.id}
              widget={widget}
              editing={editing}
              onFillScreen={mode === 'wide' ? () => fillScreen(widget.id) : undefined}
            />
          </div>
        ))}
      </ReactGridLayout>

      {/* Widget de la barre glissé sur la page : le bloc sera posé ici */}
      {dropSpot && (
        <div className={styles.preview} aria-hidden>
          <div className={styles.finalSpot} style={cellBox(dropSpot)} />
        </div>
      )}

      {/* Aperçu : future place des blocs qui s'écarteront (et du bloc tenu, s'il sera rangé) */}
      {moving && (
        <div className={styles.preview} aria-hidden>
          {moving.plan.layout
            .filter((item) => displaced.has(item.i))
            .map((item) => (
              <div key={item.i} className={styles.futureSpot} style={cellBox(item)} />
            ))}
          {showFinal && <div className={styles.finalSpot} style={cellBox(finalOfMoving)} />}
        </div>
      )}
    </div>
  )
}
