import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ScreenButtonsPlace } from '@shared/settings'
import { nextScreen, usePageScreensStore } from '../../stores/pageScreens'
import styles from './PageView.module.css'

interface ScreenButtonsProps {
  /** Zone qui défile de la page. */
  area: HTMLElement | null
  /** Posés sur la zone de la page (haut, bas, côtés), sinon dans sa barre. */
  floating?: Exclude<ScreenButtonsPlace, 'toolbar' | 'hidden'>
}

/**
 * Écran précédent / suivant d'une page qui défile (un écran : 12 lignes de la grille). Les
 * limites coupées par un bloc sont sautées ; « suivant » va jusqu'au bas de la page.
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
    update()
    return () => {
      observer.disconnect()
      area.removeEventListener('scroll', update)
    }
  }, [area])

  // Une page qui tient dans la zone (ou disposition compacte) : pas d'écrans
  if (!area || !rowStep || position.max < 1) return null
  const up = nextScreen(position.top, -1, position.max)
  const down = nextScreen(position.top, 1, position.max)
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
