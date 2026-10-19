import { useEffect, useMemo } from 'react'
import ReactGridLayout, { getCompactor, verticalCompactor, type Layout } from 'react-grid-layout'
import { GridBackground } from 'react-grid-layout/extras'
import 'react-grid-layout/css/styles.css'
import { GRID, type DashboardPage, type LayoutMode, type WidgetInstance } from '@shared/dashboard'
import { DESKTOP_APP_WIDGET } from '@shared/desktop-apps'
import {
  colsFor,
  enforceMinSizes,
  layoutBottom,
  normalizeLayout,
  resolveLayout,
  sameLayout,
  toCompactMinSize,
  type GridSize
} from '../../lib/grid'
import { useDashboardStore } from '../../stores/dashboard'
import { useSettingsStore } from '../../stores/settings'
import { getDefaultSize, getMinSize } from '../../plugins/registry'
import { WidgetFrame } from './WidgetFrame'
import styles from './DashboardGrid.module.css'

// Placement libre : les widgets restent où on les pose, sans se chevaucher.
// - page ajustée : poser un widget sur un autre est refusé (la page ne peut pas s'allonger)
// - page qui défile : les widgets gênants sont poussés vers le bas
const FIT_COMPACTOR = getCompactor(null, false, true)
const SCROLL_COMPACTOR = getCompactor(null, false, false)

/** Hauteur minimale d'une ligne (px), même dans une très petite fenêtre. */
const MIN_ROW_HEIGHT = 24

/** Autour de la fenêtre d'une application installée : bordure du bloc, et sa barre si affichée. */
const FRAME_BORDER = 2
const DESKTOP_HEADER = 31

interface DashboardGridProps {
  page: DashboardPage
  editing: boolean
  mode: LayoutMode
  /** Taille de la zone disponible (px). */
  width: number
  height: number
}

/**
 * Grille de widgets d'une page.
 * - Disposition large (24 colonnes) : « ajustée » (lignes étirées sur la hauteur de la fenêtre)
 *   ou « qui défile » (cases carrées).
 * - Disposition compacte (fenêtre étroite, 12 colonnes, défilement), modifiable séparément.
 */
export function DashboardGrid({
  page,
  editing,
  mode,
  width,
  height
}: DashboardGridProps): React.JSX.Element {
  const setLayout = useDashboardStore((state) => state.setLayout)
  const userApps = useSettingsStore((state) => state.settings.apps.items)

  const fit = mode === 'wide' && page.fitMode === 'fit'
  const cols = colsFor(mode)
  const gap = GRID.gap

  const layout = useMemo(
    () => resolveLayout(page, mode, (widget) => getDefaultSize(widget.type)),
    [page, mode]
  )

  const colWidth = (width - gap * (cols - 1)) / cols
  // Arrondi vers le bas : la grille ajustée ne dépasse jamais la hauteur disponible
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    Math.floor(fit ? (height - gap * (GRID.fitRows - 1)) / GRID.fitRows : colWidth)
  )

  // Taille minimale de chaque bloc : celle de son type de widget, et pour une application
  // installée, celle que l'application impose à sa fenêtre (convertie en cases)
  const minSizes = useMemo(() => {
    const appMinSize = (widget: WidgetInstance): GridSize | null => {
      if (widget.type !== DESKTOP_APP_WIDGET) return null
      const app = userApps.find((candidate) => candidate.id === widget.config.appId)
      if (app?.kind !== 'desktop' || !app.minWidth || !app.minHeight) return null
      const chrome = FRAME_BORDER + (widget.config.showHeader === false ? 0 : DESKTOP_HEADER)
      return {
        w: Math.ceil((app.minWidth + FRAME_BORDER + gap) / (colWidth + gap)),
        h: Math.ceil((app.minHeight + chrome + gap) / (rowHeight + gap))
      }
    }
    const sizes = new Map<string, GridSize>()
    for (const widget of page.widgets) {
      const typeMin =
        mode === 'wide' ? getMinSize(widget.type) : toCompactMinSize(getMinSize(widget.type))
      const appMin = appMinSize(widget)
      sizes.set(widget.id, {
        w: Math.min(cols, Math.max(typeMin.w, appMin?.w ?? 0)),
        h: Math.max(typeMin.h, appMin?.h ?? 0)
      })
    }
    return sizes
  }, [page.widgets, userApps, mode, cols, colWidth, rowHeight, gap])

  const gridLayout = useMemo<Layout>(
    () =>
      layout.map((item) => {
        const min = minSizes.get(item.i) ?? { w: 1, h: 1 }
        return { ...item, minW: min.w, minH: min.h }
      }),
    [layout, minSizes]
  )

  // Un bloc plus petit que sa taille minimale (application qui vient d'être mesurée) grandit
  useEffect(() => {
    const grown = enforceMinSizes(layout, minSizes, cols)
    if (grown) setLayout(page.id, mode, normalizeLayout(grown))
  }, [layout, minSizes, cols, page.id, mode, setLayout])
  // Une page ajustée affiche toujours ses 12 lignes (plus si des widgets dépassent)
  const rows = fit ? Math.max(GRID.fitRows, layoutBottom(layout)) : layoutBottom(layout)

  /** Sauvegarde la disposition après un déplacement ou un redimensionnement. */
  const handleChange = (next: Layout): void => {
    const normalized = normalizeLayout(next)
    if (!sameLayout(normalized, layout)) setLayout(page.id, mode, normalized)
  }

  return (
    <div className={styles.grid} data-editing={editing}>
      {editing && (
        <GridBackground
          className={styles.background}
          width={width}
          cols={cols}
          rowHeight={rowHeight}
          margin={[gap, gap]}
          containerPadding={[0, 0]}
          rows={fit ? rows : rows + 4}
          borderRadius={6}
        />
      )}
      <ReactGridLayout
        width={width}
        layout={gridLayout}
        gridConfig={{
          cols,
          rowHeight,
          margin: [gap, gap],
          containerPadding: [0, 0],
          maxRows: fit ? rows : Infinity
        }}
        dragConfig={{ enabled: editing, cancel: '.no-drag' }}
        resizeConfig={{ enabled: editing, handles: ['se', 'e', 's'] }}
        compactor={mode === 'compact' ? verticalCompactor : fit ? FIT_COMPACTOR : SCROLL_COMPACTOR}
        onDragStop={handleChange}
        onResizeStop={handleChange}
      >
        {page.widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetFrame pageId={page.id} widget={widget} editing={editing} />
          </div>
        ))}
      </ReactGridLayout>
    </div>
  )
}
