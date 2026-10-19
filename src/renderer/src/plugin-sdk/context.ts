import { createContext } from 'react'
import type { PluginPermission } from '@shared/plugins'

/** Extension dont le widget est en cours d'affichage : identifiant et permissions déclarées. */
export interface PluginContextValue {
  id: string
  permissions: readonly PluginPermission[]
}

/**
 * Fourni par l'app autour de chaque widget ; lu par les hooks et composants du SDK.
 */
export const PluginContext = createContext<PluginContextValue | null>(null)
