import { createContext } from 'react'

/** Réglages du bloc (ceux du manifeste), fournis par son cadre (WidgetFrame). */
export interface BlockSettingsContextValue {
  open: () => void
  /**
   * Le widget affiche le bouton des réglages dans sa propre barre : le cadre n'affiche plus le
   * sien au survol. Renvoie de quoi le rendre.
   */
  claim: () => () => void
}

export const BlockSettingsContext = createContext<BlockSettingsContextValue | null>(null)
