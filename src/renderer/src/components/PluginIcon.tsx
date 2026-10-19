import { Puzzle } from 'lucide-react'
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic'

interface PluginIconProps {
  /** Nom d'icône Lucide déclaré dans un manifeste. */
  name: string | undefined
  size?: number
}

/**
 * Icône déclarée par une extension. Chaque icône Lucide est chargée à la demande ;
 * un nom inconnu affiche une pièce de puzzle.
 */
export function PluginIcon({ name, size = 20 }: PluginIconProps): React.JSX.Element {
  if (!name || !iconNames.includes(name as IconName)) {
    return <Puzzle size={size} aria-hidden />
  }
  return <DynamicIcon name={name as IconName} size={size} aria-hidden />
}
