import { headerWidgetBlock, isHeaderWidget, type HeaderItem } from '@shared/header-bar'
import { widgetKey } from '@shared/plugins'
import { getHeaderWidget } from '../../plugins/registry'
import { useSettingsStore } from '../../stores/settings'

/**
 * Widget de la barre en cours de glissement. Pendant le survol, le navigateur ne laisse pas
 * lire les données glissées : la grille le lit ici pour montrer la taille du futur bloc.
 */
let dragged: HeaderItem | null = null

export const setDraggedWidget = (widget: HeaderItem | null): void => {
  dragged = widget
}

export const getDraggedWidget = (): HeaderItem | null => dragged

/**
 * Bloc créé quand on glisse un widget de la barre sur une page : celui de Tessera, ou le bloc
 * que l'extension a désigné (`block` de son manifeste). `null` : il ne devient pas un bloc.
 */
export function headerItemBlock(item: string): ReturnType<typeof headerWidgetBlock> | null {
  if (isHeaderWidget(item)) return headerWidgetBlock(item)
  const widget = getHeaderWidget(item, useSettingsStore.getState().settings.plugins.disabled)
  return widget?.manifest.block
    ? { type: widgetKey(widget.pluginId, widget.manifest.block), config: {} }
    : null
}
