import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ScreenButtonsPlace } from '@shared/settings'
import { nextScreen, usePageScreensStore } from '../../stores/pageScreens'
import styles from './PageView.module.css'

interface ScreenButtonsProps {
  /** Zone qui défile de la page. */
  area: HTMLElement | null
  /** À côté de la grille (en haut, en bas, sur un côté), sinon dans la barre de la page. */
  floating?: Exclude<ScreenButtonsPlace, 'toolbar' | 'hidden'>
}

/**
 * Écran précédent / suivant (un écran : les lignes qui remplissent la zone visible). Toujours
 * affichés : un bouton sans écran où aller est grisé. Les limites coupées par un bloc sont
 * sautées ; « suivant » va jusqu'au bas de la page.
 */
export function ScreenButtons({ area, floating }: ScreenButtonsProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const rowStep = usePageScreensStore((state) => state.rowStep)
  const [position, setPosition] = useState({ top: 0, max: 0 })

  useEffect(() => {
    if (!area) return
    const update = (): void =>
      setPosition({ top: area.scrollTop, max: Math.max(0, area.scrollHeight - area.clientHeight) })
    const observer = new ResizeObserver(update)
    observer.observe(area)
    if (area.firstElementChild) observer.observe(area.firstElementChild)
    area.addEventListener('scroll', update, { passive: true })
    // La grille est posée ou change (blocs, taille des lignes) : la hauteur de la page aussi
    const stop = usePageScreensStore.subscribe(update)
    update()
    return () => {
      observer.disconnect()
      stop()
      area.removeEventListener('scroll', update)
    }
  }, [area])

  if (!area) return null
  // Disposition compacte : pas d'écrans, défilement d'une hauteur de zone
  const up = rowStep
    ? nextScreen(position.top, -1, position.max)
    : position.top > 1
      ? Math.max(0, position.top - area.clientHeight)
      : null
  const down = rowStep
    ? nextScreen(position.top, 1, position.max)
    : position.top < position.max - 1
      ? Math.min(position.max, position.top + area.clientHeight)
      : null
  const go = (top: number | null): void => {
    if (top !== null) area.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className={styles.screenButtons} data-floating={floating}>
      <button
        type="button"
        className={styles.screenButton}
        title={t('pages.screenUp')}
        aria-label={t('pages.screenUp')}
        disabled={up === null}
        onClick={() => go(up)}
      >
        <ChevronUp size={16} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.screenButton}
        title={t('pages.screenDown')}
        aria-label={t('pages.screenDown')}
        disabled={down === null}
        onClick={() => go(down)}
      >
        <ChevronDown size={16} aria-hidden />
      </button>
    </div>
  )
}
