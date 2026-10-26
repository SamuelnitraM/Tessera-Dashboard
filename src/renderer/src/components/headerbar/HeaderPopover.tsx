import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useCoverDesktopApps } from '../../stores/desktopApps'
import styles from './HeaderBar.module.css'

interface HeaderPopoverProps {
  /** Contenu du bouton de la barre (icône, heure…). */
  button: ReactNode
  /** Nom du widget (info-bulle, lecteurs d'écran). */
  label: string
  /** Bouton mis en avant (minuteur en cours…). */
  highlighted?: boolean
  /** Ouverture contrôlée par le widget (pipette : refermé pendant le choix de la couleur). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Attribut `data-<marker>` de l'élément (repère pour la barre). */
  marker?: string
  /** Molette sur le bouton (volume…). */
  onWheel?: (event: React.WheelEvent<HTMLButtonElement>) => void
  /** Contenu du panneau ; `close` le referme. */
  children: (close: () => void) => ReactNode
}

/**
 * Widget de la barre des pages : un bouton qui déplie un panneau en dessous. Le panneau se
 * ferme au clic ailleurs ou avec Échap ; les fenêtres d'applications installées sont masquées
 * pendant qu'il est ouvert (sinon elles passeraient devant). Le focus entre dans le panneau à
 * l'ouverture et revient au bouton à la fermeture.
 */
export function HeaderPopover({
  button,
  label,
  highlighted = false,
  open: controlledOpen,
  onOpenChange,
  marker,
  onWheel,
  children
}: HeaderPopoverProps): React.JSX.Element {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = controlledOpen ?? ownOpen
  const setOpen = (value: boolean): void => {
    setOwnOpen(value)
    onOpenChange?.(value)
  }
  const setOpenRef = useRef(setOpen)
  useEffect(() => {
    setOpenRef.current = setOpen
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useCoverDesktopApps(open, `widget « ${label} »`)

  // Focus dans le panneau (s'il n'y est pas déjà : champ de la calculatrice…), puis rendu au
  // bouton, sauf si l'utilisateur l'a mis ailleurs (clic sur un autre champ)
  useEffect(() => {
    const panel = panelRef.current
    const button = buttonRef.current
    if (!open || !panel) return
    if (!panel.contains(document.activeElement)) panel.focus()
    return () => {
      const active = document.activeElement
      if (!active || active === document.body || panel.contains(active)) {
        button?.focus()
      }
    }
  }, [open])

  // Panneau aligné à droite du bouton, décalé s'il sort de la zone de la page (fenêtre étroite)
  useLayoutEffect(() => {
    const panel = panelRef.current
    const area = rootRef.current?.closest('header')
    if (!open || !panel || !area) return
    const place = (): void => {
      panel.style.translate = ''
      const rect = panel.getBoundingClientRect()
      const bounds = area.getBoundingClientRect()
      const shift =
        rect.left < bounds.left
          ? bounds.left - rect.left
          : rect.right > window.innerWidth - 8
            ? window.innerWidth - 8 - rect.right
            : 0
      if (shift) panel.style.translate = `${Math.round(shift)}px 0`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenRef.current(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenRef.current(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={styles.popoverRoot}
      {...(marker ? { [`data-${marker}`]: true } : {})}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.chip}
        data-open={open}
        data-highlighted={highlighted}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onWheel={onWheel}
      >
        {button}
      </button>
      {open && (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label={label} tabIndex={-1}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
