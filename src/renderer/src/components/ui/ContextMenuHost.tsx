import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useContextMenuStore, type MenuAction } from '../../stores/contextMenu'
import { useCoverDesktopApps } from '../../stores/desktopApps'
import styles from './ContextMenuHost.module.css'

/**
 * Affiche le menu du clic droit ouvert par `openContextMenu`. Se ferme au clic ailleurs,
 * avec Échap, au défilement ou quand la fenêtre perd le focus. Navigable au clavier.
 */
export function ContextMenuHost(): React.JSX.Element | null {
  const menu = useContextMenuStore((state) => state.menu)
  const close = useContextMenuStore((state) => state.close)
  const listRef = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  useCoverDesktopApps(menu !== null)

  // Le menu reste entièrement visible, même ouvert près d'un bord de la fenêtre
  useLayoutEffect(() => {
    const list = listRef.current
    if (!menu || !list) return
    const { width, height } = list.getBoundingClientRect()
    setPosition({
      left: Math.max(4, Math.min(menu.x, window.innerWidth - width - 4)),
      top: Math.max(4, Math.min(menu.y, window.innerHeight - height - 4))
    })
    list.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!listRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const buttons = [
          ...(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        ]
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1
        buttons[(next + buttons.length) % buttons.length]?.focus()
      }
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    window.addEventListener('wheel', close, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('wheel', close)
    }
  }, [menu, close])

  if (!menu) return null

  const select = (item: MenuAction): void => {
    close()
    item.onSelect()
  }

  return (
    <ul
      ref={listRef}
      className={styles.menu}
      role="menu"
      style={position ?? { left: menu.x, top: menu.y, visibility: 'hidden' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {menu.items.map((item, index) =>
        item === 'separator' ? (
          <li key={`separator-${index}`} className={styles.separator} role="separator" />
        ) : (
          <li key={item.label} role="none">
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              data-danger={item.danger}
              disabled={item.disabled}
              onClick={() => select(item)}
            >
              {item.icon ? <item.icon size={15} aria-hidden /> : <span className={styles.noIcon} />}
              {item.label}
            </button>
          </li>
        )
      )}
    </ul>
  )
}
