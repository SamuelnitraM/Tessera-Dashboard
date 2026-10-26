import { CircleArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUpdatesStore } from '../stores/updates'
import styles from './UpdateButton.module.css'

interface UpdateButtonProps {
  /** `item` : ligne du menu latéral (avec libellé). `icon` : bouton du menu rabattu. */
  variant: 'item' | 'icon'
  className: string
}

/**
 * Mise à jour téléchargée : une icône clignote, à la couleur d'accent. Un clic redémarre
 * Tessera et installe la nouvelle version. Rien ne s'affiche sinon.
 */
export function UpdateButton({ variant, className }: UpdateButtonProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const state = useUpdatesStore((store) => store.state)
  if (state.status !== 'ready') return null
  const label = t('updates.button', { version: state.version })

  return (
    <button
      type="button"
      className={`${className} ${styles.update}`}
      title={t('updates.buttonHint', { version: state.version })}
      aria-label={variant === 'icon' ? label : undefined}
      onClick={() => void window.tessera.updates.install()}
    >
      <CircleArrowUp
        className={styles.icon}
        size={variant === 'item' ? 18 : 17}
        strokeWidth={2}
        aria-hidden
      />
      {variant === 'item' && <span>{label}</span>}
    </button>
  )
}
