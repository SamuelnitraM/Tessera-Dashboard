import { Clock, Heading } from 'lucide-react'
import { ClockWidget } from './clock/ClockWidget'
import { HeadingWidget } from './heading/HeadingWidget'
import type { WidgetDefinition } from './types'

/**
 * Widgets disponibles. Leur nom et leur description sont dans les traductions :
 * `widgets.<type>.name` et `widgets.<type>.description`.
 */
export const WIDGETS = [
  {
    type: 'clock',
    icon: Clock,
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    component: ClockWidget
  },
  {
    type: 'heading',
    icon: Heading,
    defaultSize: { w: 12, h: 1 },
    minSize: { w: 3, h: 1 },
    component: HeadingWidget
  }
] as const satisfies readonly WidgetDefinition[]

export type WidgetType = (typeof WIDGETS)[number]['type']

/** Taille utilisée pour un widget inconnu (ex. plugin désinstallé). */
const FALLBACK_SIZE = { w: 6, h: 3 }

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGETS.find((definition) => definition.type === type)
}

export function getDefaultSize(type: string): { w: number; h: number } {
  return getWidgetDefinition(type)?.defaultSize ?? FALLBACK_SIZE
}

export function getMinSize(type: string): { w: number; h: number } {
  return getWidgetDefinition(type)?.minSize ?? { w: 2, h: 1 }
}
