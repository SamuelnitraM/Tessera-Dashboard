import { createContext } from 'react'

/**
 * Identifiant de l'extension dont le widget est en cours d'affichage.
 * Fourni par l'app autour de chaque widget ; lu par les hooks du SDK.
 */
export const PluginContext = createContext<string | null>(null)
