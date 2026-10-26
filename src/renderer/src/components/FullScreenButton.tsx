import { useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FullScreenButtonProps {
  /** `item` : ligne du menu latéral (avec libellé). `icon` : bouton du menu rabattu. */
  variant: 'item' | 'icon'
  className: string
}

/** Plein écran (comme F11) : la fenêtre de Tessera occupe tout l'écran, sans barre de titre. */
export function FullScreenButton({ variant, className }: FullScreenButtonProps): React.JSX.Element {
  const { t } = useTranslation()
  const [fullScreen, setFullScreen] = useState(false)
  useEffect(() => {
    let cancelled = false
    void window.tessera.window.isFullScreen().then((value) => !cancelled && setFullScreen(value))
    const unsubscribe = window.tessera.window.onFullScreenChange(setFullScreen)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
  const label = fullScreen ? t('nav.exitFullScreen') : t('nav.fullScreen')
  const Icon = fullScreen ? Minimize : Maximize

  return (
    <button
      type="button"
      className={className}
      title={`${label} (F11)`}
      aria-label={variant === 'icon' ? label : undefined}
      aria-pressed={fullScreen}
      onClick={() => void window.tessera.window.toggleFullScreen()}
    >
      <Icon size={variant === 'item' ? 18 : 16} aria-hidden />
      {variant === 'item' && <span>{label}</span>}
    </button>
  )
}
