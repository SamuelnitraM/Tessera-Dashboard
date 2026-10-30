import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePresence } from '../../hooks/usePresence'
import { useDesktopAppsHole } from '../../stores/desktopApps'
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
 * ferme au clic ailleurs ou avec Échap. Il est posé au niveau de la fenêtre, au-dessus de tous
 * les blocs (lecteurs vidéo compris), et découpé dans les fenêtres des applications installées
 * (elles restent affichées autour). Le focus entre dans le panneau à l'ouverture et revient au
 * bouton à la fermeture.
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
  // Panneau gardé le temps de sa disparition
  const { mounted, closing } = usePresence(open)
  useDesktopAppsHole(panelRef, open, `widget « ${label} »`)

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

  // Panneau sous le bouton, aligné à sa droite, décalé s'il sort de la zone de la page (fenêtre
  // étroite) ; suit le bouton quand la page défile ou que la fenêtre change de taille
  useLayoutEffect(() => {
    const panel = panelRef.current
    const root = rootRef.current
    const area = root?.closest('header')
    if (!mounted || !panel || !root || !area) return
    // Widget replié dans le menu de la barre : son panneau s'ouvre à gauche du menu
    const folded = root.closest(`.${styles.overflow}`)
    const place = (): void => {
      const button = root.getBoundingClientRect()
      if (folded) {
        const menu = folded.getBoundingClientRect()
        panel.style.top = `${Math.round(button.top - 6)}px`
        panel.style.right = `${Math.round(window.innerWidth - menu.left + 8)}px`
      } else {
        panel.style.top = `${Math.round(button.bottom + 6)}px`
        panel.style.right = `${Math.round(window.innerWidth - button.right)}px`
      }
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
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [mounted])

  useEffect(() => {
    if (!open) return
    // Le panneau est posé ailleurs dans la page (au niveau de la fenêtre) : il compte aussi
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpenRef.current(false)
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
      {mounted &&
        createPortal(
          <div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            data-closing={closing || undefined}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </div>
  )
}
