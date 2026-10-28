import { useContext, useEffect } from 'react'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BlockSettingsContext } from './blockSettingsContext'

interface BlockSettingsButtonProps {
  /** Classe des autres boutons de la barre du widget. */
  className?: string
  size?: number
}

/**
 * Bouton des réglages du bloc, à poser dans la barre du widget : les réglages restent
 * accessibles hors du mode édition. Rien n'est affiché si le bloc n'a pas de réglages. Tant qu'il
 * est affiché, le cadre du bloc ne montre pas son propre bouton au survol.
 */
export function BlockSettingsButton({
  className,
  size = 15
}: BlockSettingsButtonProps): React.JSX.Element | null {
  const settings = useContext(BlockSettingsContext)
  const { t } = useTranslation()
  useEffect(() => settings?.claim(), [settings])
  if (!settings) return null
  return (
    <button
      type="button"
      className={`${className ?? ''} no-drag`}
      title={t('blocks.settings')}
      aria-label={t('blocks.settings')}
      onClick={settings.open}
    >
      <Settings2 size={size} aria-hidden />
    </button>
  )
}
