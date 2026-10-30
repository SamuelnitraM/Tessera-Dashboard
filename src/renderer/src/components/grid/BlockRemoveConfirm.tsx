import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePresence } from '../../hooks/usePresence'
import { useDesktopAppsHole } from '../../stores/desktopApps'
import { Button } from '../ui/Button'
import styles from './BlockRemoveConfirm.module.css'

interface BlockRemoveConfirmProps {
  /** Le bloc (son cadre) : la confirmation se pose exactement dessus. */
  block: React.RefObject<HTMLElement | null>
  name: string
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * « Retirer ce bloc ? », posé sur le bloc lui-même (croix du mode édition ou « Retirer » du clic
 * droit). Au niveau de la fenêtre, au-dessus des lecteurs vidéo, et découpé dans les applications
 * installées. Échap ou un clic ailleurs annule.
 */
export function BlockRemoveConfirm({
  block,
  name,
  open,
  onConfirm,
  onCancel
}: BlockRemoveConfirmProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const { mounted, closing } = usePresence(open)
  const ref = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  useDesktopAppsHole(ref, open, `confirmation du retrait de « ${name} »`)

  // Suit le bloc (défilement de la page, fenêtre redimensionnée…) tant qu'elle est affichée
  useLayoutEffect(() => {
    if (!mounted) return
    let frame = 0
    let last = ''
    const follow = (): void => {
      const rect = block.current?.getBoundingClientRect()
      if (rect) {
        const key = `${rect.left},${rect.top},${rect.width},${rect.height}`
        if (key !== last) {
          last = key
          setBox(rect)
        }
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [mounted, block])

  // Focus sur « Retirer » dès qu'elle est posée (Entrée confirme)
  const placed = box !== null
  useEffect(() => {
    if (open && placed) confirmRef.current?.focus()
  }, [open, placed])

  // Échap (avant la page, qui quitterait le mode édition) et clic ailleurs annulent
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      event.preventDefault()
      onCancel()
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (!ref.current?.contains(event.target as Node)) onCancel()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open, onCancel])

  if (!mounted || !box) return null
  return createPortal(
    <div
      ref={ref}
      className={styles.confirm}
      role="alertdialog"
      aria-label={t('blocks.removeConfirm.title', { name })}
      data-closing={closing || undefined}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      <Trash2 className={styles.icon} size={20} aria-hidden />
      <p className={styles.question}>{t('blocks.removeConfirm.title', { name })}</p>
      <div className={styles.actions}>
        <Button onClick={onCancel}>{t('blocks.removeConfirm.cancel')}</Button>
        <Button ref={confirmRef} variant="danger" icon={Trash2} onClick={onConfirm}>
          {t('blocks.removeConfirm.confirm')}
        </Button>
      </div>
    </div>,
    document.body
  )
}
