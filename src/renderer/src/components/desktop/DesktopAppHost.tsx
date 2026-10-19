import { useEffect, useLayoutEffect, useRef } from 'react'
import { AppWindow, LoaderCircle, MonitorUp, RotateCw, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DesktopApp, HostRect } from '@shared/desktop-apps'
import { useDesktopAppState, useDesktopAppsStore } from '../../stores/desktopApps'
import { Button } from '../ui/Button'
import styles from './DesktopAppHost.module.css'

interface DesktopAppHostProps {
  app: DesktopApp
  /** Identifiant unique du bloc ou de l'onglet. */
  hostId: string
  /** Bloc ou onglet affiché à l'écran. */
  active: boolean
}

/** Partie visible d'un élément, en tenant compte des conteneurs qui défilent. */
function measure(element: HTMLElement): HostRect | null {
  const box = element.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return null
  let left = Math.max(box.left, 0)
  let top = Math.max(box.top, 0)
  let right = Math.min(box.right, window.innerWidth)
  let bottom = Math.min(box.bottom, window.innerHeight)
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent)
    if (overflowX === 'visible' && overflowY === 'visible') continue
    const clip = parent.getBoundingClientRect()
    left = Math.max(left, clip.left)
    top = Math.max(top, clip.top)
    right = Math.min(right, clip.right)
    bottom = Math.min(bottom, clip.bottom)
  }
  const rect: HostRect = { x: box.left, y: box.top, width: box.width, height: box.height }
  const visible = {
    x: left - box.left,
    y: top - box.top,
    width: right - left,
    height: bottom - top
  }
  const whole =
    visible.x <= 0.5 &&
    visible.y <= 0.5 &&
    visible.width >= box.width - 0.5 &&
    visible.height >= box.height - 0.5
  if (!whole) {
    rect.clip = {
      ...visible,
      width: Math.max(0, visible.width),
      height: Math.max(0, visible.height)
    }
  }
  return rect
}

/**
 * Emplacement de la fenêtre d'une application installée. La fenêtre elle-même est posée
 * par-dessus par le processus principal ; cet élément indique où, et affiche ce qui se voit
 * quand elle n'est pas là (ouverture, application fermée, image pendant un dialogue…).
 */
export function DesktopAppHost({ app, hostId, active }: DesktopAppHostProps): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const state = useDesktopAppState(app.id)
  const snapshot = useDesktopAppsStore((store) => store.snapshots[app.id])
  const suspended = useDesktopAppsStore((store) => store.suspended)
  const attachedHere = state.hostId === hostId

  // Bloc affiché : la fenêtre vient s'y placer. Masqué ou retiré : elle s'en va.
  useEffect(() => {
    const element = ref.current
    if (!active || !element) return
    void window.tessera.desktopApps.attach(hostId, app.id, measure(element))
    return () => void window.tessera.desktopApps.detach(hostId)
  }, [active, hostId, app.id])

  // Suit la position du bloc : taille, déplacement dans la grille, défilement, fenêtre
  useLayoutEffect(() => {
    const element = ref.current
    if (!active || !element) return
    let last = ''
    let frame = 0
    const report = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = measure(element)
        const key = JSON.stringify(rect)
        if (key === last) return
        last = key
        void window.tessera.desktopApps.move(hostId, rect)
      })
    }
    const resizeObserver = new ResizeObserver(report)
    resizeObserver.observe(element)
    resizeObserver.observe(document.documentElement)
    // La grille déplace les blocs en changeant leur style (transform)
    const mutationObserver = new MutationObserver(report)
    const gridItem = element.closest('.react-grid-item')
    if (gridItem)
      mutationObserver.observe(gridItem, { attributes: true, attributeFilter: ['style'] })
    window.addEventListener('resize', report)
    window.addEventListener('scroll', report, true)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', report)
      window.removeEventListener('scroll', report, true)
    }
  }, [active, hostId, suspended])

  const launch = (): void => void window.tessera.desktopApps.launch(app.id)
  const showHere = (): void => {
    if (ref.current) void window.tessera.desktopApps.attach(hostId, app.id, measure(ref.current))
  }

  let content: React.ReactNode = null
  if (suspended && snapshot && attachedHere) {
    content = <img className={styles.snapshot} src={snapshot} alt="" draggable={false} />
  } else if (state.hostId !== null && !attachedHere) {
    content = (
      <Message icon={<MonitorUp size={22} aria-hidden />} text={t('desktopApps.elsewhere')}>
        <Button onClick={showHere}>{t('desktopApps.showHere')}</Button>
      </Message>
    )
  } else if (state.status === 'starting' || state.status === 'idle') {
    content = (
      <Message
        icon={<LoaderCircle className={styles.spin} size={22} aria-hidden />}
        text={t('desktopApps.starting', { name: app.name })}
      />
    )
  } else if (state.status === 'closed') {
    content = (
      <Message icon={<AppIcon app={app} />} text={t('desktopApps.closed', { name: app.name })}>
        <Button variant="primary" icon={RotateCw} onClick={launch}>
          {t('desktopApps.reopen')}
        </Button>
      </Message>
    )
  } else if (state.status === 'error') {
    content = (
      <Message
        icon={<TriangleAlert size={22} aria-hidden />}
        text={
          state.error === 'timeout'
            ? t('desktopApps.timeout', { name: app.name })
            : t('desktopApps.error', { name: app.name, error: state.error ?? '' })
        }
      >
        <Button icon={RotateCw} onClick={launch}>
          {t('desktopApps.retry')}
        </Button>
      </Message>
    )
  }

  return (
    <div ref={ref} className={styles.host} data-status={state.status}>
      {content}
    </div>
  )
}

function AppIcon({ app }: { app: DesktopApp }): React.JSX.Element {
  return app.icon ? (
    <img src={app.icon} alt="" width={32} height={32} />
  ) : (
    <AppWindow size={28} strokeWidth={1.5} aria-hidden />
  )
}

function Message({
  icon,
  text,
  children
}: {
  icon: React.ReactNode
  text: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={styles.message}>
      {icon}
      <p>{text}</p>
      {children}
    </div>
  )
}
