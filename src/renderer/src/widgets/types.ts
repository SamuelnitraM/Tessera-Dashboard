import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { WidgetInstance } from '@shared/dashboard'
import type { GridSize } from '../lib/grid'

/** Ce que reçoit le composant d'un widget. */
export interface WidgetProps {
  widget: WidgetInstance
  /** La page est en mode édition (le widget peut afficher ses propres réglages). */
  editing: boolean
  /** Modifie la configuration du widget (fusionnée avec l'existante, puis sauvegardée). */
  updateConfig: (config: Record<string, unknown>) => void
}

/**
 * Description d'un type de widget.
 * Les tailles sont en cases de la disposition large (24 colonnes).
 * L'étape 4 transformera ce registre en véritable système de plugins.
 */
export interface WidgetDefinition {
  type: string
  icon: LucideIcon
  defaultSize: GridSize
  minSize: GridSize
  component: ComponentType<WidgetProps>
}
